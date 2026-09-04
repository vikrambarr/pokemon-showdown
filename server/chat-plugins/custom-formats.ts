/**
 * Custom formats: the command layer. A format is composition over data/rulesets.ts, so
 * nothing a user writes can execute; ../custom/formats/validator.ts enforces that.
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
import {
	collectionSprites, type CustomBattleData, formatSummary, parseCustomFormat, resolveBattleData, resolveCollection,
	resolveFormatRef,
} from '../custom/dex';

import { type CustomFormatRow, MAX_CUSTOM_FORMATS } from '../custom/formats/database';

import type { ModdedDex } from '../../sim/dex';
import type { Format } from '../../sim/dex-formats';
import type { PokemonSet } from '../../sim/teams';

const NOUN = 'custom format';
/** How many formats one page of the directory adds, and the most it will ever show. */
const BROWSE_COUNT = 20;
const MAX_BROWSE = 500;

function validateAccess(user: User) {
	store.validateAccess(user, !!database.entries, Config.customformats, NOUN);
}
/** Anyone challenged to a format has to be able to read it, whether or not they can author one. */
function validateRead() {
	store.validateRead(!!database.entries, Config.customformats, NOUN);
}

async function ownedNames(ownerid: ID, excludeEntryid?: number) {
	return store.nameMap(await database.ownedNames(ownerid), row => row.formatid, excludeEntryid);
}

const getOwn = (user: User, name: string) => store.getOwn(user, name, NOUN, database.get);
const getVisible = (user: User, ownerid: ID, name: string, password?: string) =>
	store.getVisible(user, ownerid, name, NOUN, database.get, password);

/** Runs `fn` against a dex holding the owner's species, since rules may name them. */
async function withOwnerDex<T>(
	ownerid: ID, input: AnyObject, fn: (dex: ModdedDex) => T | Promise<T>, viewerid?: ID
) {
	const mod = toID(input.mod) || (input.base ? Dex.formats.get(input.base).mod : undefined);
	// a roster built from this dex is sent back, so hide private species from anyone else
	const collection = await resolveCollection(ownerid, {
		publicOnly: !!viewerid && viewerid !== ownerid,
		namedBy: [...input.ruleset || [], ...input.banlist || [], ...input.unbanlist || []],
	});
	const dex = buildCustomDex(collection, mod);
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
	// a new base restarts the rules from it, unless the same edit says what they should be
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

function refresh(context: Chat.PageContext) {
	return (
		`<button class="button" name="send" value="/j ${context.pageid}" style="float: right">` +
		` <i class="fa fa-refresh"></i> ${context.TL('Refresh')}</button>`
	);
}

/** The page one format has to itself. A private one is only reachable with the password in the link. */
const formatLink = (row: CustomFormatRow) =>
	`view-customformats-view-${row.ownerid}-${row.formatid}${row.private ? `-${row.private}` : ''}`;

/** A team is what a format is for: making one is how you pick a format out of the directory. */
const buildButton = (row: CustomFormatRow) => (
	`<button class="button" name="send" value="/cmd customformatbuild ` +
	`${store.customFormatId(row.ownerid, row.formatid)}${row.private ? `, ${row.private}` : ''}">` +
	`Build a team</button>`
);

/** One directory row, the way `/teams browse` previews a team. */
function preview(row: CustomFormatRow) {
	let buf = `<strong>${Utils.escapeHTML(row.name)}</strong>`;
	if (row.private) buf += ` <small>[private]</small>`;
	buf += `<br /><small>By: <strong>${row.ownerid}</strong></small><br />`;
	buf += `<small>Based on: ${Utils.escapeHTML(basedOn(row))}</small><br />`;
	buf += `<small>Updated: ${Chat.toTimestamp(new Date(row.updated), { human: true })}</small><br />`;
	buf += `<small>Views: ${row.views}</small>`;
	if (row.notes) buf += `<br />${Utils.escapeHTML(row.notes)}`;
	buf += `<br /><a class="button" href="/${formatLink(row)}">View</a> ${buildButton(row)}`;
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
	if (otherNames.size >= MAX_CUSTOM_FORMATS) {
		throw new Chat.ErrorMessage(
			`You already have ${MAX_CUSTOM_FORMATS} custom formats, which is the limit. Delete one first.`
		);
	}
	try {
		return await database.create({ ownerid: user.id, ...normalized, notes: null });
	} catch (e) {
		if (!store.isDuplicateName(e)) throw e;
		throw new Chat.ErrorMessage(`You already have a custom format called "${normalized.name}".`);
	}
}

/** The four lists the builder edits with a picker, in the order it shows them. */
type Roster = { pokemon: string[], move: string[], ability: string[], item: string[] };

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
 * Formes no teambuilder offers, mirroring the client's own tier tables. `battleOnly` is the
 * wrong test - Zacian-Crowned and every mega set it and are buildable - and no dex flag separates them.
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

/** Which species a format allows, via the same `checkSpecies` call `validateSet` makes. */
function legalRoster(row: Parameters<typeof toFormatData>[0], dex: ModdedDex): Roster {
	// only the base Dex can resolve a format's mod, so name the custom dex rather than pass it
	const format = new Dex.Format({ ...toFormatData(row), mod: dex.currentMod });
	const validator = new TeamValidator(format);
	const roster: Roster = { pokemon: [], move: [], ability: [], item: [] };
	// the checks only read this set; `checkAbility` looks the species up in some formats
	const set = {
		name: 'Set', species: 'Pikachu', moves: [], ability: '', item: '',
		evs: {}, ivs: {}, level: 100, nature: '',
	} as unknown as PokemonSet;
	for (const species of validator.dex.species.all()) {
		// `checkSpecies` calls a mid-battle forme legal; `validateSet` is what swaps it back
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

/** Which rules the format switches off. A `!` rule never reaches the rule table, so walk instead. */
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
 * Active rules the format can't switch off, and why: `[Gen 9] OU` repeals `Sleep Clause Mod`
 * from inside `Standard`, so repealing `Standard` leaves that repeal with nothing to do.
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
		// the edit the builder would make: delete the line that adds the rule, or repeal it
		const ruleset = row.ruleset.some(existing => named(existing, id) && !existing.includes('!')) ?
			row.ruleset.filter(existing => !named(existing, id)) :
			[...row.ruleset, `!${rule.name}`];
		try {
			const edited = { ...row, ruleset } as Parameters<typeof resolveRuleset>[0];
			// `resolveRuleset` rebuilds the rule table once per rule, up to MAX_RULES times;
			// a composition that builds first time needs none of that, and most do
			try {
				checkFormat(edited, dex);
			} catch {
				resolveRuleset(edited, dex);
			}
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

/** Tags the format bans, plus anything in its lists no picker or chip covers, so nothing is invisible. */
function banRules(row: Parameters<typeof toFormatData>[0], dex: ModdedDex) {
	const bans: { tags: { [tagid: string]: 'banned' | 'restricted' | 'unbanned' }, other: string[] } = {
		tags: {}, other: [],
	};
	// tag names aren't in the dex data, so anything unresolvable is title-cased from its id
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
		// the sim spells `-nonexistent` without its prefix, but it's the same chip
		if (body.startsWith('tag:') || body === 'nonexistent') {
			bans.tags[body.startsWith('tag:') ? body.slice(4) : body] = state;
		} else {
			bans.other.push(`${state === 'unbanned' ? '+ ' : ''}${label(body)}`);
		}
	}
	return bans;
}

/**
 * What "reset" goes back to: this format's own rules with everything the pickers wrote dropped,
 * `-All X` included, since an allowlist is spelled with one.
 */
function defaultRoster(row: Parameters<typeof toFormatData>[0], dex: ModdedDex) {
	const kept = (rule: string) => !pickerRule(rule, dex);
	return legalRoster({
		...row,
		banlist: row.banlist.filter(kept),
		unbanlist: row.unbanlist.filter(kept),
	}, dex);
}

/** A directory row: the summary a selector needs, plus what someone browsing is choosing between. */
function directoryEntry(row: CustomFormatRow) {
	return {
		...formatSummary(row),
		owner: row.ownerid,
		notes: row.notes || '',
		views: row.views,
		updated: new Date(row.updated).toISOString(),
	};
}

/** Enough of someone else's format for a client to offer it in a format selector. */
export async function formatInfo(user: User, target: string) {
	validateRead();
	const [name, password] = store.parts(target);
	// a saved team carries the id `toID` collapsed the name to, which spells neither owner nor format
	const ref = await resolveFormatRef(name);
	if (!ref) throw new Chat.ErrorMessage(`"${name}" isn't a custom format.`);
	return directoryEntry(await getVisible(user, ref.ownerid, ref.formatid, password));
}

/** The same, for the directory's button, plus the password the rest of the build will need. */
export async function formatBuild(user: User, target: string) {
	validateRead();
	const [name, password] = store.parts(target);
	const ref = parseCustomFormat(name);
	if (!ref) throw new Chat.ErrorMessage(`"${name}" isn't a custom format.`);
	const row = await getVisible(user, ref.ownerid, ref.formatid, password);
	return { ...directoryEntry(row), password: row.private || '' };
}

/** The author's species, so someone else's format builds and renders like one of your own. */
export async function formatDex(user: User, target: string) {
	validateRead();
	const [name, password] = store.parts(target);
	const ref = await resolveFormatRef(name);
	if (!ref) throw new Chat.ErrorMessage(`"${name}" isn't a custom format.`);
	const row = await getVisible(user, ref.ownerid, ref.formatid, password);
	if (row.ownerid !== user.id) await database.bumpViews(row.entryid);
	const collection = await resolveCollection(row.ownerid, {
		publicOnly: user.id !== row.ownerid,
		namedBy: [...row.ruleset, ...row.banlist, ...row.unbanlist],
	});
	return {
		...formatSummary(row), ...collection,
		sprites: await collectionSprites(row.ownerid, Object.keys(collection.Pokedex)),
	};
}

/** What a rules-and-roster request answers with, from a stored row or an unsaved draft of one. */
function rosterAnswer(row: CustomFormatRow, askerid: ID, wantDefault: boolean) {
	return withOwnerDex(row.ownerid, row, dex => {
		const active = [...checkFormat(row, dex).keys()]
			.filter(rule => !/^[-+*!]/.test(rule) && !rule.includes(':'));
		const repealed = repealedRules(row);
		return {
			// The id the format plays under, so a roster is cached under the same key everywhere.
			id: store.customFormatId(row.ownerid, row.formatid),
			name: row.name,
			// bans and value rules carry a prefix or a colon; the builder can't toggle those
			rules: active,
			locked: lockedRules(row, dex, active, repealed),
			bans: banRules(row, dex),
			legal: legalRoster(row, dex),
			...wantDefault ? { defaultLegal: defaultRoster(row, dex) } : {},
		};
	}, askerid);
}

export async function formatRoster(user: User, target: string) {
	validateRead();
	// Names can't contain a comma, so what follows one is the request's own options.
	const [name, options, password] = store.parts(target, 2);
	// A format that isn't the asker's own is named in full, and has to be one they can read.
	const ref = parseCustomFormat(name);
	const row = ref ?
		await getVisible(user, ref.ownerid, ref.formatid, password) :
		await getOwn(user, name);
	// as expensive as the real roster and only changes with the base, so sent on request
	return rosterAnswer(row, user.id, toID(options) === 'default');
}

/** The same answer for changes the builder is holding, so an edit can be previewed before saving. */
export async function formatDraft(user: User, target: string) {
	validateAccess(user);
	// `[name], [options], {json}`: the changes go last, since only they can contain a comma.
	const [name, options, json] = store.parts(target, 2);
	const row = await getOwn(user, name);
	const changes = json ? store.parseInput(json, 'format') : {};
	const draft = { ...row, ...await revalidate(row, changes) };
	return rosterAnswer(draft, user.id, toID(options) === 'default');
}

/** Back to the rules the base was copied in with; re-picking the same base is not an edit. */
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
	// Overrides core's vtm: a custom format's id resolves through no global Dex.formats entry.
	async vtm(target, room, user, connection) {
		if (Monitor.countPrepBattle(connection.ip, connection)) return;
		if (!target) throw new Chat.ErrorMessage(this.TL`Provide a valid format.`);
		const customRef = await resolveFormatRef(target);
		let format: Format;
		let customData: CustomBattleData | null = null;
		let notFound = '';
		if (customRef) {
			customData = await resolveBattleData(customRef, user.id);
			format = Dex.formats.get(customRef.id);
		} else {
			const originalFormat = Dex.formats.get(target);
			format = originalFormat.effectType === 'Format' ? originalFormat : Dex.formats.get('Anything Goes');
			if (format.effectType !== 'Format') return this.popupReply(this.TL`Please provide a valid format.`);
			if (originalFormat !== format) notFound = this.TL`The format '${originalFormat.name}' was not found.`;
		}
		const result = await TeamValidatorAsync.get(format.id)
			.validateTeam(user.battleSettings.team, { user: user.id, customData });
		// a custom format has no global Dex entry, so `format.name` is its internal id
		const shown = customData?.format.name || format.name;
		if (result.startsWith('1')) {
			connection.popup(`${notFound ? notFound + "\n\n" : ""}${this.TL`Your team is valid for ${shown}.`}`);
		} else {
			connection.popup(
				`${notFound ? notFound + "\n\n" : ""}${this.TL`Your team was rejected for the following reasons:`}` +
				`\n\n- ${result.slice(1).replace(/\n/g, '\n- ')}`
			);
		}
	},
	vtmhelp: [`/vtm [format] - Validates your current team (set with /utm).`],

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
			`/customformat create {json} - Saves a custom format.`,
			`/customformat check {json} - Validates without saving.`,
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

		browse(target) {
			return this.parse(`/j view-customformats-browse${target ? `-${toID(target)}` : ''}`);
		},
		search(this: Chat.CommandContext, target: string) {
			const [owner, name] = target.split(',');
			return this.parse(`/j view-customformats-search-${toID(owner)}--${toID(name)}`);
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
			const rules = await withOwnerDex(
				row.ownerid, row, dex => [...checkFormat(row, dex).keys()].sort(), user.id
			);
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
		`/customformat browse [latest|views] - Browses public custom formats made by other users.`,
		`/customformat search [owner], [name] - Searches public custom formats.`,
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

export const pages: Chat.PageTable = {
	customformats: {
		async browse(query, user) {
			if (!user.named) return Rooms.RETRY_AFTER_LOGIN;
			validateRead();
			const sorter = toID(query.shift()) || 'latest';
			if (sorter !== 'latest' && sorter !== 'views') {
				throw new Chat.ErrorMessage(`Invalid sort term '${sorter}'. Must be either 'views' or 'latest'.`);
			}
			let count = Number(toID(query.shift())) || BROWSE_COUNT;
			if (count > MAX_BROWSE) count = MAX_BROWSE;
			this.title = `[Custom formats]`;
			let buf = `<div class="pad"><h2>Browse ${sorter === 'views' ? 'most viewed' : 'latest'} custom formats</h2>`;
			buf += refresh(this);
			buf += `<br /><a class="button" href="/view-customformats-search">Search</a> `;
			const opposite = sorter === 'views' ? 'latest' : 'views';
			buf += `<button class="button" name="send" value="/j view-customformats-browse-${opposite}-${count}">`;
			buf += `Sort by ${opposite}</button>`;
			buf += `<hr />`;
			const rows = await database.browse({}, sorter, count);
			if (!rows.length) return `${buf}<div class="message-error">None found.</div>`;
			for (const row of rows) buf += `${preview(row)}<hr />`;
			if (rows.length === count && count < MAX_BROWSE) {
				buf += `<button class="button" name="send" `;
				buf += `value="/j view-customformats-browse-${sorter}-${count + BROWSE_COUNT}">View more</button>`;
			}
			return buf;
		},
		async search(query, user) {
			if (!user.named) return Rooms.RETRY_AFTER_LOGIN;
			validateRead();
			this.title = `[Custom formats] Search`;
			let buf = `<div class="pad">`;
			buf += refresh(this);
			buf += `<h2>Search custom formats</h2>`;
			query = query.join('-').split('--');
			if (!query.map(toID).filter(Boolean).length) {
				buf += `<hr />`;
				buf += `<form data-submitsend="/join view-customformats-search-{owner}--{name}">`;
				buf += `Owner: <input name="owner" /><br />`;
				buf += `Format name: <input name="name" /><br /><br />`;
				buf += `<button class="button notifying" type="submit">Search!</button>`;
				return `${buf}</form>`;
			}
			const [ownerid, name] = query.map(toID);
			buf += `Search: ` + [ownerid && `Owner: ${ownerid}`, name && `Name: ${name}`].filter(Boolean).join(', ');
			buf += `<hr />`;
			const rows = await database.browse({ ownerid, name }, 'latest', MAX_BROWSE);
			if (!rows.length) return `${buf}<div class="message-error">No results found.</div>`;
			return buf + rows.map(preview).join('<hr />');
		},
		async view(query, user) {
			if (!user.named) return Rooms.RETRY_AFTER_LOGIN;
			validateRead();
			const ownerid = toID(query.shift());
			const formatid = toID(query.shift());
			const row = await getVisible(user, ownerid, formatid, toID(query.shift()));
			if (row.ownerid !== user.id) await database.bumpViews(row.entryid);
			this.title = `[Custom format] ${row.name}`;
			let buf = `<div class="pad">`;
			buf += refresh(this);
			buf += details(row);
			buf += `<p><small>By: <strong>${row.ownerid}</strong> &middot; ${Chat.count(row.views, "views")}</small></p>`;
			buf += `<p>${buildButton(row)} `;
			buf += `<a class="button" href="/view-customformats-browse">Browse all</a></p>`;
			return buf;
		},
	},
};

export function start() {
	void database.connect();
	Chat.multiLinePattern.register('/customformat create ', '/customformat check ', '/customformat edit ');
}
