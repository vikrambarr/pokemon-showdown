/**
 * Custom formats: the command layer. A format here is composition over the rules in
 * data/rulesets.ts - a base format plus rule names - so nothing a user writes can
 * execute; ../custom/formats/validator.ts is what enforces that.
 */
import { Utils } from '../../lib';
import * as database from '../custom/formats/database';
import * as store from '../custom/entries';
import {
	baseSnapshot, checkFormat, MAX_NOTES_LENGTH, normalizeFormatData, resolveRuleset, RULE_LISTS,
	rulesetCatalogue, toExportJSON, toFormatData,
} from '../custom/formats/validator';
import { TeamValidator } from '../../sim/team-validator';
import { buildCustomDex, releaseCustomDex } from '../../sim/dex-custom';
import { resolveCollection } from '../custom/dex';

import { type CustomFormatRow, MAX_CUSTOM_FORMATS } from '../custom/formats/database';

import type { ModdedDex } from '../../sim/dex';
import type { PokemonSet } from '../../sim/teams';

const NOUN = 'custom format';

function validateAccess(user: User) {
	store.validateAccess(user, !!database.entries, Config.customformats, NOUN);
}

async function ownedNames(ownerid: ID, excludeEntryid?: number) {
	return store.nameMap(await database.ownedNames(ownerid), row => row.formatid, excludeEntryid);
}

const getOwn = (user: User, name: string) => store.getOwn(user, name, NOUN, database.get);
const getVisible = (user: User, ownerid: ID, name: string) =>
	store.getVisible(user, ownerid, name, NOUN, database.get);

/**
 * Runs `fn` against a dex that also holds the owner's custom species. Rules may name them, and
 * `Dex.formats.validateRule` only resolves what its own dex knows about.
 */
async function withOwnerDex<T>(ownerid: ID, input: AnyObject, fn: (dex: ModdedDex) => T | Promise<T>) {
	const mod = toID(input.mod) || (input.base ? Dex.formats.get(input.base).mod : undefined);
	const dex = buildCustomDex(await resolveCollection(ownerid), mod);
	try {
		return await fn(dex);
	} finally {
		releaseCustomDex(dex);
	}
}

/** Re-validates the whole entry rather than just the change, as the species plugin does. */
async function revalidate(row: CustomFormatRow, changes: AnyObject) {
	const editable: AnyObject = {
		name: row.name, mod: row.mod || null,
		ruleset: row.ruleset, banlist: row.banlist, unbanlist: row.unbanlist,
	};
	if (row.base) editable.base = Dex.formats.get(row.base).name;
	const otherNames = await ownedNames(row.ownerid, row.entryid);
	// Picking a different base format starts the rules over from that format, unless the same edit
	// says what they should be: it's a starting point, and there's nothing left of the old one to keep.
	const restart = changes.base !== undefined && toID(changes.base) !== toID(row.base) ?
		baseSnapshot(changes.base) : null;
	const merged = { ...editable, ...restart, ...changes };
	return withOwnerDex(row.ownerid, merged, dex => normalizeFormatData(merged, {
		otherNames, ownerid: row.ownerid, dex,
	}));
}

/** What a format is built on: its base format, or the bare mod when it has no base. */
const basedOn = (row: CustomFormatRow) => (
	row.base ? Dex.formats.get(row.base).name : `the ${row.mod} mod`
);

function summary(row: CustomFormatRow) {
	const rules = row.ruleset.length + row.banlist.length + row.unbanlist.length;
	let buf = `<strong>${Utils.escapeHTML(row.name)}</strong>`;
	buf += ` &middot; based on ${Utils.escapeHTML(basedOn(row))}`;
	buf += ` &middot; ${Chat.count(rules, "rules")}`;
	if (row.private) buf += ` <small>[private]</small>`;
	return buf;
}

function details(row: CustomFormatRow) {
	let buf = `<h3>${Utils.escapeHTML(row.name)}</h3>`;
	buf += `<p>Based on <strong>${Utils.escapeHTML(basedOn(row))}</strong></p>`;
	for (const field of RULE_LISTS) {
		if (!row[field].length) continue;
		buf += `<p><strong>${field}:</strong> ${Utils.escapeHTML(row[field].join(', '))}</p>`;
	}
	if (row.notes) buf += `<p>${Utils.escapeHTML(row.notes)}</p>`;
	return buf;
}

/** The write half, shared by the chat command and the teambuilder's CRQ. */
export async function createFormat(user: User, input: AnyObject) {
	validateAccess(user);
	// A new format starts as a copy of its base format's rules, which are then the owner's to edit.
	const snapshot = baseSnapshot(input.base);
	if (snapshot) input = { ...snapshot, ...input };
	const otherNames = await ownedNames(user.id);
	const normalized = await withOwnerDex(user.id, input, dex => normalizeFormatData(input, {
		otherNames, ownerid: user.id, dex,
	}));
	if (await database.count(user.id) >= MAX_CUSTOM_FORMATS) {
		throw new Chat.ErrorMessage(
			`You already have ${MAX_CUSTOM_FORMATS} custom formats, which is the limit. Delete one first.`
		);
	}
	return database.create({ ownerid: user.id, ...normalized, notes: null });
}

/** The four lists the builder edits with a picker, in the order it shows them. */
export const ROSTER_KINDS = ['pokemon', 'move', 'ability', 'item'] as const;
export type Roster = { [kind in typeof ROSTER_KINDS[number]]: string[] };

/** Whether a resolved rule is one of the four lists' own: an entry, or the `-All X` above it. */
function pickerSpec(spec: string) {
	return /^(?:base)?(?:pokemon|move|ability|item):/.test(spec) ||
		['tag:allpokemon', 'tag:allmoves', 'tag:allabilities', 'tag:allitems'].includes(spec);
}

/** What a stored ban resolves to, so a list can be split by what each entry names. */
function pickerRule(rule: string, dex: ModdedDex) {
	try {
		return pickerSpec((dex.formats.validateRule(`-${rule}`) as string).slice(1));
	} catch {
		return false;
	}
}

/**
 * Formes that only ever exist mid-battle, which no teambuilder offers: the client's tier tables
 * leave exactly these out (`build-tools/build-indexes`, the `species.forme` skip), so a roster that
 * kept them would name species the picker can't show. Battle-only alone is the wrong test —
 * Zacian-Crowned, Palafin-Hero and every mega are battle-only and perfectly buildable — and no flag
 * in the dex separates the two groups, so this mirrors the client's own list.
 */
const UNBUILDABLE_BASES = [
	'Aegislash', 'Castform', 'Cherrim', 'Cramorant', 'Eiscue', 'Meloetta', 'Mimikyu', 'Minior',
	'Morpeko', 'Ramnarok', 'Wishiwashi',
];
function unbuildableForme(species: Species) {
	if (!species.forme) return false;
	return UNBUILDABLE_BASES.includes(species.baseSpecies) || species.forme.includes('Totem') ||
		species.forme.includes('Zen') || (species.baseSpecies === 'Ogerpon' && species.forme.includes('Tera'));
}

/**
 * Which species a format allows, asked of the team validator rather than worked out by hand:
 * `checkSpecies` is the same call `validateSet` makes, so it accounts for bans, tags, tiers and
 * whether the species exists in the mod at all.
 */
function legalRoster(row: Parameters<typeof toFormatData>[0], dex: ModdedDex): Roster {
	// `buildCustomDex` registers its dex in `Dex.dexes`, so naming it as the format's mod is how
	// the base Dex reaches it. Handing the modded dex over directly fails: only the base Dex can
	// resolve mods for a format.
	const format = new Dex.Format({ ...toFormatData(row), mod: dex.currentMod });
	const validator = new TeamValidator(format);
	const roster: Roster = { pokemon: [], move: [], ability: [], item: [] };
	// The checks read a set but never write one, and a species is named because `checkAbility` looks
	// one up in the formats that hand out extra abilities.
	const set = {
		name: 'Set', species: 'Pikachu', moves: [], ability: '', item: '',
		evs: {}, ivs: {}, level: 100, nature: '',
	} as unknown as PokemonSet;
	for (const species of validator.dex.species.all()) {
		// `checkSpecies` calls a mid-battle forme legal, because `validateSet` is what swaps it back
		// for its base species.
		if (!species.exists || species.isCosmeticForme || unbuildableForme(species)) continue;
		set.name = set.species = species.name;
		if (!validator.checkSpecies(set, species, species, {})) roster.pokemon.push(species.id);
	}
	set.name = 'Set';
	set.species = 'Pikachu';
	for (const move of validator.dex.moves.all()) {
		if (move.exists && !validator.checkMove(set, move, {})) roster.move.push(move.id);
	}
	for (const ability of validator.dex.abilities.all()) {
		if (ability.exists && !validator.checkAbility(set, ability, {})) roster.ability.push(ability.id);
	}
	for (const item of validator.dex.items.all()) {
		if (item.exists && item.id && !validator.checkItem(set, item, {})) roster.item.push(item.id);
	}
	return roster;
}

/**
 * Which rules the format switches off, and what switched each one off. A `!` rule never reaches the
 * rule table — it just stops something from being added — so the only way to see one is to walk the
 * rulesets the format is composed of.
 */
function repealedRules(row: Parameters<typeof toFormatData>[0]) {
	const repealed: { [ruleid: string]: string } = {};
	const walk = (format: Format, depth: number) => {
		if (depth > 8) return;
		for (const rule of format.ruleset || []) {
			const name = rule.split('=')[0].trim();
			if (name.startsWith('!') && !name.startsWith('!!')) {
				repealed[toID(name.slice(1))] ||= format.name;
			} else if (!/^[-+*^!]/.test(name)) {
				const sub = Dex.formats.get(name);
				if (sub.exists && sub.ruleset?.length) walk(sub, depth + 1);
			}
		}
	};
	walk(new Dex.Format(toFormatData(row)), 1);
	return repealed;
}

/**
 * Active rules the format can't switch off, and why. `[Gen 9] OU` adds `Standard` and then repeals
 * `Sleep Clause Mod` from inside it, so repealing `Standard` leaves that repeal with nothing to do
 * and the sim refuses the whole format. Asking it rule by rule costs about 8ms for a format's
 * twenty, which beats guessing which compositions are safe to offer.
 */
function lockedRules(
	row: Parameters<typeof toFormatData>[0], dex: ModdedDex, active: string[],
	repealed: { [ruleid: string]: string }
) {
	const locked: { [ruleid: string]: string } = {};
	const named = (rule: string, id: string) => toID(rule.replace(/^\^/, '').replace(/^!/, '')) === id;
	for (const id of active) {
		const rule = rulesetCatalogue().find(entry => entry.id === id);
		if (!rule) continue;
		// Ask about the edit the builder would actually make: deleting the line that adds the rule
		// if the format has one, and repealing it otherwise. And ask whether it would *save*, which
		// is `resolveRuleset`, not `checkFormat`: dropping `Standard` leaves the repeals of the
		// rules it used to bring with nothing to do, and those get cleaned up on the way in.
		const ruleset = row.ruleset.some(existing => named(existing, id) && !existing.includes('!')) ?
			row.ruleset.filter(existing => !named(existing, id)) :
			[...row.ruleset, `!${rule.name}`];
		try {
			resolveRuleset({ ...row, ruleset } as Parameters<typeof resolveRuleset>[0], dex);
		} catch (e: any) {
			// The sim names the rule left with nothing to repeal; say whose repeal that is.
			const blocker = toID(/"!(.+?)"/.exec(e.message)?.[1] || '');
			const blockerName = blocker && Dex.formats.get(blocker).name;
			locked[id] = blockerName && repealed[blocker] ?
				`${repealed[blocker]} switches off ${blockerName}, which ${rule.name} provides. ` +
				`Switch off the rules under ${rule.name} instead.` :
				`${rule.name} can't be switched off here.`;
		}
	}
	return locked;
}

/**
 * Which tags the format bans, and anything else in its lists that no picker or tag chip covers:
 * `-unreleased`, a nature ban, a `-BST > 600`. Those are reported so nothing a format does is
 * invisible, even where there's no UI to change it. Everything the four pickers own is left out —
 * there can be hundreds of those.
 */
function banRules(row: Parameters<typeof toFormatData>[0], dex: ModdedDex) {
	const bans: { tags: { [tagid: string]: 'banned' | 'restricted' | 'unbanned' }, other: string[] } = {
		tags: {}, other: [],
	};
	// Tag names aren't in the dex data, and neither are pseudo-tags like `-unreleased`, so anything
	// that can't be looked up is title-cased from its own id.
	const titleCase = (id: string) => id.replace(/(?:^|[\s-])[a-z]/g, match => match.toUpperCase());
	const label = (rule: string) => {
		const [kind, id] = rule.includes(':') ? Utils.splitFirst(rule, ':') : ['', rule];
		const named = kind === 'nature' ? dex.natures.get(id).name : '';
		if (!kind) return Dex.formats.get(id).name || titleCase(id);
		return `${titleCase(kind)}: ${named || titleCase(id)}`;
	};
	for (const rule of checkFormat(row, dex).keys()) {
		if (!/^[-+*]/.test(rule)) continue;
		const body = rule.slice(1);
		if (pickerSpec(body)) continue;
		const state = rule.startsWith('-') ? 'banned' : rule.startsWith('*') ? 'restricted' : 'unbanned';
		// `-nonexistent` is a tag the sim spells without its prefix, and the chip for it is the
		// same chip, so it belongs with the tags rather than in the leftovers beside them.
		if (body.startsWith('tag:') || body === 'nonexistent') {
			bans.tags[body.startsWith('tag:') ? body.slice(4) : body] = state;
		} else {
			bans.other.push(`${state === 'unbanned' ? '+ ' : ''}${label(body)}`);
		}
	}
	return bans;
}

/**
 * What "reset" goes back to: what this format's rules allow on their own, with everything the
 * pickers wrote dropped. Not the base format's lists — the base is a starting point the owner has
 * since edited, and a rule they switched off has to keep counting. The `-All X` rules go too: an
 * allowlist is spelled with one, so leaving it in would make that list's default empty.
 */
function defaultRoster(row: Parameters<typeof toFormatData>[0], dex: ModdedDex) {
	const kept = (rule: string) => !pickerRule(rule, dex);
	return legalRoster({
		...row,
		banlist: row.banlist.filter(kept),
		unbanlist: row.unbanlist.filter(kept),
	}, dex);
}

export async function formatRoster(user: User, target: string) {
	validateAccess(user);
	// Names can't contain a comma, so what follows one is the request's own options.
	const [name, options] = Utils.splitFirst(target, ',');
	const row = await getOwn(user, name.trim());
	// The default roster costs as much to work out as the real one, and only changes when the base
	// format does, so it's sent when the builder says it hasn't got one.
	const wantDefault = toID(options) === 'default';
	return withOwnerDex(row.ownerid, row, dex => {
		const active = [...checkFormat(row, dex).keys()]
			.filter(rule => !/^[-+*!]/.test(rule) && !rule.includes(':'));
		const repealed = repealedRules(row);
		return {
			name: row.name,
			// Which named rulesets are on: bans and value rules carry a prefix or a colon, and the
			// builder has nothing to toggle for those.
			rules: active,
			locked: lockedRules(row, dex, active, repealed),
			bans: banRules(row, dex),
			legal: legalRoster(row, dex),
			...wantDefault ? { defaultLegal: defaultRoster(row, dex) } : {},
		};
	});
}

/**
 * Back to the rules the base format was copied in with. Picking the same base again is not an edit,
 * so without this the only way back is to pick another base and pick this one again.
 */
export async function resetFormat(user: User, name: string) {
	validateAccess(user);
	const row = await getOwn(user, name);
	const snapshot = baseSnapshot(row.base);
	if (!snapshot) {
		throw new Chat.ErrorMessage(`"${row.name}" isn't built on a base format, so it has no rules to go back to.`);
	}
	return editFormat(user, row.name, snapshot);
}

export async function removeFormat(user: User, name: string) {
	validateAccess(user);
	const row = await store.getDeletable(name, user, NOUN, database.get);
	await database.remove(row.entryid);
	return row;
}

export async function editFormat(user: User, name: string, changes: AnyObject) {
	validateAccess(user);
	const row = await getOwn(user, name);
	const normalized = await revalidate(row, changes);
	await database.update(row.entryid, normalized);
	return (await database.getById(row.entryid))!;
}

export const commands: Chat.ChatCommands = {
	customformat: {
		async create(target, room, user, connection, cmd) {
			validateAccess(user);
			const input = store.parseInput(target, 'format');
			if (cmd === 'check') {
				const otherNames = await ownedNames(user.id);
				const normalized = await withOwnerDex(user.id, input, dex => normalizeFormatData(input, {
					otherNames, ownerid: user.id, dex,
				}));
				return this.sendReplyBox(
					`<strong>${Utils.escapeHTML(normalized.name)}</strong> is valid. ` +
					`Nothing was saved - use <code>/customformat create</code> to save it.`
				);
			}
			const row = await createFormat(user, input);
			this.sendReply(`Created custom format "${row.name}".`);
			return this.sendReplyBox(details(row));
		},
		check: 'create',
		createhelp: [
			`/customformat create {json} - Saves a custom format. Requires: autoconfirmed`,
			`/customformat check {json} - Validates without saving. Requires: autoconfirmed`,
		],

		async list(target, room, user) {
			validateAccess(user);
			const ownerid = toID(target) || user.id;
			const rows = await database.list(ownerid, MAX_CUSTOM_FORMATS, ownerid !== user.id && !user.can('rangeban'));
			if (!rows.length) {
				return this.sendReply(
					ownerid === user.id ?
						`You haven't made any custom formats yet. Try /customformat help.` :
						`${ownerid} has no public custom formats.`
				);
			}
			let buf = `<strong>${Utils.escapeHTML(ownerid)}'s custom formats (${rows.length}):</strong><ul>`;
			for (const row of rows) buf += `<li>${summary(row)}</li>`;
			return this.sendReplyBox(`${buf}</ul>`);
		},

		'': 'view',
		show: 'view',
		async view(target, room, user) {
			validateAccess(user);
			if (!toID(target)) return this.parse(`/customformat list`);
			const row = await getVisible(user, ...store.parseOwnerAndName(target, user));
			if (row.ownerid !== user.id) await database.bumpViews(row.entryid);
			return this.sendReplyBox(details(row));
		},

		async rules(target, room, user) {
			validateAccess(user);
			const row = await getVisible(user, ...store.parseOwnerAndName(target, user));
			// The assembled rule table, which is what a battle would actually run under.
			const rules = await withOwnerDex(row.ownerid, row, dex => [...checkFormat(row, dex).keys()].sort());
			return this.sendReplyBox(
				`<details open><summary><strong>${Utils.escapeHTML(row.name)}</strong> ` +
				`(${Chat.count(rules, "rules")})</summary>${Utils.escapeHTML(rules.join(', '))}</details>`
			);
		},

		async export(target, room, user) {
			validateAccess(user);
			const row = await getVisible(user, ...store.parseOwnerAndName(target, user));
			return this.sendReplyBox(
				`<details open><summary><strong>${Utils.escapeHTML(row.name)}</strong></summary>` +
				`<textarea rows="12" style="width:100%" readonly>${Utils.escapeHTML(toExportJSON(row))}</textarea>` +
				`</details>`
			);
		},

		async edit(target, room, user) {
			validateAccess(user);
			const [name, json] = store.parts(target);
			if (!json) throw new Chat.ErrorMessage(`Usage: /customformat edit [name], {json}`);
			const updated = await editFormat(user, name, store.parseInput(json, 'format'));
			this.sendReply(`Updated "${updated.name}".`);
			return this.sendReplyBox(details(updated));
		},
		async reset(target, room, user) {
			const row = await resetFormat(user, target);
			this.sendReply(`Reset "${row.name}" to ${Dex.formats.get(row.base!).name}'s rules.`);
			return this.sendReplyBox(details(row));
		},
		resethelp: [
			`/customformat reset [name] - Puts a custom format's rules back to its base format's.`,
			`Requires: user with custom formats enabled`,
		],
		edithelp: [
			`/customformat edit [name], {json} - Merges the given fields into a custom format.`,
			`The whole entry is re-validated, so an edit can't leave it in a broken state.`,
		],

		async rename(target, room, user) {
			validateAccess(user);
			const [name, newName] = store.parts(target);
			if (!newName) throw new Chat.ErrorMessage(`Usage: /customformat rename [name], [new name]`);
			const row = await getOwn(user, name);
			const normalized = await revalidate(row, { name: newName });
			await database.update(row.entryid, { formatid: normalized.formatid, name: normalized.name });
			return this.sendReply(`Renamed "${row.name}" to "${normalized.name}".`);
		},

		async notes(target, room, user) {
			validateAccess(user);
			const [name, notes] = store.parts(target);
			if (notes.length > MAX_NOTES_LENGTH) {
				throw new Chat.ErrorMessage(`Notes can be at most ${MAX_NOTES_LENGTH} characters.`);
			}
			const row = await getOwn(user, name);
			await database.update(row.entryid, { notes: notes || null });
			return this.sendReply(notes ? `Set the notes on "${row.name}".` : `Cleared the notes on "${row.name}".`);
		},

		async private(target, room, user) {
			validateAccess(user);
			const [name, rawPrivacy] = store.parts(target);
			const row = await getOwn(user, name);
			const privacy = store.parsePrivacy(this, rawPrivacy);
			await database.update(row.entryid, { private: privacy });
			return this.sendReply(`"${row.name}" is now ${privacy ? 'private' : 'public'}.`);
		},

		async challenge(target, room, user) {
			validateAccess(user);
			const [targetUsername, name] = store.parts(target);
			if (!name) throw new Chat.ErrorMessage(`Usage: /customformat challenge [user], [format]`);
			// Checked here so the error names the format, rather than the challenge failing later.
			const row = await getVisible(user, user.id, name);
			return this.parse(`/challenge ${targetUsername}, ${store.customFormatId(user.id, row.formatid)}`);
		},
		challengehelp: [
			`/customformat challenge [user], [format] - Challenges someone to one of your custom formats.`,
		],

		async delete(target, room, user) {
			const row = await removeFormat(user, target);
			return this.sendReply(`Deleted "${row.name}".`);
		},
	},

	customformathelp: [
		`/customformat create {json} - Saves a custom format. See below for the fields.`,
		`/customformat check {json} - Validates JSON without saving it.`,
		`/customformat list [user] - Lists a user's custom formats. Defaults to yourself.`,
		`/customformat view [user], [name] - Shows one in full.`,
		`/customformat rules [user], [name] - Shows every rule the format resolves to.`,
		`/customformat export [user], [name] - Shows one as JSON you can re-import.`,
		`/customformat edit [name], {json} - Merges fields into one of yours.`,
		`/customformat rename [name], [new name] - Renames one of yours.`,
		`/customformat notes [name], [text] - Sets a description.`,
		`/customformat private [name], on/off - Hides one from other users.`,
		`/customformat challenge [user], [name] - Challenges someone to one of yours.`,
		`/customformat delete [name] - Deletes one of yours.`,
		`Fields: name, base, ruleset, banlist, unbanlist. Rules are the same names /tier accepts.`,
		`Example: /customformat create {"name":"Monotype Chomp","base":"[Gen 9] OU","banlist":["Uber"],"ruleset":["Same Type Clause"]}`,
	],
};

export function start() {
	void database.connect();
	Chat.multiLinePattern.register('/customformat create ', '/customformat check ', '/customformat edit ');
}
