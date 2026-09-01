/**
 * Shape validation for user-authored species. This is the trust boundary: nothing reaches
 * the database without passing through here, and `Dex.modData` does not validate.
 */
import { err, isPlainObject } from '../entries';
import { type CustomSpeciesRow, MAX_CUSTOM_SPECIES } from './database';

/** Set by the server or derived. Rejected by name rather than silently dropped. */
const SERVER_OWNED_FIELDS = new Set([
	'num', 'id', 'exists', 'gen', 'bst', 'nfe', 'spriteid', 'weighthg', 'canHatch',
	'effectType', 'tier', 'doublesTier', 'natDexTier', 'isNonstandard', 'inheritsFrom',
	'learnset', 'isCosmeticForme', 'otherFormes', 'cosmeticFormes', 'formeOrder',
]);

/** Required by SpeciesData (sim/dex-species.ts) for a species that stands on its own. */
const REQUIRED_STANDALONE_FIELDS = ['name', 'types', 'abilities', 'baseStats', 'eggGroups', 'weightkg'];

export const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

// also in chat-plugins/datasearch.ts, which runs in a subprocess and doesn't export them
const COLORS = ['Green', 'Red', 'Blue', 'White', 'Brown', 'Yellow', 'Purple', 'Pink', 'Gray', 'Black'];
const EGG_GROUPS = [
	'Amorphous', 'Bug', 'Ditto', 'Dragon', 'Fairy', 'Field', 'Flying', 'Grass', 'Human-Like',
	'Mineral', 'Monster', 'Undiscovered', 'Water 1', 'Water 2', 'Water 3',
];
const EVO_TYPES = ['trade', 'useItem', 'levelMove', 'levelExtra', 'levelFriendship', 'levelHold', 'other'];

/** See the MoveSource docs in sim/dex-species.ts: gen digit, source letter, then a free tail. */
const MOVE_SOURCE_REGEX = /^[1-9][MTLREDSVC][a-zA-Z0-9]*$/;

export const MAX_NOTES_LENGTH = 500;

export interface FieldLimit { min?: number; max?: number; maxLength?: number }

/** Every bound the checks below apply, in one table so the client can be sent the same numbers. */
export const FIELD_LIMITS: { [field: string]: FieldLimit } = {
	name: { maxLength: 40 },
	forme: { maxLength: 40 },
	category: { maxLength: 40 },
	dexEntry: { maxLength: 500 },
	evoCondition: { maxLength: 100 },
	tag: { maxLength: 40 },
	notes: { maxLength: MAX_NOTES_LENGTH },
	weightkg: { min: 0.1, max: 10000 },
	heightm: { min: 0.1, max: 200 },
	evoLevel: { min: 1, max: 100 },
	maxHP: { min: 1 },
	baseStat: { min: 1, max: 255 },
	learnset: { max: 500 },
	/** Not a field, but a cap the client should know before it offers to make another one. */
	species: { max: MAX_CUSTOM_SPECIES },
};

const limit = (field: string) => FIELD_LIMITS[field];

/** Unlimited unless an admin sets one. */
const maxBST = () => Number(Config.custompokemonmaxbst) || Infinity;

/** The table as sent to the client, with the configured BST cap folded in. */
export function fieldLimits() {
	const bstMax = maxBST();
	return Number.isFinite(bstMax) ? { ...FIELD_LIMITS, bst: { max: bstMax } } : FIELD_LIMITS;
}

function fromName(table: { get: (name: any) => AnyObject }, name: unknown, what: string) {
	if (typeof name !== 'string') err(`Each ${what} must be a string.`);
	const entry = table.get(name);
	if (!entry.exists) err(`"${name}" is not a valid ${what}.`);
	return entry.name;
}

function matchFromList(value: unknown, list: string[], what: string) {
	if (typeof value !== 'string') err(`Each ${what} must be a string.`);
	const match = list.find(entry => toID(entry) === toID(value));
	if (!match) err(`"${value}" isn't a valid ${what}. Valid ${what}s: ${list.join(', ')}.`);
	return match;
}

function validateNumber(value: unknown, field: string) {
	const { min, max } = limit(field);
	if (typeof value !== 'number' || !Number.isFinite(value)) err(`"${field}" must be a number.`);
	if (value < min! || value > max!) err(`"${field}" must be between ${min} and ${max}.`);
	// Two decimals, matching how pokedex.ts stores them.
	return Math.round(value * 100) / 100;
}

function validateInt(value: unknown, field: string) {
	const { min, max } = limit(field);
	if (!Number.isInteger(value) || (value as number) < min! || (value as number) > max!) {
		err(`"${field}" must be a whole number from ${min} to ${max}.`);
	}
	return value as number;
}

function validateText(value: unknown, field: string) {
	const maxLength = limit(field).maxLength!;
	if (typeof value !== 'string') err(`"${field}" must be a string.`);
	const text = value.trim();
	if (!text) err(`"${field}" can't be blank.`);
	if (text.length > maxLength) err(`"${field}" can be at most ${maxLength} characters.`);
	return text;
}

function oneOrTwo<T>(value: unknown, field: string, what: string, each: (entry: unknown) => T) {
	if (!Array.isArray(value) || !value.length || value.length > 2) {
		err(`"${field}" must be an array of one or two ${what}.`);
	}
	return (value as unknown[]).map(each);
}

function arrayOf<T>(value: unknown, field: string, what: string, each: (entry: unknown) => T) {
	if (!Array.isArray(value)) err(`"${field}" must be an array of ${what}.`);
	return (value as unknown[]).map(each);
}

/** prevo/evos may point at an official species or at another of the owner's creations. */
function validateRelative(value: unknown, otherNames: Map<ID, string>, field: string) {
	if (typeof value !== 'string') err(`"${field}" must be a species name.`);
	const official = Dex.species.get(value);
	if (official.exists) return official.name;
	const own = otherNames.get(toID(value));
	if (own) return own;
	err(`"${value}" (${field}) is neither an official Pokemon nor one of your custom ones.`);
}

function validateBaseStats(value: unknown) {
	if (!isPlainObject(value)) err(`"baseStats" must be an object.`);
	for (const stat in value) {
		if (!STATS.includes(stat as any)) err(`"${stat}" isn't a stat. Use: ${STATS.join(', ')}.`);
	}
	const baseStats: AnyObject = {};
	const { min, max } = limit('baseStat');
	for (const stat of STATS) {
		const amount = value[stat];
		if (!Number.isInteger(amount) || amount < min! || amount > max!) {
			err(`baseStats.${stat} must be a whole number from ${min} to ${max}.`);
		}
		baseStats[stat] = amount;
	}
	return baseStats;
}

function validateAbilities(value: unknown) {
	if (!isPlainObject(value)) {
		err(`"abilities" must be an object like {"0": "Levitate", "H": "Sturdy"}.`);
	}
	const abilities: AnyObject = {};
	for (const slot in value) {
		if (!['0', '1', 'H', 'S'].includes(slot)) {
			err(`"${slot}" isn't an ability slot. Use "0", "1", "H" (hidden) or "S" (special).`);
		}
		abilities[slot] = fromName(Dex.abilities, value[slot], 'ability');
	}
	if (!abilities['0']) err(`An ability in slot "0" is required.`);
	return abilities;
}

function validateGenderRatio(value: unknown) {
	if (!isPlainObject(value)) err(`"genderRatio" must be an object like {"M": 0.5, "F": 0.5}.`);
	const M = value.M, F = value.F;
	if (typeof M !== 'number' || typeof F !== 'number' || M < 0 || F < 0) {
		err(`"genderRatio" needs numeric "M" and "F" values of at least 0.`);
	}
	if (Math.abs(M + F - 1) > 0.001) err(`genderRatio M and F must add up to 1.`);
	return { M, F };
}

/** Fields a user may set, each with its check. A Map, so nothing on Object.prototype counts. */
type FieldValidator = (value: unknown, names: Map<ID, string>) => any;
const FIELDS = new Map<string, FieldValidator>([
	['name', value => value],
	['types', value => {
		const types = oneOrTwo(value, 'types', 'types', type => fromName(Dex.types, type, 'type'));
		if (types.length === 2 && types[0] === types[1]) err(`A species can't have the same type twice.`);
		return types;
	}],
	['baseStats', validateBaseStats],
	['abilities', validateAbilities],
	['eggGroups', value => oneOrTwo(value, 'eggGroups', 'egg groups', g => matchFromList(g, EGG_GROUPS, 'egg group'))],
	['weightkg', value => validateNumber(value, 'weightkg')],
	['heightm', value => validateNumber(value, 'heightm')],
	['color', value => matchFromList(value, COLORS, 'color')],
	['gender', value => {
		if (!['M', 'F', 'N', ''].includes(value as string)) {
			err(`"gender" must be "M", "F", "N" (genderless) or "" (both).`);
		}
		return value;
	}],
	['genderRatio', validateGenderRatio],
	['prevo', (value, names) => validateRelative(value, names, 'prevo')],
	['evos', (value, names) => arrayOf(value, 'evos', 'species names', e => validateRelative(e, names, 'evos entry'))],
	['evoType', value => {
		if (!EVO_TYPES.includes(value as string)) err(`"evoType" must be one of: ${EVO_TYPES.join(', ')}.`);
		return value;
	}],
	['evoLevel', value => validateInt(value, 'evoLevel')],
	['evoItem', value => fromName(Dex.items, value, 'item')],
	['evoMove', value => fromName(Dex.moves, value, 'move')],
	['evoCondition', value => validateText(value, 'evoCondition')],
	// an official species, not free text: `Dex.species.get` reads tags off the base entry
	['baseSpecies', value => fromName(Dex.species, value, 'species')],
	['forme', value => validateText(value, 'forme')],
	['requiredItem', value => fromName(Dex.items, value, 'item')],
	['requiredItems', value => arrayOf(value, 'requiredItems', 'item names', i => fromName(Dex.items, i, 'item'))],
	['maxHP', value => {
		if (!Number.isInteger(value) || (value as number) < 1) err(`"maxHP" must be a positive whole number.`);
		return value;
	}],
	['canGigantamax', value => fromName(Dex.moves, value, 'move')],
	['cannotDynamax', value => {
		if (typeof value !== 'boolean') err(`"cannotDynamax" must be true or false.`);
		return value;
	}],
	['battleOnly', value => (Array.isArray(value) ?
		value.map(s => fromName(Dex.species, s, 'species')) : fromName(Dex.species, value, 'species'))],
	['changesFrom', value => fromName(Dex.species, value, 'species')],
	['tags', value => arrayOf(value, 'tags', 'strings', tag => validateText(tag, 'tag'))],
	// Flavour only; the sim never reads these.
	['category', value => validateText(value, 'category')],
	['dexEntry', value => validateText(value, 'dexEntry')],
]);

export interface NormalizedSpecies {
	species: AnyObject;
	learnset: AnyObject;
	inheritsFrom: ID | null;
	name: string;
	speciesid: ID;
}

/** Normalizes arbitrary user JSON into a canonical SpeciesData object, or throws. */
export function normalizeSpeciesData(input: AnyObject, opts: {
	otherNames: Map<ID, string>,
}): NormalizedSpecies {
	const raw = { ...input };
	// Stored in their own columns, so pull them out before the field whitelist runs.
	const learnsetInput = raw.learnset;
	const inheritsInput = raw.inheritsFrom;
	delete raw.learnset;
	delete raw.inheritsFrom;

	for (const field in raw) {
		if (FIELDS.has(field)) continue;
		if (SERVER_OWNED_FIELDS.has(field)) err(`"${field}" is set by the server and can't be edited.`);
		err(`"${field}" isn't a species field. Valid fields: ${[...FIELDS.keys()].join(', ')}.`);
	}

	let inheritsFrom: ID | null = null;
	if (inheritsInput !== undefined && inheritsInput !== null && inheritsInput !== '') {
		if (typeof inheritsInput !== 'string') err(`"inheritsFrom" must be a species name.`);
		const base = Dex.species.get(inheritsInput);
		// Deliberately depth-1: a chain of custom bases would need cycle detection.
		// A cosmetic forme reports itself as existing, but its Pokedex entry is a stub.
		if (!base.exists || !Dex.data.Pokedex[base.id]?.baseStats) {
			err(
				`"${inheritsInput}" isn't a real Pokemon. A variant has to inherit from an ` +
				`official species, not from another custom one or a cosmetic forme.`
			);
		}
		inheritsFrom = base.id;
	}

	const name = validateName(raw.name, opts.otherNames);
	const species: AnyObject = { name };
	for (const field in raw) {
		// `null` clears a field; an edit merges, so there's otherwise no way to unset one.
		if (field === 'name' || raw[field] === undefined || raw[field] === null) continue;
		species[field] = FIELDS.get(field)!(raw[field], opts.otherNames);
	}

	if (!inheritsFrom) {
		for (const field of REQUIRED_STANDALONE_FIELDS) {
			if (species[field] === undefined) {
				err(
					`"${field}" is required. Supply it, or set "inheritsFrom" to an official ` +
					`species to inherit the fields you don't override.`
				);
			}
		}
	}

	// resolved stats, not supplied ones: an entry that inherits baseStats never supplies them
	const total = bst(resolveSpecies({ species, learnset: {}, inheritsfrom: inheritsFrom, num: 0 }));
	if (total > maxBST()) err(`That's a base stat total of ${total}; the limit is ${maxBST()}.`);

	return { species, learnset: normalizeLearnset(learnsetInput), inheritsFrom, name, speciesid: toID(name) };
}

function validateName(input: unknown, otherNames: Map<ID, string>) {
	if (typeof input !== 'string') err(`"name" is required and must be a string.`);
	const name = input.trim();
	if (!name) err(`"name" can't be blank.`);
	const maxName = limit('name').maxLength!;
	if (name.length > maxName) err(`Names can be at most ${maxName} characters.`);
	if (name !== Chat.stripFormatting(name) || /[|,[\]{}]/.test(name)) {
		err(`Names can't contain formatting characters or any of: | , [ ] { }`);
	}
	const id = toID(name);
	if (!id) err(`"name" needs at least one letter or number.`);
	// Two things named garchomp in one battle is not something we can resolve later.
	if (Dex.species.get(id).exists) err(`"${name}" is already an official Pokemon. Pick a different name.`);
	const clash = otherNames.get(id);
	if (clash) err(`You already have a custom Pokemon named "${clash}".`);
	return name;
}

export function normalizeLearnset(input: unknown): AnyObject {
	if (input === undefined || input === null) return {};
	if (!isPlainObject(input)) {
		err(`"learnset" must be an object mapping move names to source arrays, e.g. {"tackle": ["9L1"]}.`);
	}
	const learnset: AnyObject = {};
	let moves = 0;
	for (const key in input) {
		const maxMoves = limit('learnset').max!;
		if (++moves > maxMoves) err(`A learnset can hold at most ${maxMoves} moves.`);
		const move = Dex.moves.get(key);
		if (!move.exists) err(`"${key}" isn't a move.`);
		learnset[move.id] = normalizeMoveSources(input[key], move.name);
	}
	return learnset;
}

export function normalizeMoveSources(input: unknown, moveName: string) {
	const sources = Array.isArray(input) ? input : [input];
	if (!sources.length) err(`${moveName} needs at least one source, e.g. "9L1" or "9M".`);
	return sources.map(source => {
		if (typeof source !== 'string' || !MOVE_SOURCE_REGEX.test(source)) {
			err(
				`"${source}" isn't a valid move source for ${moveName}. A source is a generation ` +
				`digit, then one of MTLREDSVC, then an optional level or index - like "9L1", "9M" or "8E".`
			);
		}
		return source;
	});
}

/** The one thing a variant doesn't inherit: its base's place in the official forme graph. */
const NOT_INHERITED = [
	'name', 'num', 'isNonstandard', 'baseSpecies', 'forme', 'formeOrder', 'otherFormes',
	'cosmeticFormes', 'isCosmeticForme', 'changesFrom', 'battleOnly', 'requiredItem',
	'requiredItems', 'canGigantamax', 'gmaxUnreleased',
];

/** The inherited base with the stored overrides on top, spread the way `inherit: true` works. */
export function resolveSpecies(
	row: Pick<CustomSpeciesRow, 'species' | 'learnset' | 'inheritsfrom' | 'num'>
): AnyObject {
	const overrides = row.species || {};
	if (!row.inheritsfrom) return { ...overrides, num: row.num };
	const base: AnyObject = { ...Dex.data.Pokedex[row.inheritsfrom] };
	for (const field of NOT_INHERITED) delete base[field];
	return { ...base, ...overrides, num: row.num };
}

/** The learnset an entry actually has, including whatever it inherits. */
export function resolveLearnset(row: Pick<CustomSpeciesRow, 'learnset' | 'inheritsfrom'>): AnyObject {
	const own = row.learnset || {};
	if (!row.inheritsfrom) return { ...own };
	const base = Dex.species.getLearnsetData(row.inheritsfrom as ID);
	return { ...(base.learnset || {}), ...own };
}

/** BST as the dex itself computes it; 0 when an entry has no stats yet. */
export function bst(species: AnyObject) {
	return new Dex.Species(species).bst;
}

/** Canonical JSON for `export`, ordered so it reads like a pokedex.ts entry. */
export function toExportJSON(row: CustomSpeciesRow) {
	const out: AnyObject = { name: row.name };
	if (row.inheritsfrom) out.inheritsFrom = Dex.species.get(row.inheritsfrom).name;
	for (const field of FIELDS.keys()) {
		if (field === 'name') continue;
		if (row.species[field] !== undefined) out[field] = row.species[field];
	}
	if (Object.keys(row.learnset || {}).length) out.learnset = row.learnset;
	return JSON.stringify(out, null, 2);
}
