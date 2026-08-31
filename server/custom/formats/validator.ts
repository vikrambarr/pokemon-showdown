/**
 * Shape validation for user-authored formats.
 *
 * This is the trust boundary. A format is composed data and never code: every rule
 * has to be a name that survives `Dex.formats.validateRule`, and the assembled
 * format has to build a rule table before it can be saved.
 */
import { Utils } from '../../../lib';
import { customFormatName, err } from '../entries';
import { Tags } from '../../../data/tags';

import type { CustomFormatRow } from './database';
import type { FormatData } from '../../../sim/dex-formats';
import type { ModdedDex } from '../../../sim/dex';

/** Fields a user may set. Everything else about a format comes from its base. */
const ALLOWED_FIELDS = new Set(['name', 'mod', 'base', 'ruleset', 'banlist', 'unbanlist']);

/** Set by the server or inherited, including every executable one. Rejected by name, not dropped. */
const SERVER_OWNED_FIELDS = new Set([
	'effectType', 'gameType', 'playerCount', 'rated', 'debug', 'searchShow',
	'challengeShow', 'tournamentShow', 'baseRuleset', 'customRules', 'ruleTable', 'section',
	'column', 'battle', 'field', 'pokemon', 'side', 'queue', 'actions', 'init', 'teamLength',
	'onBegin', 'onValidateSet', 'onValidateTeam', 'onChooseTeam', 'checkCanLearn', 'team',
]);

export const RULE_LISTS = ['ruleset', 'banlist', 'unbanlist'] as const;
/** `getRuleTable` throws above 50, and it's the in-play name that has to fit. */
const MAX_NAME_LENGTH = 50;
/**
 * A roster is spelled `-All Pokemon` plus a `+Species` per entry, so this is really the cap on how
 * many Pokemon a format may allow. The sim itself is fine with hundreds (300 builds in ~2ms).
 */
const MAX_RULES = 500;
export const MAX_NOTES_LENGTH = 500;

export type FormatComposition = Pick<CustomFormatRow, 'name' | 'mod' | 'base' | 'ruleset' | 'banlist' | 'unbanlist'>;

export interface NormalizedFormat extends FormatComposition {
	formatid: ID;
}

export function normalizeFormatData(input: AnyObject, opts: {
	otherNames: Map<ID, string>, ownerid: ID,
	/** A dex containing the owner's custom species, so rules may name them. */
	dex?: ModdedDex,
}): NormalizedFormat {
	for (const field in input) {
		if (ALLOWED_FIELDS.has(field)) continue;
		if (SERVER_OWNED_FIELDS.has(field)) {
			err(`"${field}" comes from the base format and can't be set here.`);
		}
		err(`"${field}" isn't a format field. Valid fields: ${[...ALLOWED_FIELDS].join(', ')}.`);
	}

	const name = validateName(input.name, opts);
	const normalized: NormalizedFormat = {
		name,
		formatid: toID(name),
		mod: validateMod(input.mod),
		base: validateBase(input.base, input.mod),
		ruleset: validateRules(input.ruleset, 'ruleset', '', opts.dex),
		banlist: validateRules(input.banlist, 'banlist', '-', opts.dex),
		unbanlist: validateRules(input.unbanlist, 'unbanlist', '+', opts.dex),
	};
	// Every rule is legal on its own by now; this catches rules that contradict each other.
	normalized.ruleset = resolveRuleset(normalized, opts.dex);
	return normalized;
}

function validateName(input: unknown, opts: { otherNames: Map<ID, string>, ownerid: ID }) {
	if (typeof input !== 'string') err(`"name" is required and must be a string.`);
	const name = input.trim();
	if (!name) err(`"name" can't be blank.`);
	if (name !== Chat.stripFormatting(name) || /[|,[\]{}@]/.test(name)) {
		err(`Format names can't contain formatting characters or any of: | , [ ] { } @`);
	}
	// A battle shows the owner in the name, and that's the spelling that has to fit.
	const inPlay = customFormatName(opts.ownerid, name);
	if (inPlay.length > MAX_NAME_LENGTH) {
		err(
			`In a battle this format is called "${inPlay}", which is over the ${MAX_NAME_LENGTH} ` +
			`character limit. Use a name up to ${MAX_NAME_LENGTH - (inPlay.length - name.length)} characters.`
		);
	}
	const id = toID(name);
	if (!id) err(`"name" needs at least one letter or number.`);
	if (Dex.formats.get(id).exists) {
		err(`"${name}" is already the name of a real format. Pick a different one.`);
	}
	if (opts.otherNames.has(id)) err(`You already have a format called "${opts.otherNames.get(id)}".`);
	return name;
}

/**
 * The sim's ways of saying a rule does nothing: adding what is already there, and two spellings of
 * repealing what was never in effect (which of the two depends on whether the base format's own
 * expansion consumed the repeal). All three are no-ops by definition, so all three are safe to drop.
 */
const NO_OP_RULE = /^(?:Rule ".+?" (?:did nothing|in ".*" already exists)|Multiple ".+?" rules)/;

/**
 * A ruleset is intent, and what its base format supplies moves under it: `!Sleep Clause Mod` means
 * something against a gen8 base and nothing against a gen9 one, and the base is a field its owner
 * can change at any time. So a rule that has stopped doing anything is dropped instead of refused —
 * otherwise one stale entry makes every later edit fail. Anything that is a real contradiction is
 * still the owner's to fix, and still reported.
 */
export function resolveRuleset(format: NormalizedFormat, dex?: ModdedDex) {
	const fail = (e: any) => err(`Those rules don't work together: ${e.message}`);
	try {
		checkFormat(format, dex);
		return format.ruleset;
	} catch (e: any) {
		if (!NO_OP_RULE.test(e.message)) fail(e);
	}
	const ruleset: string[] = [];
	for (const rule of format.ruleset) {
		try {
			checkFormat({ ...format, ruleset: [...ruleset, rule] }, dex);
			ruleset.push(rule);
		} catch (e: any) {
			// The no-op isn't always the rule itself: repealing `Standard` leaves the base format's
			// own `!Sleep Clause Mod` with nothing to repeal. Either way the rule can't apply.
			if (!NO_OP_RULE.test(e.message)) fail(e);
		}
	}
	try {
		checkFormat({ ...format, ruleset }, dex);
	} catch (e: any) {
		fail(e);
	}
	return ruleset;
}

/**
 * The rules a base format hands a new custom format. Copied one level deep, exactly as the format's
 * author wrote them, so `Standard` arrives as one line its owner can delete rather than as an
 * inherited layer they can only work around. What doesn't come along: a base format's own code
 * hooks, and its `restricted` list, which this schema has no field for.
 */
export function baseSnapshot(base: unknown) {
	const format = Dex.formats.get(typeof base === 'string' ? base : '');
	if (!format.exists || format.effectType !== 'Format') return null;
	return {
		ruleset: [...format.ruleset],
		banlist: [...format.banlist],
		unbanlist: [...format.unbanlist],
	};
}

let catalogue: { id: string, name: string, desc?: string }[] | null = null;
/**
 * Every named ruleset a format can switch on, for the builder to offer. Rules that take a value
 * ("Force Monotype = Water") need more than a toggle, so they're left out until there's UI for one.
 */
export function rulesetCatalogue() {
	if (!catalogue) {
		catalogue = [];
		for (const id in Dex.data.Rulesets) {
			const rule = Dex.formats.get(id);
			if (rule.effectType === 'Format' || rule.hasValue) continue;
			catalogue.push({ id: rule.id, name: rule.name, ...rule.desc ? { desc: rule.desc } : {} });
		}
		Utils.sortBy(catalogue, entry => entry.name);
	}
	return catalogue;
}

let tags: { id: string, name: string, kind: string }[] | null = null;
/**
 * Every tag a format can ban, for the builder to offer. `validTag` is the sim's own test, so this
 * is exactly what a rule may name; what it leaves out are the tags that take a comparison
 * ("-BST > 600") rather than a toggle.
 */
export function tagCatalogue() {
	if (!tags) {
		tags = [];
		for (const id in Tags) {
			if (!Dex.formats.validTag(id as ID)) continue;
			const tag = Tags[id as Lowercase<string>];
			tags.push({ id, name: tag.name, kind: tag.speciesFilter ? 'pokemon' : tag.moveFilter ? 'move' : 'other' });
		}
		Utils.sortBy(tags, entry => [entry.kind, entry.name]);
	}
	return tags;
}

/** Exactly the mods `validateMod` accepts, so the builder can't offer one it would reject. */
export function modList() {
	return Object.keys(Dex.dexes).filter(id => id !== 'base');
}

/** The mechanics a format is played under, independent of whatever base format it layers on. */
function validateMod(input: unknown) {
	if (input === undefined || input === null || input === '') return null;
	if (typeof input !== 'string') err(`"mod" must be a mod name like "gen9" or "gen8bdsp".`);
	const modid = toID(input);
	if (!Dex.dexes[modid]) {
		err(`"${input}" isn't a mod. Valid mods: ${Object.keys(Dex.dexes).filter(id => id !== 'base').join(', ')}.`);
	}
	return modid;
}

function validateBase(input: unknown, mod: unknown) {
	// A mod on its own is a blank slate: its mechanics, and only the rules you write.
	if ((input === undefined || input === null || input === '') && mod) return null;
	if (typeof input !== 'string' || !input.trim()) {
		err(`Pick a "mod" to start from scratch, or a "base" format to layer rules on top of.`);
	}
	if (input.includes('@@@')) err(`"base" has to be a plain format name, without @@@ rules.`);
	const format = Dex.formats.get(input);
	if (format.effectType !== 'Format') err(`"${input}" isn't a format.`);
	return format.id;
}

/** The format as the dex it will be played in sees it, so custom species resolve. */
export function checkFormat(row: FormatComposition, dex?: ModdedDex) {
	const data = toFormatData(row);
	// Naming the custom dex as the mod, rather than working through it: see legalSpecies.
	return Dex.formats.getRuleTable(new Dex.Format(dex ? { ...data, mod: dex.currentMod } : data));
}

function validateRules(input: unknown, field: typeof RULE_LISTS[number], prefix: string, dex?: ModdedDex) {
	if (input === undefined || input === null) return [];
	if (!Array.isArray(input)) err(`"${field}" must be an array of rule names.`);
	if (input.length > MAX_RULES) err(`"${field}" can have at most ${MAX_RULES} entries.`);
	return input.map(rule => {
		if (typeof rule !== 'string') err(`Every "${field}" entry must be a string.`);
		const trimmed = rule.trim();
		if (!trimmed) err(`"${field}" can't contain blank entries.`);
		if (prefix && /^[+\-*]/.test(trimmed)) {
			err(`"${trimmed}" shouldn't start with ${trimmed[0]} - being in "${field}" already means that.`);
		}
		try {
			(dex || Dex).formats.validateRule(prefix + trimmed);
		} catch (e: any) {
			err(`${e.message} (in "${field}")`);
		}
		return trimmed;
	});
}

/** The format as the dex wants it: a base to inherit, then this row's rules on top. */
export function toFormatData(row: FormatComposition): FormatData {
	const base = row.base ? Dex.formats.get(row.base) : null;
	return {
		name: row.name,
		mod: row.mod || base!.mod,
		gameType: base?.gameType || 'singles',
		effectType: 'Format',
		// The base format is where a format's rules came from, not a layer over them: picking one
		// copies its rules in (see `baseSnapshot`), so everything here is the format's own.
		ruleset: [...row.ruleset],
		banlist: [...row.banlist],
		unbanlist: [...row.unbanlist],
		rated: false,
		searchShow: false,
		challengeShow: false,
		tournamentShow: false,
	};
}

/** Canonical JSON for `export`, ordered so it reads like a config/formats.ts entry. */
export function toExportJSON(row: CustomFormatRow) {
	const out: AnyObject = { name: row.name };
	if (row.mod) out.mod = row.mod;
	if (row.base) out.base = Dex.formats.get(row.base).name;
	for (const field of RULE_LISTS) {
		if (row[field]?.length) out[field] = row[field];
	}
	return JSON.stringify(out, null, 2);
}
