import type { ModdedDex } from '../../sim/dex';
import type { LearnsetData, SpeciesData, SpeciesFormatsData } from '../../sim/dex-species';

export interface SpeciesEntry {
	speciesid: ID;
	num: number;
	inheritsfrom: ID | null;
	data: AnyObject;
	learnset: AnyObject;
	sprites: { [kind: string]: string };
}

export const MAX_LEARNSET = 500;

const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const COLORS = ['Green', 'Red', 'Blue', 'White', 'Brown', 'Yellow', 'Purple', 'Pink', 'Gray', 'Black'];
const EGG_GROUPS = [
	'Amorphous', 'Bug', 'Ditto', 'Dragon', 'Fairy', 'Field', 'Flying', 'Grass', 'Human-Like',
	'Mineral', 'Monster', 'Undiscovered', 'Water 1', 'Water 2', 'Water 3',
];
const EVO_TYPES = ['trade', 'useItem', 'levelMove', 'levelExtra', 'levelFriendship', 'levelHold', 'other'];
const TIERS = [
	'AG', 'Uber', '(Uber)', 'OU', '(OU)', 'UUBL', 'UU', 'RUBL', 'RU', 'NUBL', 'NU', '(NU)', 'PUBL', 'PU', '(PU)',
	'ZUBL', 'ZU', 'NFE', 'LC', 'Illegal', 'Unreleased',
];
const DOUBLES_TIERS = ['DUber', '(DUber)', 'DOU', '(DOU)', 'DBL', 'DUU', '(DUU)', 'NFE', 'LC', 'Illegal', 'Unreleased'];
const MOVE_SOURCE_REGEX = /^[1-9][MTLREDSVC][a-zA-Z0-9]*$/;
const FORMATS_FIELDS = ['tier', 'doublesTier', 'natDexTier'];
const REQUIRED_FIELDS = ['types', 'abilities', 'baseStats', 'eggGroups', 'weightkg'];
const NOT_INHERITED = [
	'name', 'num', 'isNonstandard', 'baseSpecies', 'forme', 'formeOrder', 'otherFormes', 'cosmeticFormes',
	'isCosmeticForme', 'changesFrom', 'battleOnly', 'requiredItem', 'requiredItems', 'canGigantamax', 'gmaxUnreleased',
	'prevo', 'evos', 'evoType', 'evoLevel', 'evoItem', 'evoMove', 'evoCondition', 'evoRegion',
];

function fromDex(table: { get: (name: string) => AnyObject }, value: unknown, what: string): string {
	if (typeof value !== 'string') throw new Chat.ErrorMessage(`Each ${what} must be a string.`);
	const entry = table.get(value);
	if (!entry.exists) throw new Chat.ErrorMessage(`"${value}" is not a valid ${what}.`);
	return entry.name;
}

function fromList(value: unknown, options: string[], what: string) {
	const match = typeof value === 'string' && options.find(entry => toID(entry) === toID(value));
	if (!match) throw new Chat.ErrorMessage(`"${value}" isn't a valid ${what}. Valid ${what}s: ${options.join(', ')}.`);
	return match;
}

function number(value: unknown, field: string, min: number, max: number, integer = false) {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max ||
		(integer && !Number.isInteger(value))) {
		throw new Chat.ErrorMessage(`"${field}" must be a${integer ? ' whole' : ''} number from ${min} to ${max}.`);
	}
	return integer ? value : Math.round(value * 100) / 100;
}

function text(value: unknown, field: string, maxLength: number) {
	if (typeof value !== 'string' || !value.trim()) throw new Chat.ErrorMessage(`"${field}" must be some text.`);
	if (value.trim().length > maxLength) {
		throw new Chat.ErrorMessage(`"${field}" can be at most ${maxLength} characters.`);
	}
	return value.trim();
}

function list<T>(value: unknown, field: string, maxLength: number, each: (entry: unknown) => T) {
	if (!Array.isArray(value) || !value.length || value.length > maxLength) {
		throw new Chat.ErrorMessage(`"${field}" must be a list of 1 to ${maxLength} entries.`);
	}
	return value.map(each);
}

function relative(value: unknown, field: string, dex: ModdedDex, names: Map<ID, string>) {
	if (typeof value !== 'string') throw new Chat.ErrorMessage(`"${field}" must be a species name.`);
	const name = names.get(toID(value)) || (dex.species.get(value).exists && dex.species.get(value).name);
	if (!name) throw new Chat.ErrorMessage(`"${value}" (${field}) isn't a Pokemon in this dex.`);
	return name;
}

type Field = (value: unknown, dex: ModdedDex, names: Map<ID, string>) => any;
const FIELDS = new Map<string, Field>([
	['types', (value, dex) => {
		const types = list(value, 'types', 2, type => fromDex(dex.types, type, 'type'));
		if (types[0] === types[1]) throw new Chat.ErrorMessage(`A Pokemon can't have the same type twice.`);
		return types;
	}],
	['baseStats', value => {
		if (!value || typeof value !== 'object' || Object.keys(value).some(stat => !STATS.includes(stat))) {
			throw new Chat.ErrorMessage(`"baseStats" must be an object with ${STATS.join(', ')}.`);
		}
		const baseStats: AnyObject = {};
		for (const stat of STATS) baseStats[stat] = number((value as AnyObject)[stat], `baseStats.${stat}`, 1, 255, true);
		return baseStats;
	}],
	['abilities', (value, dex) => {
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			throw new Chat.ErrorMessage(`"abilities" must be an object like {"0": "Levitate", "H": "Sturdy"}.`);
		}
		const abilities: AnyObject = {};
		for (const slot in value) {
			if (!['0', '1', 'H', 'S'].includes(slot)) throw new Chat.ErrorMessage(`"${slot}" isn't an ability slot.`);
			abilities[slot] = fromDex(dex.abilities, (value as AnyObject)[slot], 'ability');
		}
		if (!abilities['0']) throw new Chat.ErrorMessage(`An ability in slot "0" is required.`);
		return abilities;
	}],
	['eggGroups', value => list(value, 'eggGroups', 2, group => fromList(group, EGG_GROUPS, 'egg group'))],
	['weightkg', value => number(value, 'weightkg', 0.1, 10000)],
	['heightm', value => number(value, 'heightm', 0.1, 200)],
	['color', value => fromList(value, COLORS, 'color')],
	['gender', value => {
		if (!['M', 'F', 'N'].includes(value as string)) throw new Chat.ErrorMessage(`"gender" must be "M", "F" or "N".`);
		return value;
	}],
	['genderRatio', value => {
		const { M, F } = (value || {}) as AnyObject;
		if (typeof M !== 'number' || typeof F !== 'number' || M < 0 || F < 0 || Math.abs(M + F - 1) > 0.001) {
			throw new Chat.ErrorMessage(`"genderRatio" must be like {"M": 0.5, "F": 0.5}, adding up to 1.`);
		}
		return { M, F };
	}],
	['prevo', (value, dex, names) => relative(value, 'prevo', dex, names)],
	['evos', (value, dex, names) => list(value, 'evos', 10, evo => relative(evo, 'evos', dex, names))],
	['evoType', value => fromList(value, EVO_TYPES, 'evoType')],
	['evoLevel', value => number(value, 'evoLevel', 1, 100, true)],
	['evoItem', (value, dex) => fromDex(dex.items, value, 'item')],
	['evoMove', (value, dex) => fromDex(dex.moves, value, 'move')],
	['evoCondition', value => text(value, 'evoCondition', 100)],
	['tier', value => fromList(value, TIERS, 'tier')],
	['natDexTier', value => fromList(value, TIERS, 'tier')],
	['doublesTier', value => fromList(value, DOUBLES_TIERS, 'doubles tier')],
	['tags', value => list(value, 'tags', 10, tag => text(tag, 'tag', 40))],
]);

export function validateName(input: unknown, what: string) {
	if (typeof input !== 'string') throw new Chat.ErrorMessage(`A ${what} needs a name.`);
	const name = input.trim();
	if (name.length > 40) throw new Chat.ErrorMessage(`Names can be at most 40 characters.`);
	if (name !== Chat.stripFormatting(name) || /[|,[\]{}@]/.test(name)) {
		throw new Chat.ErrorMessage(`Names can't contain formatting or any of: | , [ ] { } @`);
	}
	if (!/[a-z]/i.test(name)) throw new Chat.ErrorMessage(`Names need at least one letter.`);
	return name;
}

function learnset(input: unknown, dex: ModdedDex, old: AnyObject) {
	if (input === undefined) return old;
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		throw new Chat.ErrorMessage(`"learnset" must map moves to sources, e.g. {"tackle": ["9L1"]}.`);
	}
	const result = { ...old };
	for (const key in input) {
		const move = dex.moves.get(key);
		if (!move.exists) throw new Chat.ErrorMessage(`"${key}" isn't a move.`);
		const value = (input as AnyObject)[key];
		if (value === null) {
			delete result[move.id];
			continue;
		}
		result[move.id] = (Array.isArray(value) ? value : [value]).map(source => {
			if (typeof source !== 'string' || !MOVE_SOURCE_REGEX.test(source) || Number(source.charAt(0)) > dex.gen) {
				throw new Chat.ErrorMessage(
					`"${source}" isn't a source for ${move.name}: use a generation up to ${dex.gen}, ` +
					`then one of MTLREDSVC, like "${dex.gen}L1" or "${dex.gen}M".`
				);
			}
			return source;
		});
		if (!result[move.id].length) throw new Chat.ErrorMessage(`${move.name} needs at least one source.`);
	}
	if (Object.keys(result).length > MAX_LEARNSET) {
		throw new Chat.ErrorMessage(`A learnset can have at most ${MAX_LEARNSET} moves.`);
	}
	return result;
}

export function validateEntry(input: AnyObject, dex: ModdedDex, entries: Map<ID, SpeciesEntry>) {
	const name = validateName(input.name, 'Pokemon');
	const speciesid = toID(name);
	const official = dex.data.Pokedex[speciesid];
	const old = entries.get(speciesid);
	const names = new Map<ID, string>([...entries.values()].map(entry => [entry.speciesid, entry.data.name]));
	names.set(speciesid, name);

	let inheritsfrom = old ? old.inheritsfrom : null;
	if (input.inheritsFrom !== undefined) {
		if (official) throw new Chat.ErrorMessage(`${official.name} already exists, so it can't inherit from anything.`);
		const base = input.inheritsFrom === null ? null : dex.species.get(input.inheritsFrom);
		if (base && (!base.exists || !dex.data.Pokedex[base.id]?.baseStats)) {
			throw new Chat.ErrorMessage(`"${input.inheritsFrom}" isn't a Pokemon in the base dex.`);
		}
		inheritsfrom = base ? base.id : null;
	}

	const data: AnyObject = { ...old?.data, name: official ? official.name : name };
	for (const field in input) {
		if (['name', 'inheritsFrom', 'learnset'].includes(field)) continue;
		const check = FIELDS.get(field);
		if (!check) {
			throw new Chat.ErrorMessage(`"${field}" isn't something you can set. You can set: ${[...FIELDS.keys()].join(', ')}.`);
		}
		if (input[field] === null) {
			delete data[field];
		} else {
			data[field] = check(input[field], dex, names);
		}
	}

	const entry: SpeciesEntry = {
		speciesid, num: old?.num || 0, inheritsfrom, data,
		learnset: learnset(input.learnset, dex, old?.learnset || {}), sprites: old?.sprites || {},
	};
	const species = resolveSpecies(dex, entry);
	for (const field of REQUIRED_FIELDS) {
		if (species[field] === undefined) {
			throw new Chat.ErrorMessage(`"${field}" is required, unless you set "inheritsFrom" to copy another Pokemon.`);
		}
	}
	const bst = STATS.reduce((total, stat) => total + species.baseStats[stat], 0);
	const maxBST = Number(Config.dexmaxbst) || Infinity;
	if (bst > maxBST) throw new Chat.ErrorMessage(`That's a base stat total of ${bst}; the limit is ${maxBST}.`);
	return entry;
}

export function resolveSpecies(dex: ModdedDex, entry: SpeciesEntry): AnyObject {
	const data = { ...entry.data };
	for (const field of FORMATS_FIELDS) delete data[field];
	const official = dex.data.Pokedex[entry.speciesid];
	if (official) return { ...official, ...data };
	const base: AnyObject = entry.inheritsfrom ? { ...dex.data.Pokedex[entry.inheritsfrom] } : {};
	for (const field of NOT_INHERITED) delete base[field];
	return { ...base, ...data, num: entry.num, gen: dex.gen };
}

export function resolveEntries(dex: ModdedDex, entries: Iterable<SpeciesEntry>) {
	const Pokedex: { [id: string]: SpeciesData } = {};
	const Learnsets: { [id: string]: LearnsetData } = {};
	const FormatsData: { [id: string]: SpeciesFormatsData } = {};
	for (const entry of entries) {
		const id = entry.speciesid;
		Pokedex[id] = resolveSpecies(dex, entry) as SpeciesData;
		const base = dex.data.Learnsets[dex.data.Pokedex[id] ? id : entry.inheritsfrom || '']?.learnset || {};
		Learnsets[id] = { learnset: { ...base, ...entry.learnset } };
		const tiers: AnyObject = dex.data.Pokedex[id] ? { ...dex.data.FormatsData[id] } : { tier: 'OU' };
		for (const field of FORMATS_FIELDS) {
			if (entry.data[field]) tiers[field] = entry.data[field];
		}
		FormatsData[id] = tiers;
	}
	return { Pokedex, Learnsets, FormatsData };
}
