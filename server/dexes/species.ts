import type { ModdedDex } from '../../sim/dex';
import type { LearnsetData, SpeciesData, SpeciesFormatsData } from '../../sim/dex-species';

export interface Origin {
	dexid: ID;
	dex: string;
	owner: string;
	name: string;
	creator?: string;
	from?: Origin;
}

export interface SpeciesEntry {
	speciesid: ID;
	num: number;
	inheritsfrom: ID | null;
	data: AnyObject;
	learnset: AnyObject;
	sprites: { [kind: string]: string };
	origin: Origin | null;
	trackdex: ID | null;
	trackid: ID | null;
	locked: boolean;
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
const NONSTANDARD = ['Past', 'Future', 'Unobtainable', 'CAP', 'LGPE', 'Custom', 'Gigantamax'];
const DOUBLES_TIERS = ['DUber', '(DUber)', 'DOU', '(DOU)', 'DBL', 'DUU', '(DUU)', 'NFE', 'LC', 'Illegal', 'Unreleased'];
const MOVE_SOURCE_REGEX = /^[1-9][MTLREDSVC][a-zA-Z0-9]*$/;
const FORMATS_FIELDS = ['tier', 'doublesTier', 'natDexTier'];
const LEARNSET_FIELDS = ['eventOnly', 'eventData'];
const REQUIRED_FIELDS = ['types', 'abilities', 'baseStats', 'eggGroups', 'weightkg'];
const NOT_INHERITED = [
	'name', 'num', 'isNonstandard', 'baseSpecies', 'forme', 'formeOrder', 'otherFormes', 'cosmeticFormes',
	'isCosmeticForme', 'changesFrom', 'battleOnly', 'requiredItem', 'requiredItems', 'requiredAbility', 'requiredMove',
	'canGigantamax', 'gmaxUnreleased',
	'prevo', 'evos', 'evoType', 'evoLevel', 'evoItem', 'evoMove', 'evoCondition', 'evoRegion',
];

function fromDex(table: { get: (name: string) => AnyObject }, value: unknown, what: string): string {
	if (typeof value !== 'string') throw new Chat.ErrorMessage(`Each ${what} must be a string.`);
	const entry = table.get(value);
	if (!entry.exists) throw new Chat.ErrorMessage(`"${value}" is not a valid ${what}.`);
	return entry.name;
}

function fromList(value: unknown, options: string[], what: string) {
	const match = typeof value === 'string' &&
		(options.find(entry => entry === value) || options.find(entry => toID(entry) === toID(value)));
	if (!match) throw new Chat.ErrorMessage(`"${value}" isn't a valid ${what}. Valid ${what}s: ${options.join(', ')}.`);
	return match;
}

function number(value: unknown, field: string, min: number, max: number, integer = false) {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max ||
		(integer && !Number.isInteger(value))) {
		throw new Chat.ErrorMessage(`"${field}" must be a${integer ? ' whole' : ''} number from ${min} to ${max}.`);
	}
	return integer ? value : Math.round(value * 1000) / 1000;
}

function text(value: unknown, field: string, maxLength: number) {
	if (typeof value !== 'string' || !value.trim()) throw new Chat.ErrorMessage(`"${field}" must be some text.`);
	if (value.trim().length > maxLength) {
		throw new Chat.ErrorMessage(`"${field}" can be at most ${maxLength} characters.`);
	}
	return value.trim();
}

function bool(value: unknown, field: string) {
	if (typeof value !== 'boolean') throw new Chat.ErrorMessage(`"${field}" must be true or false.`);
	return value;
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

const EVENT_FIELDS = new Map<string, (value: unknown, dex: ModdedDex) => any>([
	['generation', value => number(value, 'eventData.generation', 1, 9, true)],
	['level', value => number(value, 'eventData.level', 1, 100, true)],
	['shiny', value => (value === 1 ? value : bool(value, 'eventData.shiny'))],
	['gender', value => fromList(value, ['M', 'F'], 'eventData.gender')],
	['nature', (value, dex) => fromDex(dex.natures, value, 'nature')],
	['ivs', value => {
		if (!value || typeof value !== 'object' || Object.keys(value).some(stat => !STATS.includes(stat))) {
			throw new Chat.ErrorMessage(`"eventData.ivs" must be an object with some of ${STATS.join(', ')}.`);
		}
		const ivs: AnyObject = {};
		for (const stat in value) ivs[stat] = number((value as AnyObject)[stat], `eventData.ivs.${stat}`, 0, 31, true);
		return ivs;
	}],
	['perfectIVs', value => number(value, 'eventData.perfectIVs', 0, 6, true)],
	['isHidden', value => bool(value, 'eventData.isHidden')],
	['abilities', (value, dex) => list(value, 'eventData.abilities', 4, ability => (
		toID(fromDex(dex.abilities, ability, 'ability'))
	))],
	['maxEggMoves', value => number(value, 'eventData.maxEggMoves', 0, 4, true)],
	['moves', (value, dex) => list(value, 'eventData.moves', 24, move => toID(fromDex(dex.moves, move, 'move')))],
	['pokeball', (value, dex) => toID(fromDex(dex.items, value, 'item'))],
	['from', value => text(value, 'eventData.from', 100)],
	['japan', value => bool(value, 'eventData.japan')],
	['emeraldEventEgg', value => bool(value, 'eventData.emeraldEventEgg')],
	['source', value => text(value, 'eventData.source', 100)],
]);
const FIELDS = new Map<string, Field>([
	['types', (value, dex) => {
		const types = list(value, 'types', 4, type => (type === '???' ? type : fromDex(dex.types, type, 'type')));
		if (new Set(types).size < types.length) throw new Chat.ErrorMessage(`A Pokemon can't have the same type twice.`);
		return types;
	}],
	['baseStats', value => {
		if (!value || typeof value !== 'object' || Object.keys(value).some(stat => !STATS.includes(stat))) {
			throw new Chat.ErrorMessage(`"baseStats" must be an object with ${STATS.join(', ')}.`);
		}
		const baseStats: AnyObject = {};
		for (const stat of STATS) baseStats[stat] = number((value as AnyObject)[stat], `baseStats.${stat}`, 0, 255, true);
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
	['eggGroups', value => list(value, 'eggGroups', 8, group => (
		EGG_GROUPS.find(entry => toID(entry) === toID(group)) || text(group, 'eggGroups', 20)
	))],
	['weightkg', value => number(value, 'weightkg', 0, 10000)],
	['heightm', value => number(value, 'heightm', 0.01, 200)],
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
	['evos', (value, dex, names) => list(value, 'evos', 30, evo => relative(evo, 'evos', dex, names))],
	['evoType', value => fromList(value, EVO_TYPES, 'evoType')],
	['evoLevel', value => number(value, 'evoLevel', 1, 100, true)],
	['evoItem', (value, dex) => fromDex(dex.items, value, 'item')],
	['evoMove', (value, dex) => fromDex(dex.moves, value, 'move')],
	['evoCondition', value => text(value, 'evoCondition', 100)],
	['baseSpecies', (value, dex, names) => relative(value, 'baseSpecies', dex, names)],
	['forme', value => text(value, 'forme', 30)],
	['baseForme', value => text(value, 'baseForme', 30)],
	['cosmeticFormes', value => list(value, 'cosmeticFormes', 30, forme => validateName(forme, 'forme'))],
	['requiredItem', (value, dex) => fromDex(dex.items, value, 'item')],
	['requiredAbility', (value, dex) => fromDex(dex.abilities, value, 'ability')],
	['requiredMove', (value, dex) => fromDex(dex.moves, value, 'move')],
	['battleOnly', (value, dex, names) => (Array.isArray(value) ?
		list(value, 'battleOnly', 10, entry => relative(entry, 'battleOnly', dex, names)) :
		relative(value, 'battleOnly', dex, names))],
	['changesFrom', (value, dex, names) => relative(value, 'changesFrom', dex, names)],
	['sameNumberAs', (value, dex, names) => relative(value, 'sameNumberAs', dex, names)],
	['tier', value => fromList(value, TIERS, 'tier')],
	['natDexTier', value => fromList(value, TIERS, 'tier')],
	['doublesTier', value => fromList(value, DOUBLES_TIERS, 'doubles tier')],
	['tags', value => list(value, 'tags', 10, tag => text(tag, 'tag', 40))],
	['maxHP', value => number(value, 'maxHP', 1, 999, true)],
	['isNonstandard', value => fromList(value, NONSTANDARD, 'isNonstandard')],
	['eventOnly', value => bool(value, 'eventOnly')],
	['eventData', (value, dex) => list(value, 'eventData', 60, event => {
		if (!event || typeof event !== 'object' || Array.isArray(event)) {
			throw new Chat.ErrorMessage(`Each event must be an object like {"generation": 9, "level": 50, "moves": ["tackle"]}.`);
		}
		const result: AnyObject = {};
		for (const [key, entry] of Object.entries(event)) {
			const check = EVENT_FIELDS.get(key);
			if (!check) {
				throw new Chat.ErrorMessage(`"${key}" isn't an event field. Events can have: ${[...EVENT_FIELDS.keys()].join(', ')}.`);
			}
			result[key] = check(entry, dex);
		}
		if (!result.generation) throw new Chat.ErrorMessage(`Each event needs a "generation".`);
		return result;
	})],
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
			result[move.id] = null;
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
	if (Object.values(result).filter(Boolean).length > MAX_LEARNSET) {
		throw new Chat.ErrorMessage(`A learnset can have at most ${MAX_LEARNSET} moves.`);
	}
	return result;
}

export function validateEntry(input: AnyObject, dex: ModdedDex, entries: Map<ID, SpeciesEntry>, built = dex) {
	const name = validateName(input.name, 'Pokemon');
	const speciesid = toID(name);
	const official: AnyObject | undefined = dex.data.Pokedex[speciesid];
	const officialTiers: AnyObject | undefined = dex.data.FormatsData[speciesid];
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
		if (input[field] === null && (official?.[field] ?? officialTiers?.[field]) !== undefined &&
			!REQUIRED_FIELDS.includes(field)) {
			data[field] = null;
		} else if (input[field] === null) {
			delete data[field];
		} else {
			data[field] = check(input[field], built, names);
		}
	}
	if (official && (input.baseSpecies !== undefined || input.forme !== undefined)) {
		throw new Chat.ErrorMessage(`${official.name} already exists, so its base species and forme can't change.`);
	}
	if (data.forme && !data.baseSpecies) throw new Chat.ErrorMessage(`A "forme" needs a "baseSpecies".`);
	if (data.baseSpecies) {
		const prefix = `${data.baseSpecies}-`;
		data.forme ||= name.startsWith(prefix) ? name.slice(prefix.length) : '';
		if (!data.forme) {
			throw new Chat.ErrorMessage(`A forme's name is its base species, a dash, then the forme, like "${prefix}Delta", unless you set "forme".`);
		}
	}

	const entry: SpeciesEntry = {
		speciesid, num: old?.num || 0, inheritsfrom, data,
		learnset: learnset(input.learnset, built, old?.learnset || {}), sprites: old?.sprites || {},
		origin: old?.origin || null, trackdex: null, trackid: null, locked: old?.locked || false,
	};
	const species = resolveSpecies(dex, entry);
	for (const field of REQUIRED_FIELDS) {
		if (species[field] === undefined) {
			throw new Chat.ErrorMessage(`"${field}" is required, unless you set "inheritsFrom" to copy another Pokemon.`);
		}
	}
	return entry;
}

export function resolveSpecies(dex: ModdedDex, entry: SpeciesEntry): AnyObject {
	const data = { ...entry.data };
	for (const field of [...FORMATS_FIELDS, ...LEARNSET_FIELDS, 'sameNumberAs']) delete data[field];
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
	const all = [...entries];
	for (const entry of all) {
		const id = entry.speciesid;
		Pokedex[id] = resolveSpecies(dex, entry) as SpeciesData;
		const base = dex.data.Learnsets[dex.data.Pokedex[id] ? id : entry.inheritsfrom || '']?.learnset || {};
		const { sketch, ...moves }: AnyObject = { ...base, ...entry.learnset };
		for (const move of Object.keys(moves)) {
			if (!moves[move]) delete moves[move];
		}
		if (sketch) moves.sketch = sketch;
		if (Object.keys(moves).length || !Pokedex[id].baseSpecies) {
			Learnsets[id] = { ...(dex.data.Pokedex[id] ? dex.data.Learnsets[id] : {}), learnset: moves };
		}
		for (const field of LEARNSET_FIELDS) {
			if (entry.data[field] !== undefined) {
				Learnsets[id] = { ...(Learnsets[id] || dex.data.Learnsets[id]), [field]: entry.data[field] };
			}
		}
		const tiers: AnyObject = dex.data.Pokedex[id] ? { ...dex.data.FormatsData[id] } : { tier: 'OU' };
		for (const field of FORMATS_FIELDS) {
			if (entry.data[field]) tiers[field] = entry.data[field];
		}
		if (entry.data.isNonstandard !== undefined) tiers.isNonstandard = entry.data.isNonstandard;
		FormatsData[id] = tiers;
	}
	for (const entry of all) {
		const other = Pokedex[toID(entry.data.sameNumberAs)] || dex.data.Pokedex[toID(entry.data.sameNumberAs)];
		if (other) Pokedex[entry.speciesid].num = other.num;
	}
	const get = (id: ID) => (Pokedex[id] ||= { ...dex.data.Pokedex[id] }) as AnyObject;
	const exists = (name: string) => !!(Pokedex[toID(name)] || dex.data.Pokedex[toID(name)]);
	const chain = (species: AnyObject) => {
		const links = [species];
		while (links.length < 7 && links[0].baseSpecies && links[0].baseSpecies !== links[0].name &&
			exists(links[0].baseSpecies)) {
			links.unshift(get(toID(links[0].baseSpecies)));
		}
		return links;
	};
	const formes = all.filter(entry => entry.data.baseSpecies && !dex.data.Pokedex[entry.speciesid])
		.map(entry => chain(Pokedex[entry.speciesid]))
		.sort((a, b) => a.length - b.length || a[a.length - 1].name.localeCompare(b[b.length - 1].name));
	for (const links of formes) {
		const [root, base, forme] = [links[0], links[links.length - 2], links[links.length - 1]];
		if (!base) continue;
		forme.num = root.num;
		const order: string[] = root.formeOrder || [root.name];
		let at = order.includes(base.name) ? order.indexOf(base.name) + 1 : order.length;
		while (at < order.length && order[at].startsWith(`${base.name}-`)) at++;
		if (!order.includes(forme.name)) root.formeOrder = [...order.slice(0, at), forme.name, ...order.slice(at)];
		if (!base.otherFormes?.includes(forme.name)) base.otherFormes = [...base.otherFormes || [], forme.name];
	}
	return { Pokedex, Learnsets, FormatsData };
}
