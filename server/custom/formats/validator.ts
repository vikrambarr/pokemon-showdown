/**
 * Shape validation for user-authored formats.
 *
 * This is the trust boundary. A format is composed data and never code: every
 * rule has to be a name that survives `Dex.formats.validateRule`, and the
 * assembled format has to build a rule table before it can be saved.
 */
import { customFormatName, err } from '../entries';

import type { CustomFormatRow } from './database';
import type { FormatData } from '../../../sim/dex-formats';

/** Fields a user may set. Everything else about a format comes from its base. */
const ALLOWED_FIELDS = new Set(['name', 'base', 'ruleset', 'banlist', 'unbanlist']);

/**
 * Set by the server or inherited. Rejected by name rather than silently dropped,
 * and the executable ones (`onValidateSet` and friends) are rejected here because
 * this file is the only reason nothing user-authored can run.
 */
const SERVER_OWNED_FIELDS = new Set([
	'mod', 'effectType', 'gameType', 'playerCount', 'rated', 'debug', 'searchShow',
	'challengeShow', 'tournamentShow', 'baseRuleset', 'customRules', 'ruleTable', 'section',
	'column', 'battle', 'field', 'pokemon', 'side', 'queue', 'actions', 'init', 'teamLength',
	'onBegin', 'onValidateSet', 'onValidateTeam', 'onChooseTeam', 'checkCanLearn', 'team',
]);

export const RULE_LISTS = ['ruleset', 'banlist', 'unbanlist'] as const;
/** `getRuleTable` throws above 50, and it's the in-play name that has to fit. */
const MAX_NAME_LENGTH = 50;
const MAX_RULES = 50;
export const MAX_NOTES_LENGTH = 500;

export type FormatComposition = Pick<CustomFormatRow, 'name' | 'base' | 'ruleset' | 'banlist' | 'unbanlist'>;

export interface NormalizedFormat extends FormatComposition {
	formatid: ID;
}

export function normalizeFormatData(input: AnyObject, opts: {
	otherNames: Map<ID, string>, ownerid: ID,
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
		base: validateBase(input.base),
		ruleset: validateRules(input.ruleset, 'ruleset', ''),
		banlist: validateRules(input.banlist, 'banlist', '-'),
		unbanlist: validateRules(input.unbanlist, 'unbanlist', '+'),
	};
	// Every rule is legal on its own by this point; this is what catches rules that
	// contradict each other, or that change nothing.
	try {
		Dex.formats.getRuleTable(new Dex.Format(toFormatData(normalized)));
	} catch (e: any) {
		err(`Those rules don't work together: ${e.message}`);
	}
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

function validateBase(input: unknown) {
	if (typeof input !== 'string' || !input.trim()) {
		err(`"base" is required: the format yours starts from, like "[Gen 9] OU".`);
	}
	if (input.includes('@@@')) err(`"base" has to be a plain format name, without @@@ rules.`);
	const format = Dex.formats.get(input);
	if (format.effectType !== 'Format') err(`"${input}" isn't a format.`);
	return format.id;
}

function validateRules(input: unknown, field: typeof RULE_LISTS[number], prefix: string) {
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
			Dex.formats.validateRule(prefix + trimmed);
		} catch (e: any) {
			err(`${e.message} (in "${field}")`);
		}
		return trimmed;
	});
}

const isCustomTagRule = (rule: string) => ['custom', 'tagcustom'].includes(toID(rule.replace(/^[+\-*!^]+/, '')));

/** The format as the dex wants it: a base to inherit, then this row's rules on top. */
export function toFormatData(row: FormatComposition): FormatData {
	const base = Dex.formats.get(row.base);
	const unbanlist = [...row.unbanlist];
	// Custom species are only reachable through their tag, and playing with them is
	// the point - but an explicit rule about them wins.
	const rules = [...row.ruleset, ...row.banlist, ...row.unbanlist];
	if (!rules.some(isCustomTagRule)) unbanlist.push('tag:custom');
	return {
		name: row.name,
		mod: base.mod,
		gameType: base.gameType,
		effectType: 'Format',
		ruleset: [base.name, ...row.ruleset],
		banlist: [...row.banlist],
		unbanlist,
		rated: false,
		searchShow: false,
		challengeShow: false,
		tournamentShow: false,
	};
}

/** Canonical JSON for `export`, ordered so it reads like a config/formats.ts entry. */
export function toExportJSON(row: CustomFormatRow) {
	const out: AnyObject = { name: row.name, base: Dex.formats.get(row.base).name };
	for (const field of RULE_LISTS) {
		if (row[field]?.length) out[field] = row[field];
	}
	return JSON.stringify(out, null, 2);
}
