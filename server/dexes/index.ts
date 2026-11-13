import { AsyncLocalStorage } from 'async_hooks';
import * as crypto from 'crypto';
import { FS, Utils } from '../../lib';
import { SQL, PGDatabase } from '../../lib/database';
import {
	baseEffect, buildBase, buildDex, buildFormat, EFFECT_TABLES, isBuiltDex, isObject, releaseDex, type DexLayer, type EffectTable,
} from '../../sim/dex-custom';
import { handlersOf } from '../../sim/dex-handlers';
import type { ModdedDex } from '../../sim/dex';
import type { Format, FormatData } from '../../sim/dex-formats';
import { TeamValidator } from '../../sim/team-validator';
import type { PokemonSet } from '../../sim/teams';
import { Tags } from '../../data/tags';
import * as sprites from './sprites';
import { resolveEntries, TIER_FIELDS, validateEntry, validateName, type Origin, type SpeciesEntry } from './species';
import {
	describeEffect, describeText, EDITABLE, EFFECT_NAMES, lookupTables, resolveEdits, validateEffect, type EffectEntry,
} from './effects';
import { resolveTypes, validateType, type TypeEntry } from './types';

export type Effects = { [table in EffectTable]: Map<ID, EffectEntry> } & { TypeChart: Map<ID, TypeEntry> };
export type Table = 'Pokedex' | EffectTable | 'TypeChart';
export type Visibility = 'public' | 'private';
type Entry = SpeciesEntry | EffectEntry | TypeEntry;

export interface DexRow {
	dexid: ID;
	ownerid: string;
	ownername: string;
	name: string;
	mod: string;
	species: ID[];
	removed: ID[];
	parents: ID[];
	official: boolean;
	visibility: Visibility;
	description: string;
	effectlists: { [table in ListTable]?: { added?: ID[], removed?: ID[] } };
	created: number;
	updated: number;
}

export type ListTable = 'Moves' | 'Abilities' | 'Items';
export const LIST_TABLES: ListTable[] = ['Moves', 'Abilities', 'Items'];

export interface LoadedDex {
	row: DexRow;
	editors: Map<string, string>;
	entries: Map<ID, SpeciesEntry>;
	formats: Map<ID, FormatData>;
	effects: Effects;
	uploads: Map<string, sprites.Upload>;
	stale: string[];
	data: DexLayer;
	dex: ModdedDex;
}

export const MAX_FORMATS = 16;
export const MAX_SPRITE_STORAGE = 10 * 1024 * 1024;
export const MAX_DATA_STORAGE = 1024 * 1024;
export const MAX_DEPTH = 8;
export const MAX_PARENTS = 8;
export const MAX_EDITORS = 8;
export const MAX_DESCRIPTION = 512;
export const VISIBILITIES = ['public', 'private'];

const GAME_TYPES = ['singles', 'doubles', 'triples', 'multi', 'freeforall'];
const FORMAT_LISTS = ['ruleset', 'banlist', 'unbanlist', 'restricted'];
const FORMAT_FLAGS = ['bestOfDefault', 'teraPreviewDefault', 'itemClauseDefault', 'debug'];

export const dexes = new Map<ID, LoadedDex>();
const formatDexes = new Map<ID, ID>();
const savedSnapshots = new Set<string>();
const savedLayers = new Set<string>();
const refreshing = new Map<ID, Promise<LoadedDex | null>>();
const accounts = new Map<ID, string>();
const bases = new Map<string, ModdedDex>();
let db: PGDatabase | null = null;
let dbConfig: AnyObject | null = null;
let registeredOn: typeof Dex | null = null;
let loading: Promise<void> | null = null;
const mutations = new AsyncLocalStorage<{
	db: PGDatabase, snapshots: LoadedDex[], dexes: Map<ID, LoadedDex>, files: (() => Promise<void>)[],
}>();
let writing: Promise<unknown> = Promise.resolve();

function currentDexes() {
	return mutations.getStore()?.dexes || dexes;
}

export function database() {
	const active = mutations.getStore();
	if (active) return active.db;
	if (!Config.usepostgres) throw new Chat.ErrorMessage(`Dexes need a Postgres database.`);
	if (dbConfig !== Config.usepostgres) {
		dbConfig = Config.usepostgres;
		db = new PGDatabase(Config.usepostgres);
	}
	return db!;
}

const json = (value: unknown) => JSON.stringify(value);
const newID = (prefix: string, taken: (id: ID) => boolean) => {
	for (;;) {
		const id = `${prefix}${crypto.randomBytes(5).toString('hex')}` as ID;
		if (!taken(id)) return id;
	}
};
const tableName = (table: Table) => (
	table === 'Pokedex' ? 'Pokemon' : table === 'TypeChart' ? 'type' : EFFECT_NAMES[table]
);
const TABLES: Table[] = ['Pokedex', ...EFFECT_TABLES, 'TypeChart'];

export function entriesOf(loaded: LoadedDex, table: Table): Map<ID, Entry> {
	return table === 'Pokedex' ? loaded.entries : loaded.effects[table];
}

function newNum(table: Table, taken: Iterable<Entry> = []) {
	return Math.min(
		-10000, ...[...taken].map(other => other.num),
		...[...currentDexes().values()].flatMap(other => [...entriesOf(other, table).values()].map(each => each.num))
	) - 1;
}

function isBase(dex: ModdedDex, table: Table, id: ID) {
	return !!dex.data[table][id];
}

export function parentsOf(loaded: LoadedDex) {
	return loaded.row.parents.map(dexid => currentDexes().get(dexid)).filter(parent => parent) as LoadedDex[];
}

function childrenOf(loaded: LoadedDex) {
	return [...currentDexes().values()].filter(other => other.row.parents.includes(loaded.row.dexid));
}

export function ancestorsOf(loaded: LoadedDex) {
	const found = [loaded];
	for (const dex of found) {
		for (const parent of parentsOf(dex)) {
			if (!found.includes(parent)) found.push(parent);
		}
	}
	return found;
}

function parentLayers(row: DexRow) {
	return row.parents.map(dexid => {
		const parent = currentDexes().get(dexid);
		if (!parent) throw new Chat.ErrorMessage(`${row.name}'s world has a dex that isn't loaded.`);
		return parent;
	});
}

function baseKey(row: DexRow) {
	return `${row.mod}:${row.parents.map(dexid => currentDexes().get(dexid)?.data.hash).join(',')}`;
}

export function baseOf(row: DexRow): ModdedDex {
	const parents = parentLayers(row);
	if (!parents.length) return Dex.mod(row.mod);
	if (parents.length === 1 && parents[0].row.mod === row.mod) return parents[0].dex;
	const key = baseKey(row);
	if (!bases.has(key)) bases.set(key, buildBase({ mod: row.mod, parents: parents.map(parent => parent.data.hash) }, Dex));
	return bases.get(key)!;
}

function pruneBases() {
	const used = new Set([...currentDexes().values()].map(loaded => baseKey(loaded.row)));
	for (const [key, base] of bases) {
		if (used.has(key)) continue;
		releaseDex(base);
		bases.delete(key);
	}
}

export function baseName(row: DexRow) {
	if (!row.parents.length) return row.mod;
	const parents = row.parents.map(dexid => currentDexes().get(dexid));
	const names = parents.map((parent, i) => parent?.row.name || row.parents[i]).join(' + ');
	return parents.every(parent => parent?.row.mod === row.mod) ? names : `${names} (on ${row.mod})`;
}

function depthOf(loaded: LoadedDex): number {
	return Math.max(0, ...parentsOf(loaded).map(parent => depthOf(parent) + 1));
}

function heightOf(loaded: LoadedDex): number {
	return Math.max(0, ...childrenOf(loaded).map(child => heightOf(child) + 1));
}

const dataSizes = new WeakMap<DexLayer, number>();

export const megabytes = (bytes: number) => (
	bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(/\.0$/, '')} MB`
);

export function dataSize(loaded: LoadedDex) {
	let size = dataSizes.get(loaded.data);
	if (size === undefined) dataSizes.set(loaded.data, size = Buffer.byteLength(json(loaded.data)));
	return size;
}

function ownedDexes(account: string) {
	return [...currentDexes().values()].filter(loaded => loaded.row.ownerid === account && !loaded.row.official);
}

export function dataUsed(account: string, except?: ID) {
	return ownedDexes(account).filter(loaded => loaded.row.dexid !== except)
		.reduce((total, loaded) => total + dataSize(loaded), 0);
}

export function spritesUsed(account: string, adding?: { sha: string, bytes: number }) {
	const sizes = new Map<string, number>();
	for (const loaded of ownedDexes(account)) {
		for (const image of loaded.uploads.values()) sizes.set(image.sha, image.bytes);
	}
	if (adding) sizes.set(adding.sha, adding.bytes);
	return [...sizes.values()].reduce((total, bytes) => total + bytes, 0);
}

export function load() {
	return (loading ||= (async () => {
		if (!Config.usepostgres) return;
		const rows = await database().query<DexRow>(SQL`SELECT * FROM dexes`);
		for (const row of rows) await refresh(row.dexid);
		setInterval(() => {
			if (registeredOn !== Dex) reregister();
		}, 5 * 1000).unref();
	})());
}

function reregister() {
	const ordered = [...currentDexes().values()].sort((a, b) => depthOf(a) - depthOf(b));
	for (const loaded of [...ordered].reverse()) releaseDex(loaded.dex);
	bases.clear();
	for (const loaded of ordered) {
		loaded.dex = buildDex(loaded.data, Dex);
		register(loaded);
	}
	registeredOn = Dex;
}

function formatData(loaded: LoadedDex, data: FormatData, formatid: ID): FormatData {
	return {
		...data, id: formatid, name: `[${loaded.row.name}] ${data.name}`, searchShow: false, challengeShow: true, tournamentShow: true,
	};
}

function register(loaded: LoadedDex) {
	for (const [formatid, data] of loaded.formats) {
		Dex.formats.rulesetCache.set(formatid, buildFormat(loaded.dex, formatData(loaded, data, formatid)));
		formatDexes.set(formatid, loaded.row.dexid);
	}
}

function unregister(loaded: LoadedDex) {
	for (const formatid of loaded.formats.keys()) {
		Dex.formats.rulesetCache.delete(formatid);
		formatDexes.delete(formatid);
	}
	releaseDex(loaded.dex);
}

const noEffects = (): Effects => ({
	Moves: new Map(), Abilities: new Map(), Items: new Map(), Conditions: new Map(), TypeChart: new Map(),
});

function compile(row: DexRow, entries: Map<ID, SpeciesEntry>, effects: Effects, stale?: string[]): DexLayer {
	const base = baseOf(row);
	const problems = stale || [];
	const fail = (message: string, drop: () => void) => {
		if (!stale) throw new Chat.ErrorMessage(message);
		problems.push(message);
		drop();
	};
	const sorted = <T>(map: Map<ID, T>) => [...map].sort(([a], [b]) => a.localeCompare(b));
	const custom = sorted(entries).map(([id]) => id).filter(id => !base.data.Pokedex[id]);
	const resolved = resolveEntries(base, sorted(entries).map(([, entry]) => entry));
	const TypeChart = resolveTypes(base, sorted(effects.TypeChart).map(([, entry]) => entry));
	const lookup = lookupTables(base, resolved.Pokedex, effects);
	const edits: NonNullable<DexLayer['effects']> = {};
	for (const table of EFFECT_TABLES) {
		for (const [id, entry] of sorted(effects[table])) {
			(edits[table] ||= {})[id] = resolveEdits(base, entry, lookup, problems);
		}
	}
	for (const entry of effects.Items.values()) {
		for (const mega of Object.values(entry.data.megaStone || {})) {
			const species: AnyObject | undefined = resolved.Pokedex[toID(mega)];
			if (species && !species.requiredItem) species.requiredItem = entry.data.name;
		}
	}
	const exists = (name: string) => !!(resolved.Pokedex[toID(name)] || base.data.Pokedex[toID(name)]);
	const drop = (id: string) => () => {
		delete resolved.Pokedex[id];
		delete resolved.Learnsets[id];
		delete resolved.FormatsData[id];
		if (custom.includes(id as ID)) custom.splice(custom.indexOf(id as ID), 1);
	};
	for (let dropped = true; dropped;) {
		dropped = false;
		for (const [id, species] of Object.entries(resolved.Pokedex)) {
			const missing = species.types?.find(type => type !== '???' && !TypeChart[toID(type)] &&
				!base.data.TypeChart[toID(type)] && !base.data.Pokedex[id]?.types.includes(type));
			const baseSpecies = species.baseSpecies || '';
			if (!species.types) {
				fail(`${species.name || id} no longer has what a Pokemon needs.`, drop(id));
			} else if (missing) {
				fail(`${species.name} is ${missing} type, which isn't in this dex.`, drop(id));
			} else if (baseSpecies && !exists(baseSpecies)) {
				fail(`${species.name} is a forme of ${baseSpecies}, which isn't in this dex.`, drop(id));
			} else {
				continue;
			}
			dropped = true;
		}
	}
	for (const species of Object.values(resolved.Pokedex) as AnyObject[]) {
		if (species.otherFormes) species.otherFormes = species.otherFormes.filter(exists);
		if (species.formeOrder) species.formeOrder = species.formeOrder.filter(exists);
	}
	for (const [id, edit] of Object.entries(edits.Moves || {})) {
		const type = edit.data.type;
		if (type && type !== '???' && !TypeChart[toID(type)] && !base.data.TypeChart[toID(type)]) {
			fail(`${edit.data.name || 'A move'} is ${type} type, which isn't in this dex.`, () => delete edits.Moves![id]);
		}
	}
	const parents = parentLayers(row).map(parent => parent.data);
	const species = parents.length ? [...new Set([
		...parents.flatMap(parent => parent.species).filter(id => !row.removed.includes(id as ID)), ...row.species, ...custom,
	])] : [...row.species, ...custom];
	const lists: NonNullable<DexLayer['lists']> = {};
	for (const table of LIST_TABLES) {
		const inherited = parents.map(parent => parent.lists?.[table] || { added: [], removed: [] });
		const added = new Set(inherited.flatMap(list => list.added));
		const removed = new Set(inherited.length ? inherited[0].removed.filter(id => inherited.every(list => list.removed.includes(id))) : []);
		for (const id of row.effectlists?.[table]?.removed || []) {
			removed.add(id);
			added.delete(id);
		}
		for (const id of row.effectlists?.[table]?.added || []) {
			added.add(id);
			removed.delete(id);
		}
		if (added.size || removed.size) lists[table] = { added: [...added].sort(), removed: [...removed].sort() };
	}
	const content = {
		mod: row.mod, ...(parents.length ? { parents: parents.map(parent => parent.hash) } : {}), species, ...resolved,
		...(Object.keys(TypeChart).length ? { TypeChart } : {}),
		...(Object.keys(edits).length ? { effects: edits } : {}),
		...(Object.keys(lists).length ? { lists } : {}),
	};
	const speciesSprites = sorted(entries).map(([, entry]) => [entry.speciesid, entry.sprites]);
	const itemSprites = sorted(effects.Items).map(([, entry]) => entry).filter(entry => entry.sprites.item)
		.map(entry => [entry.effectid, entry.sprites]);
	const typeSprites = sorted(effects.TypeChart).map(([, entry]) => entry).filter(entry => entry.sprites.type)
		.map(entry => [entry.effectid, entry.sprites]);
	const hashed = typeSprites.length ? [content, speciesSprites, itemSprites, typeSprites] :
		itemSprites.length ? [content, speciesSprites, itemSprites] : [content, speciesSprites];
	const hash = crypto.createHash('sha256').update(json(hashed)).digest('hex').slice(0, 20);
	const data = { hash, ...content };
	const size = Buffer.byteLength(json(data));
	const old = currentDexes().get(row.dexid);
	if (!row.official && mutations.getStore() && (!old || size > dataSize(old))) {
		const used = dataUsed(row.ownerid, row.dexid) + size;
		if (used > MAX_DATA_STORAGE) {
			throw new Chat.ErrorMessage(`That would use ${megabytes(used)} of ${row.ownername}'s ${megabytes(MAX_DATA_STORAGE)} dex data storage. Remove dexes or edits they don't need first.`);
		}
	}
	return data;
}

function check(data: DexLayer) {
	let built: ModdedDex;
	try {
		built = buildDex(data, Dex);
	} catch (e: any) {
		throw new Chat.ErrorMessage(`That doesn't work: ${e.message}`);
	}
	try {
		checkEvolutions(built);
	} finally {
		releaseDex(built);
	}
}

export function checkEvolutions(dex: ModdedDex) {
	const children = new Map<ID, Set<ID>>();
	const link = (from: string | undefined, to: string) => {
		if (!from) return;
		if (!children.has(toID(from))) children.set(toID(from), new Set());
		children.get(toID(from))!.add(toID(to));
	};
	for (const id in dex.data.Pokedex) {
		const species: AnyObject = dex.data.Pokedex[id];
		link(species.prevo, id);
		for (const evo of species.evos || []) link(id, evo);
	}
	const done = new Set<ID>();
	const visit = (path: ID[]) => {
		for (const next of children.get(path[path.length - 1]) || []) {
			if (path.includes(next)) {
				const names = path.slice(path.indexOf(next)).map(id => (dex.data.Pokedex[id] as AnyObject | undefined)?.name || id);
				throw new Chat.ErrorMessage(names.length === 1 ? `${names[0]} can't evolve into itself.` :
					`${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} evolve into each other in a loop.`);
			}
			if (!done.has(next)) visit([...path, next]);
		}
		done.add(path[path.length - 1]);
	};
	for (const id of children.keys()) {
		if (!done.has(id)) visit([id]);
	}
}

function make(
	row: DexRow, editors: Map<string, string>, entries: Map<ID, SpeciesEntry>, formats: Map<ID, FormatData>,
	effects: Effects, uploads: Map<string, sprites.Upload>
) {
	const stale: string[] = [];
	const data = compile(row, entries, effects, stale);
	check(data);
	return { row, editors, entries, formats, effects, uploads, stale, data, dex: buildDex(data, Dex) };
}

export function refresh(dexid: ID): Promise<LoadedDex | null> {
	const next = (refreshing.get(dexid) || Promise.resolve(null)).catch(() => null).then(async () => {
		const loaded = await reload(dexid);
		for (const child of [...currentDexes().values()].filter(other => other.row.parents.includes(dexid))) {
			await refresh(child.row.dexid);
		}
		return loaded;
	});
	refreshing.set(dexid, next);
	return next;
}

async function reload(dexid: ID) {
	const [[row], editors, entries, formats, effectRows] = await Promise.all([
		database().query<DexRow>(SQL`SELECT * FROM dexes WHERE dexid = ${dexid}`),
		database().query<{ accountid: string, name: string }>(SQL`SELECT * FROM dex_editors WHERE dexid = ${dexid}`),
		database().query<SpeciesEntry>(SQL`SELECT * FROM dex_species WHERE dexid = ${dexid}`),
		database().query<{ formatid: ID, data: FormatData }>(SQL`SELECT * FROM dex_formats WHERE dexid = ${dexid}`),
		database().query<EffectEntry>(SQL`SELECT * FROM dex_effects WHERE dexid = ${dexid}`),
	]);
	for (const parent of row?.parents || []) {
		if (!currentDexes().has(parent)) await refresh(parent);
	}
	const effects = noEffects();
	for (const entry of effectRows) effects[entry.effecttable]?.set(entry.effectid, entry);
	const uploads = await sprites.getUploads(database(), [...new Set(
		[...entries, ...effectRows].flatMap(entry => Object.values(entry.sprites))
	)]);
	if (registeredOn !== Dex) reregister();
	const loaded = row ? make(
		{ ...row, created: Number(row.created), updated: Number(row.updated) },
		new Map(editors.map(editor => [editor.accountid, editor.name])),
		new Map(entries.map(entry => [entry.speciesid, entry])),
		new Map(formats.map(format => [format.formatid, format.data])),
		effects, uploads,
	) : null;
	const old = currentDexes().get(dexid);
	if (old) {
		if (mutations.getStore()) releaseDex(old.dex);
		else unregister(old);
	}
	if (loaded) {
		currentDexes().set(dexid, loaded);
		if (!mutations.getStore()) register(loaded);
		if (loaded.row.official) {
			const active = mutations.getStore();
			if (active) active.snapshots.push(loaded);
			else void saveSnapshots(loaded).catch(err => Monitor.crashlog(err, 'A dex snapshot'));
		}
	} else {
		currentDexes().delete(dexid);
	}
	pruneBases();
	return loaded;
}

export function findDex(name: string) {
	const id = toID(name);
	return currentDexes().get(id) || [...currentDexes().values()].find(loaded => toID(loaded.row.name) === id);
}

export function getDex(name: string) {
	const loaded = findDex(name);
	if (!loaded) throw new Chat.ErrorMessage(`There's no dex called "${name}".`);
	return loaded;
}

const formatDetailsCache = new Map<string, AnyObject>();

function unbuildableForme(species: Species) {
	if (species.forme.includes('Totem')) return true;
	if (species.baseSpecies === 'Ogerpon' && species.forme.includes('Tera')) return true;
	return !!species.battleOnly && !species.requiredItem && !species.requiredItems;
}

export function formatDetails(formatid: string, draft?: AnyObject) {
	const id = toID(formatid);
	const loaded = currentDexes().get(formatDexes.get(id)!);
	const saved = loaded?.formats.get(id);
	if (!loaded || !saved) return null;
	const data = draft ? validateFormat(loaded, { name: saved.name, ...draft }, saved) : saved;
	const key = `${loaded.data.hash}:${loaded.row.name}:${json(data)}`;
	if (formatDetailsCache.get(id)?.key === key) return formatDetailsCache.get(id)!.details;
	const validator = new TeamValidator(draft ? buildFormat(loaded.dex, formatData(loaded, data, id)) : Dex.formats.get(id));
	const { dex, ruleTable } = validator;
	const inDex = new Set(loaded.data.species);
	const legal: { [kind: string]: ID[] } = { pokemon: [], move: [], ability: [], item: [] };
	const banned: { [kind: string]: ID[] } = { pokemon: [], move: [], ability: [], item: [] };
	const outright: ID[] = [];
	const existence = ['past', 'future', 'lgpe', 'legends', 'unobtainable', 'cap', 'custom', 'nonexistent'];
	const tagBanned = (species: Species) => {
		for (const [type, match] of ruleTable.tagRules) {
			if (type === '*' || !ruleTable.matchesTagRule(match, species)) continue;
			if (type === '-') return !existence.includes(match as string);
			break;
		}
		return ruleTable.has('-tag:allpokemon');
	};
	const isBanned = (kind: string, effect: { id: ID, isNonstandard?: string | null }) =>
		!effect.isNonstandard || ruleTable.has(`-${kind}:${effect.id}`);
	const set = {
		name: 'Set', species: 'Pikachu', moves: [], ability: '', item: '', evs: {}, ivs: {}, level: 100, nature: '',
	} as unknown as PokemonSet;
	for (const species of dex.species.all()) {
		if (!species.exists || species.isCosmeticForme || unbuildableForme(species)) continue;
		if (!inDex.has(species.id)) continue;
		set.name = set.species = species.name;
		if (!validator.checkSpecies(set, species, species, {})) {
			legal.pokemon.push(species.id);
			continue;
		}
		banned.pokemon.push(species.id);
		if (ruleTable.has(`-pokemon:${species.id}`) || ruleTable.has(`-basepokemon:${toID(species.baseSpecies)}`) ||
			!tagBanned(species)) {
			outright.push(species.id);
		}
	}
	set.name = 'Set';
	set.species = 'Pikachu';
	for (const move of dex.moves.all()) {
		if (!move.exists || legal.move.includes(move.id) || banned.move.includes(move.id)) continue;
		if (!validator.checkMove(set, move, {})) legal.move.push(move.id);
		else if (isBanned('move', move)) banned.move.push(move.id);
	}
	for (const ability of dex.abilities.all()) {
		if (!ability.exists) continue;
		if (!validator.checkAbility(set, ability, {})) legal.ability.push(ability.id);
		else if (isBanned('ability', ability)) banned.ability.push(ability.id);
	}
	for (const item of dex.items.all()) {
		if (!item.exists || !item.id) continue;
		if (!validator.checkItem(set, item, {})) legal.item.push(item.id);
		else if (isBanned('item', item)) banned.item.push(item.id);
	}
	const bans: {
		tags: { [tagid: string]: { state: string, source?: string } },
		other: { name: string, state: string, desc?: string, source?: string }[],
	} = { tags: {}, other: [] };
	const titleCase = (text: string) => text.replace(/(?:^|[\s-])[a-z]/g, match => match.toUpperCase());
	for (const [rule, source] of ruleTable) {
		if (!/^[-+*]/.test(rule)) continue;
		const body = rule.slice(1);
		if (/^(?:base)?(?:pokemon|move|ability|item):/.test(body)) continue;
		const state = rule.startsWith('-') ? 'banned' : rule.startsWith('*') ? 'restricted' : 'unbanned';
		if (body.startsWith('tag:') || body === 'nonexistent') {
			bans.tags[body.startsWith('tag:') ? body.slice(4) : body] = { state, ...source ? { source } : {} };
		} else {
			const [kind, name] = body.includes(':') ? Utils.splitFirst(body, ':') : ['', body];
			const rule = kind ? null : dex.formats.get(name);
			const label = kind ? `${titleCase(kind)}: ${titleCase(name)}` : rule?.exists ? rule.name : titleCase(name);
			bans.other.push({ name: label, state, ...rule?.desc ? { desc: rule.desc } : {}, ...source ? { source } : {} });
		}
	}
	const details = {
		id, name: data.name, dex: loaded.row.name, dexid: loaded.row.dexid, mod: loaded.row.mod,
		gameType: data.gameType || 'singles', ruleset: data.ruleset || [],
		banlist: data.banlist || [], unbanlist: data.unbanlist || [], restricted: data.restricted || [],
		tiers: (data as AnyObject).tiers || {},
		rules: [...ruleTable.keys()].filter(rule => !/^[-+*!]/.test(rule) && !rule.includes(':')),
		sources: Object.fromEntries([...ruleTable].filter(([rule, source]) => source && !/^[-+*!]/.test(rule) && !rule.includes(':'))),
		bans, legal, banned, outright,
	};
	if (!draft) formatDetailsCache.set(id, { key, details });
	return details;
}

const formatRulesCache = new Map<string, AnyObject>();

export function formatRules(name: string) {
	const formatid = toID(name);
	const loaded = currentDexes().get(formatDexes.get(formatid)!);
	if (!loaded?.formats.has(formatid)) return null;
	const key = `${loaded.data.hash}:${formatid}`;
	if (formatRulesCache.get(formatid)?.key === key) return formatRulesCache.get(formatid)!.rules;
	const dex = Dex.forFormat(Dex.formats.get(formatid));
	const rulesets = [];
	for (const ruleid in dex.data.Rulesets) {
		if (['dexpokemon', 'dexsnapshot'].includes(ruleid)) continue;
		const rule = dex.formats.get(ruleid);
		if (!rule.exists || rule.effectType === 'Format' || rule.hasValue) continue;
		const children = (rule.ruleset || []).filter(spec => !/^[-+*!^]/.test(spec) && !spec.includes('='))
			.map(spec => toID(spec)).filter(id => id !== rule.id);
		rulesets.push({
			id: rule.id, name: rule.name, ...rule.desc ? { desc: rule.desc } : {}, ...children.length ? { children } : {},
		});
	}
	const tags = [];
	const tagText = Dex.loadTextData().Tags;
	for (const tagid in Tags) {
		if (!Dex.formats.validTag(tagid as ID)) continue;
		const tag = Tags[tagid as Lowercase<string>];
		const filter = String(tag.speciesFilter || '');
		const tier = filter.includes('natDexTier') ? `National Dex ${tag.name.replace(/^ND /, '')}` :
			/(?:doublesTier|\.tier)\b/.test(filter) ? tag.name : '';
		const desc = tagText[tagid]?.desc || (tier ? `Pok&eacute;mon in the ${tier} tier.` : '');
		tags.push({
			id: tagid, name: tag.name, kind: tag.speciesFilter ? 'pokemon' : tag.moveFilter ? 'move' : 'other', ...desc ? { desc } : {},
		});
	}
	const rules = { rulesets: Utils.sortBy(rulesets, rule => rule.name), tags: Utils.sortBy(tags, tag => [tag.kind, tag.name]) };
	formatRulesCache.set(formatid, { key, rules });
	return rules;
}

export function battleData(formatid: string) {
	const loaded = currentDexes().get(formatDexes.get(toID(formatid))!);
	const data = loaded?.formats.get(toID(formatid));
	if (!loaded || !data) return undefined;
	for (const layer of ancestorsOf(loaded)) saveLayer(layer);
	return { hash: loaded.data.hash, format: formatData(loaded, data, toID(formatid)) };
}

function saveLayer(loaded: LoadedDex) {
	const { data } = loaded;
	if (savedLayers.has(data.hash)) return;
	const path = FS(`${Config.dexdatapath || 'dex-data'}/${data.hash}.json`);
	if (!path.existsSync()) {
		path.parentDir().mkdirpSync();
		path.writeSync(json(data));
	}
	savedLayers.add(data.hash);
	void database().query(SQL`INSERT INTO dex_layers (hash, dexid, data, created) VALUES (
		${data.hash}, ${loaded.row.dexid}, ${json(data)}, ${Date.now()}
	) ON CONFLICT (hash) DO NOTHING`).catch(err => Monitor.crashlog(err, 'Saving a dex version'));
}

export function usedSprites(loaded: LoadedDex, entrySprites: { [kind: string]: string }) {
	return Object.fromEntries(Object.entries(entrySprites).filter(([, uploadid]) => loaded.uploads.has(uploadid)));
}

function engineData(mod: string) {
	const engine = Dex.mod(mod).includeData();
	let official = engine;
	while (!/^(gen\d|base)$/.test(official.currentMod)) official = Dex.mod(official.parentMod);
	const tables: { [table: string]: AnyObject } = {};
	for (const table of ['Moves', 'Abilities', 'Items', 'TypeChart'] as const) {
		for (const [id, entry] of Object.entries(engine.data[table])) {
			const effect = json(entry);
			if (effect !== json(official.data[table][id])) (tables[table] ||= {})[id] = JSON.parse(effect);
		}
	}
	return tables;
}

export function clientData(loaded: LoadedDex) {
	const speciesSprites: { [speciesid: string]: { [kind: string]: string } } = {};
	const images: { [uploadid: string]: AnyObject } = {};
	for (const image of loaded.uploads.values()) {
		images[image.uploadid] = {
			file: `${image.sha}.${image.format}`, width: image.width, height: image.height,
			uploader: image.uploadername, dex: image.dexname, ...(image.artist ? { artist: image.artist } : {}), ...image.display, pixelated: true,
		};
	}
	const origins: { [speciesid: string]: string } = {};
	for (const entry of loaded.entries.values()) {
		if (entry.origin) origins[entry.speciesid] = entry.origin.dex;
		for (const [key, uploadid] of Object.entries(usedSprites(loaded, entry.sprites))) {
			const [speciesid, kind] = key.includes(':') ? key.split(':') : [entry.speciesid, key];
			(speciesSprites[speciesid] ||= {})[kind] = uploadid;
		}
	}
	const { hash, mod, parents, species, Pokedex, Learnsets, FormatsData } = loaded.data;
	const { TypeChart: engineTypes, ...effects } = engineData(mod);
	const TypeChart = engineTypes || loaded.data.TypeChart ? { ...engineTypes, ...loaded.data.TypeChart } : undefined;
	const itemSprites: { [itemid: string]: string } = {};
	for (const table of EFFECT_TABLES) {
		for (const [id, entry] of loaded.effects[table]) {
			const effect = JSON.parse(json(loaded.dex.data[table][id]));
			const edit = loaded.data.effects![table]![id];
			(effects[table] ||= {})[id] = { ...effect, ...describeText(baseOf(loaded.row), table, edit, id) };
			const uploadid = usedSprites(loaded, entry.sprites).item;
			if (uploadid) itemSprites[id] = uploadid;
		}
	}
	const typeSprites: { [typeid: string]: string } = {};
	for (const [id, entry] of loaded.effects.TypeChart) {
		const uploadid = usedSprites(loaded, entry.sprites).type;
		if (uploadid) typeSprites[id] = uploadid;
	}
	return {
		hash, dexid: loaded.row.dexid, name: loaded.row.name, mod, ...(parents ? { parents } : {}), species,
		Pokedex, Learnsets, FormatsData,
		sprites: speciesSprites, ...effects, ...(TypeChart ? { TypeChart } : {}),
		...(Object.keys(itemSprites).length ? { itemSprites } : {}),
		...(Object.keys(typeSprites).length ? { typeSprites } : {}),
		...(Object.keys(images).length ? { images } : {}),
		...(Object.keys(origins).length ? { origins } : {}),
	};
}

export function saveSnapshot(formatid: string) {
	return saveSnapshots(currentDexes().get(formatDexes.get(toID(formatid))!));
}

async function saveSnapshots(used?: LoadedDex) {
	for (const loaded of used ? ancestorsOf(used) : []) {
		if (savedSnapshots.has(loaded.data.hash)) continue;
		const data = clientData(loaded);
		await database().query(SQL`INSERT INTO dex_snapshots (hash, dexid, data, created) VALUES (
			${data.hash}, ${data.dexid}, ${json(data)}, ${Date.now()}
		) ON CONFLICT (hash) DO NOTHING`);
		await writeSnapshot(data.hash, data);
		savedSnapshots.add(data.hash);
	}
}

async function writeSnapshot(hash: string, data: AnyObject, folder = Config.dexsnapshotpath || 'dex-snapshots') {
	const path = FS(`${folder}/${hash}.json`);
	if (path.existsSync()) return false;
	await path.parentDir().mkdirp();
	await path.write(json(data));
	return true;
}

export async function rebuildFiles() {
	let written = 0;
	const hashes = await database().query<{ hash: string }>(SQL`SELECT hash FROM dex_snapshots`);
	for (const { hash } of hashes) {
		const row = await database().queryOne<{ data: AnyObject }>(SQL`SELECT data FROM dex_snapshots WHERE hash = ${hash}`);
		if (row && await writeSnapshot(hash, row.data)) written++;
	}
	const layers = await database().query<{ hash: string }>(SQL`SELECT hash FROM dex_layers`);
	for (const { hash } of layers) {
		const row = await database().queryOne<{ data: AnyObject }>(SQL`SELECT data FROM dex_layers WHERE hash = ${hash}`);
		if (row && await writeSnapshot(hash, row.data, Config.dexdatapath || 'dex-data')) written++;
	}
	return { snapshots: hashes.length + layers.length, written, sprites: await sprites.rebuild(database()) };
}

export async function accountOf(user: User) {
	if (!user.registered) throw new Chat.ErrorMessage(`Log in with your Discord account to make or edit dexes.`);
	let account = accounts.get(user.id);
	if (!account) {
		const [result] = await LoginServer.request('discord/names', { userid: user.id });
		if (!result?.discordid) throw new Chat.ErrorMessage(`Dexes belong to Discord accounts, and yours isn't linked.`);
		account = `${result.discordid}`;
		accounts.set(user.id, account);
	}
	return account;
}

export function setAccount(userid: ID, account: string) {
	accounts.set(userid, account);
}

export function listed(loaded: LoadedDex, account: string | null) {
	return loaded.row.visibility === 'public' ||
		(!!account && (loaded.row.ownerid === account || loaded.editors.has(account)));
}

export function search(text: string, account: string | null) {
	const query = toID(text);
	return [...currentDexes().values()].filter(loaded => listed(loaded, account) && toID(loaded.row.name).includes(query));
}

async function setVisibilityImpl(loaded: LoadedDex, visibility: string) {
	if (!VISIBILITIES.includes(visibility)) {
		throw new Chat.ErrorMessage(`A dex can be ${VISIBILITIES.join(' or ')}.`);
	}
	await database().query(SQL`UPDATE dexes SET visibility = ${visibility} WHERE dexid = ${loaded.row.dexid}`);
	return save(loaded);
}

export async function editable(user: User, name: string) {
	const loaded = getDex(name);
	const account = await accountOf(user);
	if (loaded.row.ownerid !== account && !loaded.editors.has(account) && !user.can('bypassall')) {
		throw new Chat.ErrorMessage(`You can't edit ${loaded.row.name}.`);
	}
	return loaded;
}

function checkName(input: string, loaded?: LoadedDex) {
	const name = validateName(input, 'dex');
	if (toID(name).length > 20) throw new Chat.ErrorMessage(`Dex names can be at most 20 letters and numbers long.`);
	const other = findDex(name);
	if (other && other !== loaded) throw new Chat.ErrorMessage(`There's already a dex called ${other.row.name}.`);
	if (Dex.dexes[toID(name)]) throw new Chat.ErrorMessage(`"${name}" is the name of a mod, so a dex can't use it.`);
	return name;
}

function resolveBase(on: string, engine?: string, height = 0) {
	const parts = on.split('+').map(part => part.trim());
	const parents = parts.length > 1 || findDex(on) ? parts.map(getDex) : [];
	const modid = toID(engine) || (parents.length ? parents[0].row.mod : toID(on));
	const base = Dex.dexes[modid];
	if (!base || isBuiltDex(modid)) {
		throw new Chat.ErrorMessage(engine ? `"${engine}" isn't a mod a dex can run on.` :
			`"${on}" isn't a world. Try gen9, another mod's id, a dex's name, or dex names joined with +.`);
	}
	const otherGen = parents.find(parent => parent.dex.gen !== base.includeData().gen);
	if (otherGen) throw new Chat.ErrorMessage(`${otherGen.row.name} is a different generation from ${modid}.`);
	if (new Set(parents).size < parents.length) throw new Chat.ErrorMessage(`That has the same dex twice.`);
	if (parents.length > MAX_PARENTS) throw new Chat.ErrorMessage(`A world can join at most ${MAX_PARENTS} dexes.`);
	if (parents.some(parent => depthOf(parent) + 1 + height >= MAX_DEPTH)) {
		throw new Chat.ErrorMessage(`Dexes can only be each other's worlds ${MAX_DEPTH} deep.`);
	}
	const species = parents.length ? [] : standardSpecies(base);
	return { parents, modid, base, species };
}

function standardSpecies(base: ModdedDex) {
	return base.includeData().species.all().filter(entry => entry.exists && !entry.isNonstandard).map(entry => entry.id);
}

export function worldSpecies(loaded: LoadedDex) {
	const parents = parentsOf(loaded);
	return parents.length ? [...new Set(parents.flatMap(parent => parent.data.species))] : standardSpecies(Dex.mod(loaded.row.mod));
}

async function createDexImpl(user: User, name: string, on: string, engine?: string) {
	name = checkName(name);
	const { parents, modid, species } = resolveBase(on, engine);
	const account = await accountOf(user);
	const dexid = newID('d', id => !!findDex(id) || !!Dex.dexes[id]);
	const now = Date.now();
	await database().query(SQL`INSERT INTO dexes
		(dexid, ownerid, ownername, name, mod, species, removed, parents, official, visibility, created, updated)
		VALUES (
		${dexid}, ${account}, ${user.name}, ${name}, ${modid}, ${json(species)},
		'[]', ${json(parents.map(parent => parent.row.dexid))}, 'false', 'public', ${now}, ${now}
	)`);
	let loaded = (await refresh(dexid))!;
	if (parents.length === 1) {
		for (const data of parents[0].formats.values()) {
			try {
				({ loaded } = await putFormat(loaded, data));
			} catch {}
		}
	}
	return loaded;
}

async function setNameImpl(loaded: LoadedDex, name: string) {
	name = checkName(name, loaded);
	await database().query(SQL`UPDATE dexes SET name = ${name} WHERE dexid = ${loaded.row.dexid}`);
	return save(loaded);
}

async function setBaseImpl(loaded: LoadedDex, on: string, engine?: string) {
	const { parents, modid, base, species } = resolveBase(on, engine, heightOf(loaded));
	if (parents.some(parent => ancestorsOf(parent).includes(loaded))) {
		throw new Chat.ErrorMessage(`A dex can't be in its own world, or in the world of a dex in its world.`);
	}
	const children = childrenOf(loaded);
	if (children.length && base.includeData().gen !== loaded.dex.gen) {
		throw new Chat.ErrorMessage(`${Chat.count(children, 'dexes are', 'dex is')} set in ${loaded.row.name}, so it has to stay Gen ${loaded.dex.gen}.`);
	}
	const row = { ...loaded.row, mod: modid, parents: parents.map(parent => parent.row.dexid), species, removed: [] };
	const stale: string[] = [];
	check(compile(row, loaded.entries, loaded.effects, stale));
	await database().query(SQL`UPDATE dexes SET mod = ${modid}, parents = ${json(row.parents)}, species = ${json(species)},
		removed = '[]' WHERE dexid = ${loaded.row.dexid}`);
	return { loaded: await save(loaded), stale };
}

async function setDescriptionImpl(loaded: LoadedDex, description: string) {
	if (!loaded.row.official && description.length > MAX_DESCRIPTION) {
		throw new Chat.ErrorMessage(`A description can be at most ${MAX_DESCRIPTION} characters.`);
	}
	await database().query(SQL`UPDATE dexes SET description = ${description.trim()} WHERE dexid = ${loaded.row.dexid}`);
	return save(loaded);
}

async function setEditorImpl(loaded: LoadedDex, name: string, add: boolean) {
	const [result] = await LoginServer.request('discord/names', { userid: toID(name) });
	if (!result?.discordid) throw new Chat.ErrorMessage(`${name} hasn't logged in with Discord, so they can't edit dexes.`);
	const account = `${result.discordid}`;
	if (account === loaded.row.ownerid) throw new Chat.ErrorMessage(`${name} owns ${loaded.row.name}.`);
	if (!add) {
		if (!loaded.editors.has(account)) throw new Chat.ErrorMessage(`${name} isn't an editor of ${loaded.row.name}.`);
		await database().query(SQL`DELETE FROM dex_editors WHERE dexid = ${loaded.row.dexid} AND accountid = ${account}`);
		return save(loaded);
	}
	if (!loaded.row.official && !loaded.editors.has(account) && loaded.editors.size >= MAX_EDITORS) {
		throw new Chat.ErrorMessage(`A dex can have at most ${MAX_EDITORS} editors.`);
	}
	await database().query(SQL`INSERT INTO dex_editors (dexid, accountid, name, added) VALUES (
		${loaded.row.dexid}, ${account}, ${Users.get(name)?.name || name.trim()}, ${Date.now()}
	) ON CONFLICT (dexid, accountid) DO UPDATE SET name = EXCLUDED.name`);
	return save(loaded);
}

async function setOfficialImpl(loaded: LoadedDex, official: boolean) {
	await database().query(SQL`UPDATE dexes SET official = ${json(official)} WHERE dexid = ${loaded.row.dexid}`);
	return save(loaded);
}

async function deleteDexImpl(loaded: LoadedDex) {
	const dexid = loaded.row.dexid;
	const children = childrenOf(loaded);
	if (children.length) {
		throw new Chat.ErrorMessage(`${Chat.count(children, 'dexes are', 'dex is')} set in ${loaded.row.name}, so it can't be deleted.`);
	}
	await database().query(SQL`DELETE FROM dexes WHERE dexid = ${dexid}`);
	await refresh(dexid);
	await unfollow(dexid);
}

async function clearDexImpl(loaded: LoadedDex) {
	const dexid = loaded.row.dexid;
	const species = parentsOf(loaded).length ? [] : standardSpecies(Dex.mod(loaded.row.mod));
	await database().query(SQL`DELETE FROM dex_species WHERE dexid = ${dexid}`);
	await database().query(SQL`DELETE FROM dex_effects WHERE dexid = ${dexid}`);
	await database().query(SQL`UPDATE dexes SET species = ${json(species)}, removed = '[]', effectlists = '{}' WHERE dexid = ${dexid}`);
	const updated = await save(loaded);
	await unfollow(dexid);
	return updated;
}

async function unfollow(dexid: ID) {
	const frozen = [
		...await database().query<{ dexid: ID }>(SQL`UPDATE dex_species SET trackdex = NULL, trackid = NULL
			WHERE trackdex = ${dexid} RETURNING dexid`),
		...await database().query<{ dexid: ID }>(SQL`UPDATE dex_effects SET trackdex = NULL, trackid = NULL
			WHERE trackdex = ${dexid} RETURNING dexid`),
	];
	for (const other of new Set(frozen.map(row => row.dexid))) await refresh(other);
}

async function writeEntry(dexid: ID, table: Table, entry: Entry) {
	const now = Date.now();
	if (table === 'Pokedex') {
		const {
			speciesid, num, inheritsfrom, data, learnset, sprites: images, origin, trackdex, trackid,
		} = entry as SpeciesEntry;
		await database().query(SQL`INSERT INTO dex_species
			(dexid, speciesid, num, inheritsfrom, data, learnset, sprites, origin, trackdex, trackid, updated) VALUES (
			${dexid}, ${speciesid}, ${num}, ${inheritsfrom}, ${json(data)}, ${json(learnset)}, ${json(images)},
			${json(origin)}, ${trackdex}, ${trackid}, ${now}
		) ON CONFLICT (dexid, speciesid) DO UPDATE SET num = EXCLUDED.num, inheritsfrom = EXCLUDED.inheritsfrom,
			data = EXCLUDED.data, learnset = EXCLUDED.learnset, sprites = EXCLUDED.sprites, origin = EXCLUDED.origin,
			trackdex = EXCLUDED.trackdex, trackid = EXCLUDED.trackid, updated = EXCLUDED.updated`);
		return;
	}
	const {
		effectid, num, inheritsfrom, data, slots, events, sprites: images, origin, trackdex, trackid,
	} = entry as EffectEntry;
	await database().query(SQL`INSERT INTO dex_effects
		(dexid, effecttable, effectid, num, inheritsfrom, data, slots, events, sprites, origin, trackdex, trackid,
		updated) VALUES (
		${dexid}, ${table}, ${effectid}, ${num}, ${inheritsfrom}, ${json(data)}, ${json(slots)}, ${json(events)},
		${json(images)}, ${json(origin)}, ${trackdex}, ${trackid}, ${now}
	) ON CONFLICT (dexid, effecttable, effectid) DO UPDATE SET num = EXCLUDED.num, inheritsfrom = EXCLUDED.inheritsfrom,
		data = EXCLUDED.data, slots = EXCLUDED.slots, events = EXCLUDED.events, sprites = EXCLUDED.sprites,
		origin = EXCLUDED.origin, trackdex = EXCLUDED.trackdex, trackid = EXCLUDED.trackid, updated = EXCLUDED.updated`);
}

async function saved(loaded: LoadedDex, table: Table, id: ID) {
	const updated = await save(loaded);
	await propagate(loaded.row.dexid, table, id);
	return updated;
}

async function save(loaded: LoadedDex) {
	await database().query(SQL`UPDATE dexes SET updated = ${Date.now()} WHERE dexid = ${loaded.row.dexid}`);
	return (await refresh(loaded.row.dexid))!;
}

export function findSpecies(loaded: LoadedDex, names: string[]) {
	const base = baseOf(loaded.row);
	const shown = new Set([...worldSpecies(loaded), ...loaded.data.species]);
	const ids = new Set<ID>();
	for (const name of names) {
		const species = base.species.get(name);
		if (!species.exists || !base.data.Pokedex[species.id]) {
			throw new Chat.ErrorMessage(`"${name}" isn't a Pokemon in ${baseName(loaded.row)}.`);
		}
		const formes = species.baseSpecies === species.name ? species.formeOrder || [species.name] : [species.name];
		for (const forme of formes) {
			const id = toID(forme);
			if (base.data.Pokedex[id] && (id === species.id || shown.has(id))) ids.add(id);
		}
	}
	return ids;
}

async function setSpeciesImpl(loaded: LoadedDex, ids: Set<ID>, add: boolean) {
	const inherited = new Set(parentsOf(loaded).flatMap(parent => parent.data.species));
	const species = add ?
		[...new Set([...loaded.row.species, ...[...ids].filter(id => !inherited.has(id))])] :
		loaded.row.species.filter(id => !ids.has(id));
	const removed = add ? loaded.row.removed.filter(id => !ids.has(id)) :
		[...new Set([...loaded.row.removed, ...[...ids].filter(id => inherited.has(id))])];
	compile({ ...loaded.row, species, removed }, loaded.entries, loaded.effects);
	await database().query(SQL`UPDATE dexes SET species = ${json(species)}, removed = ${json(removed)}
		WHERE dexid = ${loaded.row.dexid}`);
	return save(loaded);
}

function named<T>(input: unknown, validate: () => T) {
	try {
		return validate();
	} catch (e: any) {
		if (!(e instanceof Chat.ErrorMessage) || !isObject(input) || !input.name) throw e;
		throw new Chat.ErrorMessage(`${input.name}: ${e.message}`);
	}
}

async function putEntriesImpl(loaded: LoadedDex, inputs: unknown[]) {
	if (!inputs.length) throw new Chat.ErrorMessage(`Send at least one Pokemon.`);
	const base = baseOf(loaded.row);
	const entries = new Map(loaded.entries);
	const changed = new Map<ID, SpeciesEntry>();
	for (const input of inputs) {
		if (!isObject(input)) throw new Chat.ErrorMessage(`Each Pokemon needs to be a JSON object, like {"name": "Pikachu"}.`);
		const entry = named(input, () => validateEntry(input, base, entries, loaded.dex));
		if (!entry.num && !base.data.Pokedex[entry.speciesid]) {
			entry.num = newNum('Pokedex', entries.values());
		}
		entries.set(entry.speciesid, entry);
		changed.set(entry.speciesid, entry);
	}
	check(compile(loaded.row, entries, loaded.effects));
	for (const entry of changed.values()) await writeEntry(loaded.row.dexid, 'Pokedex', entry);
	const updated = await save(loaded);
	for (const id of changed.keys()) await propagate(loaded.row.dexid, 'Pokedex', id);
	return { loaded: currentDexes().get(updated.row.dexid) || updated, entries: [...changed.values()] };
}

async function putEntryImpl(loaded: LoadedDex, input: AnyObject) {
	const { loaded: updated, entries } = await putEntries(loaded, [input]);
	return { loaded: updated, entry: entries[0] };
}

export function getEntry(loaded: LoadedDex, name: string) {
	const entry = loaded.entries.get(toID(name));
	if (!entry) throw new Chat.ErrorMessage(`${loaded.row.name} has no custom or edited Pokemon called "${name}".`);
	return entry;
}

async function deleteEntryImpl(loaded: LoadedDex, names: string[]) {
	const ids = names.map(name => getEntry(loaded, name).speciesid);
	const entries = new Map(loaded.entries);
	for (const id of ids) entries.delete(id);
	check(compile(loaded.row, entries, loaded.effects));
	for (const id of ids) {
		await database().query(SQL`DELETE FROM dex_species
			WHERE dexid = ${loaded.row.dexid} AND speciesid = ${id}`);
	}
	const updated = await save(loaded);
	for (const id of ids) await propagate(loaded.row.dexid, 'Pokedex', id);
	return currentDexes().get(updated.row.dexid) || updated;
}

async function deletePokemonImpl(loaded: LoadedDex, names: string[]) {
	const base = baseOf(loaded.row);
	const ids = new Set<ID>();
	for (const name of names) {
		const id = toID(name);
		if (base.data.Pokedex[id]) {
			for (const each of findSpecies(loaded, [name])) ids.add(each);
		} else if (loaded.entries.has(id)) {
			ids.add(id);
		} else {
			throw new Chat.ErrorMessage(`${loaded.row.name} has no Pokemon called "${name}".`);
		}
	}
	const entries = new Map(loaded.entries);
	const deleted = [...ids].filter(id => entries.delete(id));
	const inherited = new Set(parentsOf(loaded).flatMap(parent => parent.data.species));
	const species = loaded.row.species.filter(id => !ids.has(id));
	const removed = [...new Set([...loaded.row.removed, ...[...ids].filter(id => inherited.has(id))])];
	check(compile({ ...loaded.row, species, removed }, entries, loaded.effects));
	await database().query(SQL`UPDATE dexes SET species = ${json(species)}, removed = ${json(removed)}
		WHERE dexid = ${loaded.row.dexid}`);
	for (const id of deleted) {
		await database().query(SQL`DELETE FROM dex_species WHERE dexid = ${loaded.row.dexid} AND speciesid = ${id}`);
	}
	const updated = await save(loaded);
	for (const id of deleted) await propagate(loaded.row.dexid, 'Pokedex', id);
	return currentDexes().get(updated.row.dexid) || updated;
}

function sourceOf(from: string) {
	const gen = /^gen([1-9])$/.exec(toID(from));
	const source = toID(from) && !gen ? getDex(from) : null;
	if (source && !source.row.official) throw new Chat.ErrorMessage(`Things can only be added from the main games and official dexes.`);
	return { gen: gen ? Number(gen[1]) : 0, source };
}

export function sourceSpecies(loaded: LoadedDex, from: string) {
	const { gen, source } = sourceOf(from);
	if (source) return source.data.species as ID[];
	return gen ? standardSpecies(Dex.mod(`gen${gen}`)) : worldSpecies(loaded);
}

const LIST_GETTERS = { Moves: 'moves', Abilities: 'abilities', Items: 'items' } as const;

export function effectListed(loaded: LoadedDex, table: ListTable, id: ID) {
	const data = loaded.dex.data[table][id] as AnyObject | undefined;
	if (!data || loaded.data.lists?.[table]?.removed.includes(id)) return false;
	return !data.isNonstandard || ancestorsOf(loaded).some(layer => entriesOf(layer, table).has(id));
}

export function sourceIds(loaded: LoadedDex, table: 'Pokedex' | ListTable, from: string) {
	if (table === 'Pokedex') return sourceSpecies(loaded, from);
	const { gen, source } = sourceOf(from);
	const playable = (effect: AnyObject) => !effect.isZ && !effect.isMax;
	if (source) return Object.keys(source.dex.data[table]).filter(id => effectListed(source, table, id as ID)) as ID[];
	if (gen) {
		return ([...Dex.mod(`gen${gen}`)[LIST_GETTERS[table]].all()] as AnyObject[])
			.filter(effect => effect.exists && !effect.isNonstandard && playable(effect)).map(effect => effect.id as ID);
	}
	const base = baseOf(loaded.row);
	return Object.keys(base.data[table]).filter(id => playable(base.data[table][id] as AnyObject)) as ID[];
}

async function setListed(loaded: LoadedDex, table: ListTable, ids: ID[]) {
	const base = baseOf(loaded.row);
	const lists = JSON.parse(json(loaded.row.effectlists || {}));
	const list = lists[table] ||= {};
	list.removed = (list.removed || []).filter((id: ID) => !ids.includes(id));
	list.added = [...new Set([...list.added || [], ...ids.filter(id => (base.data[table][id] as AnyObject)?.isNonstandard)])];
	compile({ ...loaded.row, effectlists: lists }, loaded.entries, loaded.effects);
	await database().query(SQL`UPDATE dexes SET effectlists = ${json(lists)} WHERE dexid = ${loaded.row.dexid}`);
	return save(loaded);
}

async function forkAll(loaded: LoadedDex, source: LoadedDex, table: Table, names: string[], skipped: string[]) {
	try {
		const found = new Map<string, Fork>();
		for (const name of names) dependencies(source, table, toID(name), loaded, found);
		return { loaded: (await copyInto(loaded, [...found.values()])).loaded, names };
	} catch (e: any) {
		if (!(e instanceof Chat.ErrorMessage)) throw e;
	}
	const forked: string[] = [];
	for (const name of names) {
		try {
			({ loaded } = await forkEntry(loaded, source, table, name));
			forked.push(name);
		} catch (e: any) {
			if (!(e instanceof Chat.ErrorMessage)) throw e;
			skipped.push(`${name}: ${e.message}`);
		}
	}
	return { loaded, names: forked };
}

async function addEffectsImpl(target: LoadedDex, table: ListTable, from: string, names: string[]) {
	const base = baseOf(target.row);
	const { gen, source } = sourceOf(from);
	const game = gen && gen !== base.gen ? Dex.mod(`gen${gen}`) : null;
	const skipped: string[] = [];
	const listed: ID[] = [];
	const inputs: AnyObject[] = [];
	const forks: string[] = [];
	let loaded = target;
	for (const name of names) {
		const id = toID(name);
		if (effectListed(loaded, table, id)) {
			skipped.push(`${name} is already in ${loaded.row.name}`);
			continue;
		}
		if (source && (ancestorsOf(source).some(layer => entriesOf(layer, table).has(id)) || !base.data[table][id])) {
			forks.push(name);
			continue;
		}
		const original = base.data[table][id] as AnyObject | undefined;
		if (!original) {
			skipped.push(`${name} isn't in ${baseName(loaded.row)}`);
			continue;
		}
		if (game) {
			const effect = game[LIST_GETTERS[table]].get(id) as AnyObject;
			if (!effect.exists || effect.isNonstandard) {
				skipped.push(`${name} isn't in Gen ${game.gen}`);
				continue;
			}
			const fields = table === 'Moves' ? ['type', 'category', 'basePower', 'accuracy', 'pp', 'priority']
				.filter(field => effect[field] !== original[field]) : [];
			if (fields.length) inputs.push({ name: effect.name, ...Object.fromEntries(fields.map(field => [field, effect[field]])) });
		}
		listed.push(id);
	}
	if (source && forks.length) {
		const forked = await forkAll(loaded, source, table, forks, skipped);
		loaded = forked.loaded;
		listed.push(...forked.names.map(toID).filter(id => base.data[table][id]));
	}
	try {
		if (inputs.length) ({ loaded } = await putEffects(loaded, 'Moves', inputs));
	} catch (e: any) {
		if (!(e instanceof Chat.ErrorMessage)) throw e;
		for (const input of inputs) {
			try {
				({ loaded } = await putEffect(loaded, 'Moves', input));
			} catch (err: any) {
				if (!(err instanceof Chat.ErrorMessage)) throw err;
				skipped.push(`${input.name}: ${err.message}`);
			}
		}
	}
	if (listed.length) loaded = await setListed(loaded, table, listed);
	return { loaded, skipped };
}

async function deleteEffectsImpl(loaded: LoadedDex, table: EffectTable, names: string[]) {
	const base = baseOf(loaded.row);
	const effects = { ...loaded.effects, [table]: new Map(entriesOf(loaded, table)) } as Effects;
	const lists = JSON.parse(json(loaded.row.effectlists || {}));
	const deleted: ID[] = [];
	for (const name of names) {
		const id = toID(name);
		if (base.data[table][id]) {
			if (!LIST_TABLES.includes(table as ListTable)) {
				throw new Chat.ErrorMessage(`${name} comes with the moves, abilities and items that need it, so it can't be deleted.`);
			}
			const list = lists[table] ||= {};
			if (!(base.data[table][id] as AnyObject).isNonstandard) list.removed = [...new Set([...list.removed || [], id])];
			list.added = (list.added || []).filter((other: ID) => other !== id);
		} else if (!effects[table].has(id)) {
			throw new Chat.ErrorMessage(`${loaded.row.name} has no ${tableName(table)} called "${name}".`);
		}
		if (effects[table].delete(id)) deleted.push(id);
	}
	check(compile({ ...loaded.row, effectlists: lists }, loaded.entries, effects));
	await database().query(SQL`UPDATE dexes SET effectlists = ${json(lists)} WHERE dexid = ${loaded.row.dexid}`);
	for (const id of deleted) {
		await database().query(SQL`DELETE FROM dex_effects
			WHERE dexid = ${loaded.row.dexid} AND effecttable = ${table} AND effectid = ${id}`);
	}
	const updated = await save(loaded);
	for (const id of deleted) await propagate(loaded.row.dexid, table, id);
	return currentDexes().get(updated.row.dexid) || updated;
}

function vanillaInput(target: LoadedDex, game: ModdedDex, id: ID) {
	const species = game.species.get(id);
	const gen = baseOf(target.row).gen;
	const learnset: { [move: string]: string[] } = {};
	for (const [move, sources] of Object.entries(game.data.Learnsets[id]?.learnset || {})) {
		const kept = [...new Set(sources.filter(source => Number(source.charAt(0)) <= game.gen && /^\d[LMTER]/.test(source))
			.map(source => `${gen}${source.slice(1)}`))];
		if (kept.length) learnset[move] = kept;
	}
	return {
		name: species.name, types: species.types, baseStats: species.baseStats, eggGroups: species.eggGroups, weightkg: species.weightkg,
		...(game.gen >= 3 ? { abilities: species.abilities } : {}),
		...(Object.keys(learnset).length ? { learnset } : {}),
	};
}

async function addPokemonImpl(target: LoadedDex, from: string, names: string[]) {
	const base = baseOf(target.row);
	const { gen, source } = sourceOf(from);
	const game = gen && gen !== base.gen ? Dex.mod(`gen${gen}`) : null;
	const skipped: string[] = [];
	const plain = new Set<ID>();
	const inputs: AnyObject[] = [];
	const forks: string[] = [];
	let loaded = target;
	for (const name of names) {
		const id = toID(name);
		if (loaded.entries.has(id) || loaded.data.species.includes(id)) {
			skipped.push(`${name} is already in ${loaded.row.name}`);
			continue;
		}
		if (source && ancestorsOf(source).some(layer => layer.entries.has(id))) {
			forks.push(name);
			continue;
		}
		if (game) {
			const species = game.species.get(id);
			if (!species.exists || species.isNonstandard) {
				skipped.push(`${name} isn't in Gen ${game.gen}`);
				continue;
			}
			inputs.push(vanillaInput(loaded, game, id));
			if (base.data.Pokedex[id]) plain.add(id);
			continue;
		}
		if (base.data.Pokedex[id]) {
			for (const each of findSpecies(loaded, [name])) plain.add(each);
		} else {
			skipped.push(`${name} isn't in ${baseName(loaded.row)}`);
		}
	}
	if (source && forks.length) loaded = (await forkAll(loaded, source, 'Pokedex', forks, skipped)).loaded;
	if (inputs.length) ({ loaded } = await putEntries(loaded, inputs));
	if (plain.size) loaded = await setSpecies(loaded, plain, true);
	return { loaded, skipped };
}

export function spriteSlot(loaded: LoadedDex, name: string, kind: string) {
	if (kind === 'item') {
		const item = loaded.dex.items.get(name);
		return { table: 'Items' as const, name: item.exists ? item.name : name, key: kind };
	}
	if (kind === 'type') {
		const type = loaded.dex.types.get(name);
		return { table: 'TypeChart' as const, name: type.exists ? type.name : name, key: kind };
	}
	const species = loaded.dex.species.get(name);
	if (!species.exists) return { table: 'Pokedex' as const, name, key: kind };
	if (species.isCosmeticForme) {
		return { table: 'Pokedex' as const, name: species.baseSpecies, key: `${species.id}:${kind}` };
	}
	return { table: 'Pokedex' as const, name: species.name, key: kind };
}

async function setSpriteImpl(
	user: User, loaded: LoadedDex, name: string, kind: string, image: string | null, settings: AnyObject = {}
) {
	const slot = spriteSlot(loaded, name, kind);
	const id = toID(slot.name);
	const official = loaded.row.official;
	if (image !== null) sprites.checkKind(kind, official);
	const decoded = image === null ? null : sprites.decode(kind, image, official);
	const options = sprites.toSettings(settings, official);
	const account = await accountOf(user);
	if (decoded && !official) {
		const used = spritesUsed(loaded.row.ownerid, { sha: decoded.sha, bytes: decoded.data.length });
		if (used > MAX_SPRITE_STORAGE) {
			throw new Chat.ErrorMessage(`That would use ${megabytes(used)} of ${loaded.row.ownername}'s ${megabytes(MAX_SPRITE_STORAGE)} sprite storage. Remove sprites they don't need first.`);
		}
	}
	if (decoded && !entriesOf(loaded, slot.table).has(id)) {
		const exists = slot.table === 'Items' ? loaded.dex.items.get(id).exists :
			slot.table === 'TypeChart' ? loaded.dex.types.get(id).exists : loaded.data.species.includes(id);
		if (!exists) throw new Chat.ErrorMessage(`${loaded.row.name} has no ${tableName(slot.table)} called "${name}".`);
		const edited = slot.table === 'Items' ? await putEffect(loaded, 'Items', { name: slot.name }) :
			slot.table === 'TypeChart' ? await putType(loaded, { name: slot.name }) : await putEntry(loaded, { name: slot.name });
		loaded = edited.loaded;
	}
	const entry = slot.table === 'Pokedex' ? getEntry(loaded, slot.name) : getEffect(loaded, slot.table, slot.name);
	const entrySprites = { ...entry.sprites };
	if (!decoded) {
		if (!entrySprites[slot.key]) throw new Chat.ErrorMessage(`${name} has no ${kind} sprite.`);
		delete entrySprites[slot.key];
	} else {
		entrySprites[slot.key] = await sprites.upload(
			database(), decoded, kind, account, user.name, loaded.row, options
		);
	}
	const detached = { ...entry, sprites: entrySprites, trackdex: null, trackid: null };
	await writeEntry(loaded.row.dexid, slot.table, detached);
	return saved(loaded, slot.table, id);
}

async function deleteSpriteImpl(user: User, uploadid: string) {
	const image = (await sprites.getUploads(database(), [uploadid])).get(uploadid);
	if (!image) throw new Chat.ErrorMessage(`That sprite doesn't exist.`);
	if (image.accountid !== await accountOf(user) && !user.can('bypassall')) {
		throw new Chat.ErrorMessage(`Only ${image.uploadername}, who uploaded it, can delete that sprite.`);
	}
	const changed = new Set<ID>();
	const without = (images: AnyObject) => Object.fromEntries(Object.entries(images).filter(([, id]) => id !== uploadid));
	const species = await database().query<{ dexid: ID, speciesid: ID, sprites: AnyObject }>(SQL`
		SELECT dexid, speciesid, sprites FROM dex_species
		WHERE EXISTS (SELECT 1 FROM jsonb_each_text(sprites) AS sprite WHERE sprite.value = ${uploadid})`);
	for (const row of species) {
		await database().query(SQL`UPDATE dex_species SET sprites = ${json(without(row.sprites))}
			WHERE dexid = ${row.dexid} AND speciesid = ${row.speciesid}`);
		changed.add(row.dexid);
	}
	const effects = await database().query<{ dexid: ID, effecttable: string, effectid: ID, sprites: AnyObject }>(SQL`
		SELECT dexid, effecttable, effectid, sprites FROM dex_effects
		WHERE EXISTS (SELECT 1 FROM jsonb_each_text(sprites) AS sprite WHERE sprite.value = ${uploadid})`);
	for (const row of effects) {
		await database().query(SQL`UPDATE dex_effects SET sprites = ${json(without(row.sprites))}
			WHERE dexid = ${row.dexid} AND effecttable = ${row.effecttable} AND effectid = ${row.effectid}`);
		changed.add(row.dexid);
	}
	const active = mutations.getStore();
	await sprites.remove(database(), image, active ? remove => active.files.push(remove) : undefined);
	for (const dexid of changed) await refresh(dexid);
	return { image, uses: species.length + effects.length };
}

async function putEffectsImpl(loaded: LoadedDex, table: EffectTable, inputs: AnyObject[]) {
	const base = baseOf(loaded.row);
	const lookup = lookupTables(base, loaded.data.Pokedex, loaded.effects);
	const effects = { ...loaded.effects, [table]: new Map(entriesOf(loaded, table)) } as Effects;
	const changed: EffectEntry[] = [];
	for (const input of inputs) {
		const entry = named(input, () => validateEffect(input, table, base, effects[table], lookup, loaded.row.official));
		if (!base.data[table][entry.effectid]) {
			entry.num ||= newNum(table, effects[table].values());
			entry.data.num = entry.num;
		}
		effects[table].set(entry.effectid, entry);
		changed.push(entry);
	}
	const stale: string[] = [];
	check(compile(loaded.row, loaded.entries, effects, stale));
	const broken = stale.filter(problem => !loaded.stale.includes(problem));
	if (broken.length) throw new Chat.ErrorMessage(`These changes don't work: ${broken.join('; ')}`);
	for (const entry of changed) await writeEntry(loaded.row.dexid, table, entry);
	const updated = await save(loaded);
	for (const entry of changed) await propagate(loaded.row.dexid, table, entry.effectid);
	return { loaded: currentDexes().get(updated.row.dexid) || updated, entries: changed };
}

async function putEffectImpl(loaded: LoadedDex, table: EffectTable, input: AnyObject) {
	const { loaded: updated, entries } = await putEffects(loaded, table, [input]);
	return { loaded: updated, entry: entries[0] };
}

export function getEffect<T extends EffectTable | 'TypeChart'>(loaded: LoadedDex, table: T, name: string) {
	const entry = loaded.effects[table].get(toID(name)) as Effects[T] extends Map<ID, infer E> ? E : never;
	if (!entry) {
		throw new Chat.ErrorMessage(`${loaded.row.name} has no custom or edited ${tableName(table)} called "${name}".`);
	}
	return entry;
}

async function putTypeImpl(loaded: LoadedDex, input: AnyObject) {
	const entry = validateType(input, baseOf(loaded.row), loaded.effects.TypeChart, loaded.dex);
	const effects = { ...loaded.effects, TypeChart: new Map([...loaded.effects.TypeChart, [entry.effectid, entry]]) };
	check(compile(loaded.row, loaded.entries, effects));
	await writeEntry(loaded.row.dexid, 'TypeChart', entry);
	return { loaded: await saved(loaded, 'TypeChart', entry.effectid), entry };
}

async function deleteEffectImpl(loaded: LoadedDex, table: EffectTable | 'TypeChart', names: string[]) {
	const ids = names.map(name => getEffect(loaded, table, name).effectid);
	const effects = { ...loaded.effects, [table]: new Map(entriesOf(loaded, table)) } as Effects;
	for (const id of ids) effects[table].delete(id);
	check(compile(loaded.row, loaded.entries, effects));
	for (const id of ids) {
		await database().query(SQL`DELETE FROM dex_effects
			WHERE dexid = ${loaded.row.dexid} AND effecttable = ${table} AND effectid = ${id}`);
	}
	const updated = await save(loaded);
	for (const id of ids) await propagate(loaded.row.dexid, table, id);
	return currentDexes().get(updated.row.dexid) || updated;
}

function originOf(source: LoadedDex, entry: Entry): Origin {
	return entry.origin || { dexid: source.row.dexid, dex: source.row.name, owner: source.row.ownername, name: entry.data.name };
}

type Fork = [Table, ID, LoadedDex, (string | null)?];

const serialize = (value: unknown) => JSON.stringify(value, (key, each) => (typeof each === 'function' ? String(each) : each));

function engineOf(source: LoadedDex, table: Table, id: ID) {
	if (table === 'Pokedex' || table === 'TypeChart') return null;
	return ancestorsOf(source).map(layer => layer.row.mod).find(mod => Dex.mod(mod).data[table][id]) || null;
}

export function dependencies(
	source: LoadedDex, table: Table, id: ID, target: LoadedDex,
	found = new Map<string, Fork>(), missing: string[] = []
) {
	const layers = ancestorsOf(source);
	const owner = layers.find(layer => entriesOf(layer, table).has(id));
	const world = baseOf(target.row);
	const engine = !owner && !isBase(world, table, id) ? engineOf(source, table, id) : null;
	if (!owner && !engine) {
		throw new Chat.ErrorMessage(`${source.row.name} has no custom or edited ${tableName(table)} called "${id}".`);
	}
	if (found.has(`${table}:${id}`)) return found;
	found.set(`${table}:${id}`, [table, id, owner || source, engine]);
	const visit = (value: unknown, tables: readonly Table[] = TABLES): void => {
		if (Array.isArray(value)) return value.forEach(each => visit(each, tables));
		if (isObject(value)) return Object.values(value).forEach(each => visit(each, tables));
		const ref = toID(value);
		if (typeof value !== 'string' || !ref) return;
		for (const other of tables) {
			if ((other === table && ref === id) || isBase(world, other, ref) || found.has(`${other}:${ref}`)) continue;
			const layer: LoadedDex | undefined = layers.find(each => entriesOf(each, other).has(ref));
			const dep = layer && entriesOf(layer, other).get(ref)!;
			const inherited = dep?.inheritsfrom && (dep.inheritsfrom.includes(':') || isBase(world, other, dep.inheritsfrom));
			if (dep && !isBase(baseOf(layer.row), other, ref) && (!dep.inheritsfrom || inherited)) {
				dependencies(source, other, ref, target, found, missing);
			} else if (!dep && other === 'Conditions' && engineOf(source, other, ref)) {
				dependencies(source, other, ref, target, found, missing);
			} else if ((dep || isBase(source.dex, other, ref)) && !isBase(target.dex, other, ref)) {
				const what = `the ${tableName(other)} ${dep?.data.name || (source.dex.data[other][ref] as AnyObject).name || ref}`;
				if (!missing.includes(what)) missing.push(what);
			}
		}
	};
	if (engine) {
		visit([...serialize(Dex.mod(engine).data[table][id]).matchAll(/(['"`])([^'"`\n]{1,40})\1/g)].map(match => match[2]), ['Conditions', 'TypeChart']);
		return found;
	}
	const entry = entriesOf(owner!, table).get(id)!;
	visit(entry.data);
	if (table === 'Pokedex') {
		const { learnset } = entry as SpeciesEntry;
		visit(Object.keys(learnset).filter(move => learnset[move]));
	} else if (table === 'TypeChart') {
		visit([...Object.keys(entry.data.damageTaken), ...Object.keys(entry.data.attacks)], ['TypeChart', 'Conditions']);
	} else {
		visit(Object.values((entry as EffectEntry).slots).flatMap(edits => Object.values(edits).map(edit => edit.to)));
	}
	return found;
}

async function copyInto(
	target: LoadedDex, keys: Fork[],
	options: { overwrite?: boolean, update?: boolean, seen?: Set<string> } = {}
) {
	const base = baseOf(target.row);
	const entries = new Map(target.entries);
	const effects = Object.fromEntries(TABLES.slice(1).map(table => [table, new Map(entriesOf(target, table))])) as Effects;
	const species = new Set(target.row.species);
	const copied: [Table, Entry][] = [];
	for (const [table, id, source, engine] of keys) {
		if (target.row.dexid === source.row.dexid) throw new Chat.ErrorMessage(`That's the same dex.`);
		const sourceBase = baseOf(source.row);
		const entry: Entry = engine ? {
			effecttable: table as EffectTable, effectid: id, num: 0, inheritsfrom: `${engine}:${id}` as ID,
			data: { name: (Dex.mod(engine).data[table as EffectTable][id] as AnyObject).name }, slots: {}, events: {}, sprites: {},
			origin: null, trackdex: null, trackid: null,
		} as EffectEntry : entriesOf(source, table).get(id)!;
		const into: Map<ID, Entry> = table === 'Pokedex' ? entries : effects[table];
		const existing = into.get(id);
		const what = `the ${tableName(table)} ${entry.data.name}`;
		if (engine && existing?.inheritsfrom === `${engine}:${id}`) continue;
		if (existing && !(existing.trackdex === source.row.dexid && existing.trackid === id)) {
			if (options.update) continue;
			if (!options.overwrite) {
				throw new Chat.ErrorMessage(`${target.row.name} already has its own version of ${what}. Add "overwrite" to replace it.`);
			}
		}
		const official = isBase(base, table, id);
		if (!engine && official !== isBase(sourceBase, table, id)) {
			throw new Chat.ErrorMessage(official ?
				`${what} is custom in ${source.row.name}, but ${baseName(target.row)} already has one.` :
				`${what} is an edit of something ${baseName(target.row)} doesn't have.`);
		}
		if (entry.inheritsfrom && !entry.inheritsfrom.includes(':') && !isBase(base, table, entry.inheritsfrom)) {
			throw new Chat.ErrorMessage(`${what} copies ${entry.inheritsfrom}, which ${baseName(target.row)} doesn't have.`);
		}
		let link: Entry | undefined = entry;
		for (let i = 0; link?.trackdex && i < 100; i++) {
			if (link.trackdex === target.row.dexid && link.trackid === id) {
				throw new Chat.ErrorMessage(`${what} in ${source.row.name} comes from ${target.row.name} already.`);
			}
			const next = currentDexes().get(link.trackdex);
			link = next && entriesOf(next, table).get(link.trackid!);
		}
		const copy = {
			...JSON.parse(json(entry)), origin: originOf(source, entry), trackdex: engine ? null : source.row.dexid, trackid: engine ? null : id,
		};
		copy.num = official ? existing?.num || 0 : existing?.num || newNum(table, into.values());
		if (table !== 'Pokedex' && table !== 'TypeChart' && !official) copy.data.num = copy.num;
		into.set(id, copy);
		if (table === 'Pokedex' && official) species.add(id);
		copied.push([table, copy]);
	}
	const stale: string[] = [];
	check(compile({ ...target.row, species: [...species] }, entries, effects, stale));
	const warnings = stale.filter(problem => !target.stale.includes(problem));
	for (const [table, entry] of copied) await writeEntry(target.row.dexid, table, entry);
	if (species.size !== target.row.species.length) {
		await database().query(SQL`UPDATE dexes SET species = ${json([...species])} WHERE dexid = ${target.row.dexid}`);
	}
	const loaded = await save(target);
	for (const [table, entry] of copied) {
		const id = (entry as SpeciesEntry).speciesid || (entry as EffectEntry).effectid;
		await propagate(loaded.row.dexid, table, id, options.seen);
	}
	return {
		loaded: currentDexes().get(loaded.row.dexid) || loaded, warnings,
		copied: copied.map(([table, entry]) => `${tableName(table)} ${entry.data.name}`),
	};
}

async function propagate(dexid: ID, table: Table, id: ID, seen = new Set<string>()) {
	if (seen.has(`${dexid}:${table}:${id}`)) return;
	seen.add(`${dexid}:${table}:${id}`);
	const rows = table === 'Pokedex' ?
		await database().query<{ dexid: ID }>(SQL`SELECT dexid FROM dex_species
			WHERE trackdex = ${dexid} AND trackid = ${id}`) :
		await database().query<{ dexid: ID }>(SQL`SELECT dexid FROM dex_effects
			WHERE trackdex = ${dexid} AND effecttable = ${table} AND trackid = ${id}`);
	const source = currentDexes().get(dexid);
	for (const row of rows) {
		const target = currentDexes().get(row.dexid);
		if (!target) continue;
		try {
			if (!source || !entriesOf(source, table).has(id)) throw new Error(`The original is gone.`);
			await copyInto(target, [...dependencies(source, table, id, target).values()], { update: true, seen });
		} catch {
			await detach(currentDexes().get(row.dexid) || target, table, id);
		}
	}
}

async function detach(loaded: LoadedDex, table: Table, id: ID) {
	if (table === 'Pokedex') {
		await database().query(SQL`UPDATE dex_species SET trackdex = NULL, trackid = NULL
			WHERE dexid = ${loaded.row.dexid} AND speciesid = ${id}`);
	} else {
		await database().query(SQL`UPDATE dex_effects SET trackdex = NULL, trackid = NULL
			WHERE dexid = ${loaded.row.dexid} AND effecttable = ${table} AND effectid = ${id}`);
	}
	return (await refresh(loaded.row.dexid))!;
}

async function forkEntryImpl(target: LoadedDex, source: LoadedDex, table: Table, name: string, overwrite = false) {
	const missing: string[] = [];
	const found = dependencies(source, table, toID(name), target, undefined, missing);
	return { ...await copyInto(target, [...found.values()], { overwrite }), missing };
}

export function evoLine(loaded: LoadedDex, name: string) {
	const inDex = new Set(loaded.data.species);
	const get = (speciesName: string) => {
		const species = loaded.dex.species.get(speciesName);
		return species.exists && inDex.has(species.id) ? species : null;
	};
	const parentOf = (species: Species) => {
		const prevo = get(species.prevo);
		if (prevo) return prevo;
		const parents = [...inDex].map(get).filter(other => other?.evos.includes(species.name));
		return parents.length === 1 ? parents[0] : null;
	};
	const descend = (from: Species) => {
		const line = [from];
		for (const species of line) {
			for (const evo of species.evos) {
				const next = get(evo);
				if (next && !line.some(other => other.id === next.id)) line.push(next);
			}
		}
		return line;
	};
	const start = get(name);
	if (!start) throw new Chat.ErrorMessage(`${loaded.row.name} has no Pokemon called "${name}".`);
	const ancestors: Species[] = [];
	for (let parent = parentOf(start); parent && ancestors.length < MAX_DEPTH; parent = parentOf(parent)) {
		if (parent.id === start.id || ancestors.some(other => other.id === parent!.id)) break;
		ancestors.unshift(parent);
	}
	const family = descend(ancestors[0] || start);
	if (family.length <= 6) return family;
	return [...ancestors, ...descend(start).filter(species => !ancestors.some(other => other.id === species.id))];
}

async function forkLineImpl(target: LoadedDex, source: LoadedDex, name: string, overwrite = false) {
	const line = evoLine(source, name);
	const custom = (id: ID) => ancestorsOf(source).some(layer => layer.entries.has(id));
	const found = new Map<string, Fork>();
	const missing: string[] = [];
	for (const species of line) {
		if (custom(species.id)) dependencies(source, 'Pokedex', species.id, target, found, missing);
	}
	const result = found.size ?
		await copyInto(target, [...found.values()], { overwrite }) :
		{ loaded: target, copied: [] as string[], warnings: [] as string[] };
	const base = baseOf(result.loaded.row);
	const added: string[] = [];
	for (const species of line) {
		if (custom(species.id) || result.loaded.data.species.includes(species.id)) continue;
		if (base.data.Pokedex[species.id]) {
			added.push(species.name);
		} else {
			result.warnings.push(`${species.name} isn't in ${baseName(result.loaded.row)}`);
		}
	}
	if (added.length) result.loaded = await setSpecies(result.loaded, new Set(added.map(toID)), true);
	return { ...result, added, missing };
}

export function effectEditor(loaded: LoadedDex, table: EffectTable, name: string) {
	const id = toID(name);
	const base = baseOf(loaded.row);
	if (!loaded.effects[table].has(id) && !base.data[table][id]) {
		throw new Chat.ErrorMessage(`There's no ${EFFECT_NAMES[table]} called "${name}" in ${loaded.row.name}.`);
	}
	const lookup = lookupTables(base, loaded.data.Pokedex, loaded.effects);
	const effect = JSON.parse(json(loaded.dex.data[table][id]));
	const edit = loaded.data.effects?.[table]?.[id] || { data: {} };
	const { base: original } = baseEffect(base, table, id, edit);
	return {
		...describeEffect(base, table, id, loaded.effects[table].get(id), lookup),
		edited: loaded.effects[table].has(id), editable: loaded.row.official ? null : EDITABLE[table],
		data: { ...effect, ...describeText(base, table, edit, id) },
		original: original ? {
			...JSON.parse(json(original)), ...describeText(base, table, { data: {}, inherit: edit.inherit }, id),
		} : null,
		source: handlersOf(loaded.dex.data[table][id]).map(([path, fn]) => [path, dedent(fn.toString())]),
	};
}

function dedent(src: string) {
	const lines = src.split('\n');
	const indent = Math.min(...lines.slice(1).filter(line => line.trim()).map(line => /^\s*/.exec(line)![0].length));
	return lines.map((line, i) => i && Number.isFinite(indent) ? line.slice(indent) : line).join('\n');
}

function validateTiers(loaded: LoadedDex, input: unknown) {
	if (input === null) return null;
	if (!isObject(input) || Object.keys(input).length > 5000) {
		throw new Chat.ErrorMessage(`"tiers" must map Pokemon to tiers, like {"pikachu": {"tier": "UU"}}.`);
	}
	const tiers: AnyObject = {};
	for (const name of Object.keys(input)) {
		const species = loaded.dex.species.get(name);
		if (!species.exists || !loaded.data.species.includes(species.id)) {
			throw new Chat.ErrorMessage(`"${name}" isn't a Pokemon in ${loaded.row.name}.`);
		}
		const entry = input[name];
		if (!isObject(entry)) throw new Chat.ErrorMessage(`The tiers of ${species.name} must be like {"tier": "UU"}.`);
		const checked: AnyObject = {};
		for (const key of Object.keys(entry)) {
			const list = TIER_FIELDS.get(key);
			if (!list) throw new Chat.ErrorMessage(`"${key}" isn't a tier field: use tier, natDexTier or doublesTier.`);
			if (!list.includes(entry[key])) throw new Chat.ErrorMessage(`"${entry[key]}" isn't a ${key}: use one of ${list.join(', ')}.`);
			checked[key] = entry[key];
		}
		if (Object.keys(checked).length) tiers[species.id] = checked;
	}
	return Object.keys(tiers).length ? tiers : null;
}

async function setTiersImpl(loaded: LoadedDex, input: AnyObject) {
	const field = `${input.field}`;
	if (!TIER_FIELDS.has(field)) {
		throw new Chat.ErrorMessage(`"field" must be tier, natDexTier or doublesTier.`);
	}
	const names: string[] = Array.isArray(input.species) ? input.species.map(String) : [];
	if (!input.reset && (!names.length || names.length > 5000)) throw new Chat.ErrorMessage(`Pick some Pokemon.`);
	const tier = input.tier === null || input.tier === undefined ? null : `${input.tier}`;
	if (!input.format) {
		if (tier === null) throw new Chat.ErrorMessage(`Pick a tier.`);
		return (await putEntries(loaded, names.map(name => {
			const species: AnyObject = loaded.dex.species.get(name);
			const own: AnyObject = loaded.dex.data.FormatsData[species.id] || {};
			const resolved: AnyObject = {};
			for (const [key, list] of TIER_FIELDS) {
				if (!own[key] && list.includes(species[key])) resolved[key] = species[key];
			}
			return { name, ...resolved, [field]: tier };
		}))).loaded;
	}
	const formatid = toID(input.format);
	const old = loaded.formats.get(formatid);
	if (!old) throw new Chat.ErrorMessage(`${loaded.row.name} has no format "${input.format}".`);
	if (input.reset) return (await putFormat(loaded, { id: formatid, name: old.name, tiers: null })).loaded;
	const tiers: AnyObject = JSON.parse(JSON.stringify((old as AnyObject).tiers || {}));
	for (const name of names) {
		const species = loaded.dex.species.get(name);
		if (!species.exists) throw new Chat.ErrorMessage(`"${name}" isn't a Pokemon.`);
		const entry = tiers[species.id] || {};
		if (tier === null || (species as AnyObject)[field] === tier) delete entry[field];
		else entry[field] = tier;
		if (Object.keys(entry).length) tiers[species.id] = entry;
		else delete tiers[species.id];
	}
	return (await putFormat(loaded, { id: formatid, name: old.name, tiers })).loaded;
}

function validateFormat(loaded: LoadedDex, input: AnyObject, old?: FormatData): FormatData {
	const data: AnyObject = { ...old, name: validateName(input.name, 'format') };
	if (input.from !== undefined) {
		const from = Dex.formats.get(`${input.from}`);
		if (!from.exists || from.effectType !== 'Format' || from.team || formatDexes.has(from.id)) {
			throw new Chat.ErrorMessage(`"from" must be a format on this server that isn't a random battle or a dex's, like "gen9ou".`);
		}
		for (const field of ['gameType', ...FORMAT_LISTS, ...FORMAT_FLAGS]) {
			if (from[field as keyof Format] !== undefined) data[field] = JSON.parse(json(from[field as keyof Format]));
		}
		if (old && (old.gameType || 'singles') !== (data.gameType || 'singles')) {
			throw new Chat.ErrorMessage(`A format's game type can't change; make a new format instead.`);
		}
	}
	for (const field in input) {
		const value = input[field];
		if (field === 'name' || field === 'from' || field === 'id') continue;
		if (field === 'gameType') {
			if (!GAME_TYPES.includes(value)) throw new Chat.ErrorMessage(`"gameType" must be one of: ${GAME_TYPES.join(', ')}.`);
			if (old && (old.gameType || 'singles') !== value) {
				throw new Chat.ErrorMessage(`A format's game type can't change; make a new format instead.`);
			}
		} else if (FORMAT_LISTS.includes(field)) {
			if (!Array.isArray(value) || value.length > 512 || value.some(rule => typeof rule !== 'string' || rule.length > 100)) {
				throw new Chat.ErrorMessage(`"${field}" must be a list of rule names.`);
			}
		} else if (FORMAT_FLAGS.includes(field)) {
			if (typeof value !== 'boolean') throw new Chat.ErrorMessage(`"${field}" must be true or false.`);
		} else if (field === 'tiers') {
			const tiers = validateTiers(loaded, value);
			if (tiers) data.tiers = tiers;
			else delete data.tiers;
			continue;
		} else {
			throw new Chat.ErrorMessage(`"${field}" isn't something you can set. You can set: name, from, gameType, tiers, ${[...FORMAT_LISTS, ...FORMAT_FLAGS].join(', ')}.`);
		}
		data[field] = value;
	}
	if (!data.ruleset) data.ruleset = ['Standard'];
	try {
		Dex.formats.getRuleTable(buildFormat(loaded.dex, formatData(loaded, data as FormatData, '' as ID)));
	} catch (e: any) {
		throw new Chat.ErrorMessage(`That format doesn't work: ${e.message}`);
	}
	return data as FormatData;
}

async function putFormatImpl(loaded: LoadedDex, input: AnyObject) {
	if (typeof input.name !== 'string') throw new Chat.ErrorMessage(`A format needs a name.`);
	const named = [...loaded.formats].find(([, data]) => toID(data.name) === toID(input.name))?.[0];
	const formatid = typeof input.id === 'string' && loaded.formats.has(toID(input.id)) ? toID(input.id) :
		named || newID('f', id => formatDexes.has(id) || Dex.formats.get(id).exists);
	if (named && named !== formatid) throw new Chat.ErrorMessage(`${loaded.row.name} already has a format called ${input.name}.`);
	const old = loaded.formats.get(formatid);
	if (!loaded.row.official && !old && loaded.formats.size >= MAX_FORMATS) {
		throw new Chat.ErrorMessage(`A dex can have at most ${MAX_FORMATS} formats.`);
	}
	if (!loaded.row.official && toID(`${loaded.row.name}${input.name}`).length > 40) {
		throw new Chat.ErrorMessage(`The dex and format names together can be at most 40 letters and numbers.`);
	}
	const data = validateFormat(loaded, input, old);
	await database().query(SQL`INSERT INTO dex_formats (formatid, dexid, data, updated) VALUES (
		${formatid}, ${loaded.row.dexid}, ${json(data)}, ${Date.now()}
	) ON CONFLICT (formatid) DO UPDATE SET data = EXCLUDED.data, updated = EXCLUDED.updated`);
	return { loaded: await save(loaded), formatid };
}

async function deleteFormatImpl(loaded: LoadedDex, name: string) {
	const formatid = loaded.formats.has(toID(name)) ? toID(name) :
		[...loaded.formats].find(([, data]) => toID(data.name) === toID(name))?.[0] || toID(name);
	if (!loaded.formats.has(formatid)) throw new Chat.ErrorMessage(`${loaded.row.name} has no format called "${name}".`);
	await database().query(SQL`DELETE FROM dex_formats WHERE formatid = ${formatid}`);
	return save(loaded);
}

function mutation<T extends (...args: any[]) => Promise<any>>(action: T): T {
	return (async (...args: Parameters<T>) => {
		if (mutations.getStore()) return action(...args);
		const next = writing.catch(() => {}).then(async () => {
			const connection = await database().connection.connect();
			const previous = new Map(dexes);
			for (const loaded of previous.values()) buildDex(loaded.data, Dex);
			const transactional = Object.create(database()) as PGDatabase;
			transactional._query = (sql, values) => connection.query(sql, values).then(result => result.rows);
			transactional._queryExec = (sql, values) => connection.query(sql, values)
				.then(result => ({ affectedRows: result.rowCount }));
			const context = {
				db: transactional, snapshots: [] as LoadedDex[], dexes: new Map(previous), files: [] as (() => Promise<void>)[],
			};
			let committed = false;
			try {
				await connection.query('BEGIN');
				const current = args.map(arg => {
					if (!arg?.row?.dexid || !arg.entries || !arg.dex) return arg;
					const loaded = currentDexes().get(arg.row.dexid);
					if (!loaded) throw new Chat.ErrorMessage(`That dex no longer exists.`);
					return loaded;
				}) as Parameters<T>;
				const result = await mutations.run(context, () => action(...current));
				await connection.query('COMMIT');
				committed = true;
				for (const [id, loaded] of previous) {
					if (context.dexes.get(id) === loaded) releaseDex(loaded.dex);
					else unregister(loaded);
				}
				dexes.clear();
				for (const [id, loaded] of context.dexes) {
					dexes.set(id, loaded);
					if (previous.get(id) !== loaded) register(loaded);
				}
				pruneBases();
				return result;
			} catch (err) {
				await connection.query('ROLLBACK').catch(err => Monitor.crashlog(err, 'Rolling back a dex edit'));
				for (const loaded of context.dexes.values()) releaseDex(loaded.dex);
				pruneBases();
				throw err;
			} finally {
				connection.release();
				if (committed) {
					for (const unlink of context.files) {
						await unlink().catch(err => Monitor.crashlog(err, 'Removing a dex sprite'));
					}
					for (const loaded of context.snapshots) {
						void saveSnapshots(loaded).catch(err => Monitor.crashlog(err, 'A dex snapshot'));
					}
				}
			}
		});
		writing = next;
		return next;
	}) as T;
}

export const setVisibility = mutation(setVisibilityImpl);
export const createDex = mutation(createDexImpl);
export const setName = mutation(setNameImpl);
export const setBase = mutation(setBaseImpl);
export const setDescription = mutation(setDescriptionImpl);
export const setEditor = mutation(setEditorImpl);
export const setOfficial = mutation(setOfficialImpl);
export const deleteDex = mutation(deleteDexImpl);
export const clearDex = mutation(clearDexImpl);
export const setSpecies = mutation(setSpeciesImpl);
export const putEntries = mutation(putEntriesImpl);
export const putEntry = mutation(putEntryImpl);
export const deleteEntry = mutation(deleteEntryImpl);
export const deletePokemon = mutation(deletePokemonImpl);
export const addEffects = mutation(addEffectsImpl);
export const deleteEffects = mutation(deleteEffectsImpl);
export const addPokemon = mutation(addPokemonImpl);
export const setSprite = mutation(setSpriteImpl);
export const deleteSprite = mutation(deleteSpriteImpl);
export const transaction = mutation(async <T>(action: () => Promise<T>) => action());
export const putEffects = mutation(putEffectsImpl);
export const putEffect = mutation(putEffectImpl);
export const putType = mutation(putTypeImpl);
export const deleteEffect = mutation(deleteEffectImpl);
export const forkEntry = mutation(forkEntryImpl);
export const forkLine = mutation(forkLineImpl);
export const setTiers = mutation(setTiersImpl);
export const putFormat = mutation(putFormatImpl);
export const deleteFormat = mutation(deleteFormatImpl);
