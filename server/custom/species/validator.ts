/**
 * Shape validation for user-authored species.
 *
 * This is the trust boundary. Nothing reaches the database without passing
 * through here; `Dex.modData` explicitly does not validate.
 */
import { err, isPlainObject } from '../entries';

import type { CustomSpeciesRow } from './database';

/** Fields a user may set, drawn from the Species class in sim/dex-species.ts. */
const ALLOWED_FIELDS = new Set([
	'name', 'types', 'baseStats', 'abilities', 'eggGroups', 'weightkg', 'heightm', 'color',
	'gender', 'genderRatio', 'prevo', 'evos', 'evoType', 'evoLevel', 'evoItem', 'evoMove',
	'evoCondition', 'baseSpecies', 'forme', 'requiredItem', 'requiredItems', 'maxHP',
	'canGigantamax', 'cannotDynamax', 'battleOnly', 'changesFrom', 'tags',
]);

/**
 * Set by the server or derived from other fields. Rejected by name rather than
 * silently dropped, so nobody thinks they set a tier and quietly didn't.
 */
const SERVER_OWNED_FIELDS = new Set([
	'num', 'id', 'exists', 'gen', 'bst', 'nfe', 'spriteid', 'weighthg', 'canHatch',
	'effectType', 'tier', 'doublesTier', 'natDexTier', 'isNonstandard', 'inheritsFrom',
	'learnset', 'isCosmeticForme', 'otherFormes', 'cosmeticFormes', 'formeOrder',
]);

/** Required by SpeciesData (sim/dex-species.ts) for a species that stands on its own. */
const REQUIRED_STANDALONE_FIELDS = ['name', 'types', 'abilities', 'baseStats', 'eggGroups', 'weightkg'];

export const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

// Canonical tables. These also exist in chat-plugins/datasearch.ts, but that
// plugin runs in a subprocess and doesn't export them.
const COLORS = ['Green', 'Red', 'Blue', 'White', 'Brown', 'Yellow', 'Purple', 'Pink', 'Gray', 'Black'];
const EGG_GROUPS = [
	'Amorphous', 'Bug', 'Ditto', 'Dragon', 'Fairy', 'Field', 'Flying', 'Grass', 'Human-Like',
	'Mineral', 'Monster', 'Undiscovered', 'Water 1', 'Water 2', 'Water 3',
];

const EVO_TYPES = ['trade', 'useItem', 'levelMove', 'levelExtra', 'levelFriendship', 'levelHold', 'other'];

/** See the MoveSource docs in sim/dex-species.ts: gen digit, source letter, then a free tail. */
const MOVE_SOURCE_REGEX = /^[1-9][MTLREDSVC][a-zA-Z0-9]*$/;

const MAX_NAME_LENGTH = 40;
export const MAX_NOTES_LENGTH = 500;
const MAX_LEARNSET_MOVES = 500;
const DEFAULT_MAX_BST = 800;

const maxBST = () => Number(Config.custompokemonmaxbst) || DEFAULT_MAX_BST;

function fromName(table: { get: (name: any) => AnyObject }, name: unknown, what: string) {
	if (typeof name !== 'string') err(`Each ${what} must be a string.`);
	const entry = table.get(name);
	if (!entry.exists) err(`"${name}" is not a valid ${what}.`);
	return entry.name;
}

export interface NormalizedSpecies {
	species: AnyObject;
	learnset: AnyObject;
	inheritsFrom: ID | null;
	name: string;
	speciesid: ID;
}

/**
 * Normalizes arbitrary user JSON into a canonical SpeciesData object, or throws.
 *
 * `otherNames` is the owner's other entries, used both for the uniqueness check
 * and to let prevo/evos point at the user's own creations.
 */
export function normalizeSpeciesData(input: AnyObject, opts: {
	otherNames: Map<ID, string>,
}): NormalizedSpecies {
	const raw = { ...input };

	// Learnset and inheritsFrom are stored in their own columns, so pull them out
	// before the field whitelist runs.
	const learnsetInput = raw.learnset;
	const inheritsInput = raw.inheritsFrom;
	delete raw.learnset;
	delete raw.inheritsFrom;

	for (const field in raw) {
		if (ALLOWED_FIELDS.has(field)) continue;
		if (SERVER_OWNED_FIELDS.has(field)) {
			err(`"${field}" is set by the server and can't be edited.`);
		}
		err(`"${field}" isn't a species field. Valid fields: ${[...ALLOWED_FIELDS].join(', ')}.`);
	}

	let inheritsFrom: ID | null = null;
	if (inheritsInput !== undefined && inheritsInput !== null && inheritsInput !== '') {
		if (typeof inheritsInput !== 'string') err(`"inheritsFrom" must be a species name.`);
		const base = Dex.species.get(inheritsInput);
		if (!base.exists) {
			// Deliberately depth-1: a chain of custom bases would need cycle detection.
			err(
				`"${inheritsInput}" isn't a real Pokemon. A variant has to inherit from an ` +
				`official species, not from another custom one.`
			);
		}
		inheritsFrom = base.id;
	}

	const species: AnyObject = {};

	const name = validateName(raw.name, opts.otherNames);
	species.name = name;

	if (raw.types !== undefined) {
		if (!Array.isArray(raw.types) || !raw.types.length || raw.types.length > 2) {
			err(`"types" must be an array of one or two types.`);
		}
		species.types = raw.types.map(type => fromName(Dex.types, type, 'type'));
		if (species.types.length === 2 && species.types[0] === species.types[1]) {
			err(`A species can't have the same type twice.`);
		}
	}

	if (raw.baseStats !== undefined) {
		if (!isPlainObject(raw.baseStats)) err(`"baseStats" must be an object.`);
		const baseStats: AnyObject = {};
		for (const stat in raw.baseStats) {
			if (!STATS.includes(stat as any)) {
				err(`"${stat}" isn't a stat. Use: ${STATS.join(', ')}.`);
			}
		}
		for (const stat of STATS) {
			const value = raw.baseStats[stat];
			if (!Number.isInteger(value) || value < 1 || value > 255) {
				err(`baseStats.${stat} must be a whole number from 1 to 255.`);
			}
			baseStats[stat] = value;
		}
		species.baseStats = baseStats;
	}

	if (raw.abilities !== undefined) {
		if (!isPlainObject(raw.abilities)) {
			err(`"abilities" must be an object like {"0": "Levitate", "H": "Sturdy"}.`);
		}
		const abilities: AnyObject = {};
		for (const slot in raw.abilities) {
			if (!['0', '1', 'H', 'S'].includes(slot)) {
				err(`"${slot}" isn't an ability slot. Use "0", "1", "H" (hidden) or "S" (special).`);
			}
			abilities[slot] = fromName(Dex.abilities, raw.abilities[slot], 'ability');
		}
		if (!abilities['0']) err(`An ability in slot "0" is required.`);
		species.abilities = abilities;
	}

	if (raw.eggGroups !== undefined) {
		if (!Array.isArray(raw.eggGroups) || !raw.eggGroups.length || raw.eggGroups.length > 2) {
			err(`"eggGroups" must be an array of one or two egg groups.`);
		}
		species.eggGroups = raw.eggGroups.map((group: unknown) => matchFromList(group, EGG_GROUPS, 'egg group'));
	}

	if (raw.color !== undefined) species.color = matchFromList(raw.color, COLORS, 'color');

	// physical
	if (raw.weightkg !== undefined) species.weightkg = validateNumber(raw.weightkg, 'weightkg', 0.1, 10000);
	if (raw.heightm !== undefined) species.heightm = validateNumber(raw.heightm, 'heightm', 0.1, 200);
	if (raw.maxHP !== undefined) {
		if (!Number.isInteger(raw.maxHP) || raw.maxHP < 1) err(`"maxHP" must be a positive whole number.`);
		species.maxHP = raw.maxHP;
	}

	if (raw.gender !== undefined) {
		if (!['M', 'F', 'N', ''].includes(raw.gender)) {
			err(`"gender" must be "M", "F", "N" (genderless) or "" (both).`);
		}
		species.gender = raw.gender;
	}
	if (raw.genderRatio !== undefined) {
		if (!isPlainObject(raw.genderRatio)) err(`"genderRatio" must be an object like {"M": 0.5, "F": 0.5}.`);
		const M = raw.genderRatio.M, F = raw.genderRatio.F;
		if (typeof M !== 'number' || typeof F !== 'number' || M < 0 || F < 0) {
			err(`"genderRatio" needs numeric "M" and "F" values of at least 0.`);
		}
		if (Math.abs(M + F - 1) > 0.001) err(`genderRatio M and F must add up to 1.`);
		species.genderRatio = { M, F };
	}

	// evolution
	if (raw.prevo !== undefined) species.prevo = validateRelative(raw.prevo, opts.otherNames, 'prevo');
	if (raw.evos !== undefined) {
		if (!Array.isArray(raw.evos)) err(`"evos" must be an array of species names.`);
		species.evos = raw.evos.map((evo: unknown) => validateRelative(evo, opts.otherNames, 'evos entry'));
	}
	if (raw.evoType !== undefined) {
		if (!EVO_TYPES.includes(raw.evoType)) err(`"evoType" must be one of: ${EVO_TYPES.join(', ')}.`);
		species.evoType = raw.evoType;
	}
	if (raw.evoLevel !== undefined) {
		if (!Number.isInteger(raw.evoLevel) || raw.evoLevel < 1 || raw.evoLevel > 100) {
			err(`"evoLevel" must be a whole number from 1 to 100.`);
		}
		species.evoLevel = raw.evoLevel;
	}
	if (raw.evoItem !== undefined) species.evoItem = fromName(Dex.items, raw.evoItem, 'item');
	if (raw.evoMove !== undefined) species.evoMove = fromName(Dex.moves, raw.evoMove, 'move');
	if (raw.evoCondition !== undefined) species.evoCondition = validateText(raw.evoCondition, 'evoCondition', 100);

	// formes
	// An official species, not free text: `Dex.species.get` reads tags and tiers
	// straight off the base entry without checking that there is one.
	if (raw.baseSpecies !== undefined) species.baseSpecies = fromName(Dex.species, raw.baseSpecies, 'species');
	if (raw.forme !== undefined) species.forme = validateText(raw.forme, 'forme', MAX_NAME_LENGTH);
	if (raw.changesFrom !== undefined) species.changesFrom = fromName(Dex.species, raw.changesFrom, 'species');
	if (raw.battleOnly !== undefined) {
		species.battleOnly = Array.isArray(raw.battleOnly) ?
			raw.battleOnly.map((s: unknown) => fromName(Dex.species, s, 'species')) :
			fromName(Dex.species, raw.battleOnly, 'species');
	}

	if (raw.requiredItem !== undefined) species.requiredItem = fromName(Dex.items, raw.requiredItem, 'item');
	if (raw.requiredItems !== undefined) {
		if (!Array.isArray(raw.requiredItems)) err(`"requiredItems" must be an array of item names.`);
		species.requiredItems = raw.requiredItems.map((item: unknown) => fromName(Dex.items, item, 'item'));
	}

	// misc flags
	if (raw.canGigantamax !== undefined) species.canGigantamax = fromName(Dex.moves, raw.canGigantamax, 'move');
	if (raw.cannotDynamax !== undefined) {
		if (typeof raw.cannotDynamax !== 'boolean') err(`"cannotDynamax" must be true or false.`);
		species.cannotDynamax = raw.cannotDynamax;
	}
	if (raw.tags !== undefined) {
		if (!Array.isArray(raw.tags)) err(`"tags" must be an array of strings.`);
		species.tags = raw.tags.map((tag: unknown) => validateText(tag, 'tag', 40));
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

	// Checked against the resolved stats rather than the supplied ones: an entry
	// that inherits its baseStats never supplies them.
	const total = bst(resolveSpecies({ species, learnset: {}, inheritsfrom: inheritsFrom, num: 0 }));
	if (total > maxBST()) err(`That's a base stat total of ${total}; the limit is ${maxBST()}.`);

	return {
		species,
		learnset: normalizeLearnset(learnsetInput),
		inheritsFrom,
		name,
		speciesid: toID(name),
	};
}

function validateName(input: unknown, otherNames: Map<ID, string>) {
	if (typeof input !== 'string') err(`"name" is required and must be a string.`);
	const name = input.trim();
	if (!name) err(`"name" can't be blank.`);
	if (name.length > MAX_NAME_LENGTH) err(`Names can be at most ${MAX_NAME_LENGTH} characters.`);
	if (name !== Chat.stripFormatting(name) || /[|,[\]{}]/.test(name)) {
		err(`Names can't contain formatting characters or any of: | , [ ] { }`);
	}
	const id = toID(name);
	if (!id) err(`"name" needs at least one letter or number.`);
	if (Dex.species.get(id).exists) {
		// Two things named garchomp in one battle is not something we can resolve later.
		err(`"${name}" is already an official Pokemon. Pick a different name.`);
	}
	const clash = otherNames.get(id);
	if (clash) err(`You already have a custom Pokemon named "${clash}".`);
	return name;
}

function validateNumber(value: unknown, field: string, min: number, max: number) {
	if (typeof value !== 'number' || !Number.isFinite(value)) err(`"${field}" must be a number.`);
	if (value < min || value > max) err(`"${field}" must be between ${min} and ${max}.`);
	// Two decimals, matching how pokedex.ts stores them.
	return Math.round(value * 100) / 100;
}

function validateText(value: unknown, field: string, maxLength: number) {
	if (typeof value !== 'string') err(`"${field}" must be a string.`);
	const text = value.trim();
	if (!text) err(`"${field}" can't be blank.`);
	if (text.length > maxLength) err(`"${field}" can be at most ${maxLength} characters.`);
	return text;
}

function matchFromList(value: unknown, list: string[], what: string) {
	if (typeof value !== 'string') err(`Each ${what} must be a string.`);
	const match = list.find(entry => toID(entry) === toID(value));
	if (!match) err(`"${value}" isn't a valid ${what}. Valid ${what}s: ${list.join(', ')}.`);
	return match;
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

export function normalizeLearnset(input: unknown): AnyObject {
	if (input === undefined || input === null) return {};
	if (!isPlainObject(input)) {
		err(`"learnset" must be an object mapping move names to source arrays, e.g. {"tackle": ["9L1"]}.`);
	}
	const learnset: AnyObject = {};
	let moves = 0;
	for (const key in input) {
		if (++moves > MAX_LEARNSET_MOVES) err(`A learnset can hold at most ${MAX_LEARNSET_MOVES} moves.`);
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

/**
 * Fields naming a Pokemon's place in the official forme graph. A custom species has an
 * identity of its own - a variant of Garchomp-Mega is not itself a forme of Garchomp -
 * so these are the only things a variant doesn't inherit. A user can still set any of
 * them explicitly; they're in ALLOWED_FIELDS.
 */
const NOT_INHERITED = [
	'name', 'num', 'isNonstandard', 'baseSpecies', 'forme', 'formeOrder', 'otherFormes',
	'cosmeticFormes', 'isCosmeticForme', 'changesFrom', 'battleOnly', 'requiredItem',
	'requiredItems', 'canGigantamax', 'gmaxUnreleased',
];

/**
 * The entry as a complete SpeciesData: the inherited base with the stored overrides on
 * top. What display uses, and what a battle's payload is built from.
 *
 * Inheriting is a spread of the base's own table entry, the way `inherit: true` works for
 * a mod, so a field upstream adds later is carried over rather than silently dropped.
 */
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
	for (const field of ALLOWED_FIELDS) {
		if (field === 'name') continue;
		if (row.species[field] !== undefined) out[field] = row.species[field];
	}
	if (Object.keys(row.learnset || {}).length) out.learnset = row.learnset;
	// Real JSON, so the output feeds straight back into `/custompokemon create`.
	return JSON.stringify(out, null, 2);
}
