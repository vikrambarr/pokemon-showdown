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
import { DOUBLES_TIERS, resolveEntries, TIERS, validateEntry, validateName, type Origin, type SpeciesEntry } from './species';
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
	created: number;
	updated: number;
}

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

export const MAX_DEXES = 3;
export const MAX_BATCH = 512;
export const MAX_FORMATS = 16;
export const MAX_DATA_BYTES = 256 * 1024;
export const MAX_STORAGE_BYTES = 16 * 1024 * 1024;
export const MAX_ORIGINS = 5;
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

export function database() {
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
		...[...dexes.values()].flatMap(other => [...entriesOf(other, table).values()].map(each => each.num))
	) - 1;
}

function isBase(dex: ModdedDex, table: Table, id: ID) {
	return !!dex.data[table][id];
}

export function parentsOf(loaded: LoadedDex) {
	return loaded.row.parents.map(dexid => dexes.get(dexid)).filter(parent => parent) as LoadedDex[];
}

function childrenOf(loaded: LoadedDex) {
	return [...dexes.values()].filter(other => other.row.parents.includes(loaded.row.dexid));
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
		const parent = dexes.get(dexid);
		if (!parent) throw new Chat.ErrorMessage(`${row.name}'s world has a dex that isn't loaded.`);
		return parent;
	});
}

function baseKey(row: DexRow) {
	return `${row.mod}:${row.parents.map(dexid => dexes.get(dexid)?.data.hash).join(',')}`;
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
	const used = new Set([...dexes.values()].map(loaded => baseKey(loaded.row)));
	for (const [key, base] of bases) {
		if (used.has(key)) continue;
		releaseDex(base);
		bases.delete(key);
	}
}

export function baseName(row: DexRow) {
	if (!row.parents.length) return row.mod;
	const parents = row.parents.map(dexid => dexes.get(dexid));
	const names = parents.map((parent, i) => parent?.row.name || row.parents[i]).join(' + ');
	return parents.every(parent => parent?.row.mod === row.mod) ? names : `${names} (on ${row.mod})`;
}

function depthOf(loaded: LoadedDex): number {
	return Math.max(0, ...parentsOf(loaded).map(parent => depthOf(parent) + 1));
}

function heightOf(loaded: LoadedDex): number {
	return Math.max(0, ...childrenOf(loaded).map(child => heightOf(child) + 1));
}

function lockedAbove(loaded: LoadedDex, table: Table, id: ID) {
	const checked = new Set<LoadedDex>();
	for (let level = parentsOf(loaded); level.length; level = level.flatMap(parentsOf)) {
		for (const parent of level) {
			if (checked.has(parent)) continue;
			checked.add(parent);
			const entry = entriesOf(parent, table).get(id);
			if (entry?.locked && parent.row.ownerid !== loaded.row.ownerid) return parent;
		}
	}
	return null;
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

export function storageUsed(account: string, adding?: { sha: string, bytes: number }) {
	const sizes = new Map<string, number>();
	for (const loaded of dexes.values()) {
		for (const image of loaded.uploads.values()) {
			if (image.accountid === account && !dexes.get(image.dexid)?.row.official) sizes.set(image.sha, image.bytes);
		}
	}
	if (adding) sizes.set(adding.sha, adding.bytes);
	return [...sizes.values()].reduce((total, bytes) => total + bytes, 0);
}

function checkUnlocked(loaded: LoadedDex, table: Table, ids: (ID | null)[]) {
	for (const id of ids) {
		const locker = id && lockedAbove(loaded, table, id);
		if (locker) {
			throw new Chat.ErrorMessage(`The ${tableName(table)} "${id}" is locked in ${locker.row.name}, so it can't be edited or copied here.`);
		}
	}
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
	const ordered = [...dexes.values()].sort((a, b) => depthOf(a) - depthOf(b));
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
	const content = {
		mod: row.mod, ...(parents.length ? { parents: parents.map(parent => parent.hash) } : {}), species, ...resolved,
		...(Object.keys(TypeChart).length ? { TypeChart } : {}),
		...(Object.keys(edits).length ? { effects: edits } : {}),
	};
	const speciesSprites = sorted(entries).map(([, entry]) => [entry.speciesid, entry.sprites]);
	const itemSprites = sorted(effects.Items).map(([, entry]) => entry).filter(entry => entry.sprites.item)
		.map(entry => [entry.effectid, entry.sprites]);
	const hashed = itemSprites.length ? [content, speciesSprites, itemSprites] : [content, speciesSprites];
	const hash = crypto.createHash('sha256').update(json(hashed)).digest('hex').slice(0, 20);
	const data = { hash, ...content };
	if (!row.official && Buffer.byteLength(json(data)) > MAX_DATA_BYTES) {
		throw new Chat.ErrorMessage(`That would make the dex bigger than ${MAX_DATA_BYTES / 1024}KB, the limit for one battle.`);
	}
	return data;
}

function check(data: DexLayer) {
	try {
		releaseDex(buildDex(data, Dex));
	} catch (e: any) {
		throw new Chat.ErrorMessage(`That doesn't work: ${e.message}`);
	}
}

function make(
	row: DexRow, editors: Map<string, string>, entries: Map<ID, SpeciesEntry>, formats: Map<ID, FormatData>,
	effects: Effects, uploads: Map<string, sprites.Upload>
) {
	const stale: string[] = [];
	const data = compile(row, entries, effects, stale);
	return { row, editors, entries, formats, effects, uploads, stale, data, dex: buildDex(data, Dex) };
}

export function refresh(dexid: ID): Promise<LoadedDex | null> {
	const next = (refreshing.get(dexid) || Promise.resolve(null)).catch(() => null).then(async () => {
		const loaded = await reload(dexid);
		for (const child of [...dexes.values()].filter(other => other.row.parents.includes(dexid))) {
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
		if (!dexes.has(parent)) await refresh(parent);
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
	const old = dexes.get(dexid);
	if (old) unregister(old);
	if (loaded) {
		dexes.set(dexid, loaded);
		register(loaded);
		if (loaded.row.official) void saveSnapshots(loaded).catch(err => Monitor.crashlog(err, 'A dex snapshot'));
	} else {
		dexes.delete(dexid);
	}
	pruneBases();
	return loaded;
}

export function findDex(name: string) {
	const id = toID(name);
	return dexes.get(id) || [...dexes.values()].find(loaded => toID(loaded.row.name) === id);
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
	const loaded = dexes.get(formatDexes.get(id)!);
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
		const filter = `${tag.speciesFilter || ''}`;
		const tier = /natDexTier/.test(filter) ? `National Dex ${tag.name.replace(/^ND /, '')}` :
			/(?:doublesTier|\.tier)\b/.test(filter) ? tag.name : '';
		const desc = tagText[tagid]?.desc || (tier ? `Pok&eacute;mon in the ${tier} tier.` : '');
		tags.push({
			id: tagid, name: tag.name, kind: tag.speciesFilter ? 'pokemon' : tag.moveFilter ? 'move' : 'other', ...desc ? { desc } : {},
		});
	}
	const details = {
		id, name: data.name, dex: loaded.row.name, dexid: loaded.row.dexid, mod: loaded.row.mod,
		gameType: data.gameType || 'singles', ruleset: data.ruleset || [],
		banlist: data.banlist || [], unbanlist: data.unbanlist || [], restricted: data.restricted || [],
		tiers: (data as AnyObject).tiers || {},
		rules: [...ruleTable.keys()].filter(rule => !/^[-+*!]/.test(rule) && !rule.includes(':')),
		sources: Object.fromEntries([...ruleTable].filter(([rule, source]) => source && !/^[-+*!]/.test(rule) && !rule.includes(':'))),
		bans, legal, banned, outright, rulesets: Utils.sortBy(rulesets, rule => rule.name), tags: Utils.sortBy(tags, tag => [tag.kind, tag.name]),
	};
	if (!draft) formatDetailsCache.set(id, { key, details });
	return details;
}

export function battleData(formatid: string) {
	const loaded = dexes.get(formatDexes.get(toID(formatid))!);
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
		let origin = entry.origin;
		while (origin?.from) origin = origin.from;
		if (origin) origins[entry.speciesid] = origin.dex;
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
	return {
		hash, dexid: loaded.row.dexid, name: loaded.row.name, mod, ...(parents ? { parents } : {}), species,
		Pokedex, Learnsets, FormatsData,
		sprites: speciesSprites, ...effects, ...(TypeChart ? { TypeChart } : {}),
		...(Object.keys(itemSprites).length ? { itemSprites } : {}),
		...(Object.keys(images).length ? { images } : {}),
		...(Object.keys(origins).length ? { origins } : {}),
	};
}

export function saveSnapshot(formatid: string) {
	return saveSnapshots(dexes.get(formatDexes.get(toID(formatid))!));
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
	return [...dexes.values()].filter(loaded => listed(loaded, account) && toID(loaded.row.name).includes(query));
}

export async function dexesOf(name: string, account: string | null) {
	const [result] = await LoginServer.request('discord/names', { userid: toID(name) });
	const owner = result?.discordid ? `${result.discordid}` : null;
	return [...dexes.values()].filter(loaded => listed(loaded, account) && (owner ?
		loaded.row.ownerid === owner || loaded.editors.has(owner) : toID(loaded.row.ownername) === toID(name)));
}

export async function setVisibility(loaded: LoadedDex, visibility: string) {
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
	const species = parents.length ? [] : base.includeData().species.all()
		.filter(entry => entry.exists && !entry.isNonstandard).map(entry => entry.id);
	return { parents, modid, base, species };
}

export async function createDex(user: User, name: string, on: string, engine?: string) {
	name = checkName(name);
	const { parents, modid, species } = resolveBase(on, engine);
	const account = await accountOf(user);
	const owned = [...dexes.values()].filter(loaded => loaded.row.ownerid === account).length;
	if (owned >= MAX_DEXES && !user.can('bypassall')) {
		throw new Chat.ErrorMessage(`You can own at most ${MAX_DEXES} dexes.`);
	}
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

export async function setName(loaded: LoadedDex, name: string) {
	name = checkName(name, loaded);
	await database().query(SQL`UPDATE dexes SET name = ${name} WHERE dexid = ${loaded.row.dexid}`);
	return save(loaded);
}

export async function setBase(loaded: LoadedDex, on: string, engine?: string) {
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

export async function setDescription(loaded: LoadedDex, description: string) {
	if (!loaded.row.official && description.length > MAX_DESCRIPTION) {
		throw new Chat.ErrorMessage(`A description can be at most ${MAX_DESCRIPTION} characters.`);
	}
	await database().query(SQL`UPDATE dexes SET description = ${description.trim()} WHERE dexid = ${loaded.row.dexid}`);
	return save(loaded);
}

export async function setEditor(loaded: LoadedDex, name: string, add: boolean) {
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

export async function setOfficial(loaded: LoadedDex, official: boolean) {
	await database().query(SQL`UPDATE dexes SET official = ${json(official)} WHERE dexid = ${loaded.row.dexid}`);
	return save(loaded);
}

export async function deleteDex(loaded: LoadedDex) {
	const dexid = loaded.row.dexid;
	const children = [...dexes.values()].filter(other => other.row.parents.includes(dexid));
	if (children.length) {
		throw new Chat.ErrorMessage(`${Chat.count(children, 'dexes are', 'dex is')} set in ${loaded.row.name}, so it can't be deleted.`);
	}
	await database().query(SQL`DELETE FROM dexes WHERE dexid = ${dexid}`);
	await refresh(dexid);
	await unfollow(dexid);
}

export async function clearDex(loaded: LoadedDex) {
	const dexid = loaded.row.dexid;
	const species = parentsOf(loaded).length ? [] : Dex.mod(loaded.row.mod).includeData().species.all()
		.filter(entry => entry.exists && !entry.isNonstandard).map(entry => entry.id);
	await database().query(SQL`DELETE FROM dex_species WHERE dexid = ${dexid}`);
	await database().query(SQL`DELETE FROM dex_effects WHERE dexid = ${dexid}`);
	await database().query(SQL`UPDATE dexes SET species = ${json(species)}, removed = '[]' WHERE dexid = ${dexid}`);
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
			speciesid, num, inheritsfrom, data, learnset, sprites: images, origin, trackdex, trackid, locked,
		} = entry as SpeciesEntry;
		await database().query(SQL`INSERT INTO dex_species
			(dexid, speciesid, num, inheritsfrom, data, learnset, sprites, origin, trackdex, trackid, locked, updated) VALUES (
			${dexid}, ${speciesid}, ${num}, ${inheritsfrom}, ${json(data)}, ${json(learnset)}, ${json(images)},
			${json(origin)}, ${trackdex}, ${trackid}, ${json(locked)}, ${now}
		) ON CONFLICT (dexid, speciesid) DO UPDATE SET num = EXCLUDED.num, inheritsfrom = EXCLUDED.inheritsfrom,
			data = EXCLUDED.data, learnset = EXCLUDED.learnset, sprites = EXCLUDED.sprites, origin = EXCLUDED.origin,
			trackdex = EXCLUDED.trackdex, trackid = EXCLUDED.trackid, locked = EXCLUDED.locked, updated = EXCLUDED.updated`);
		return;
	}
	const {
		effectid, num, inheritsfrom, data, slots, events, sprites: images, origin, trackdex, trackid, locked,
	} = entry as EffectEntry;
	await database().query(SQL`INSERT INTO dex_effects
		(dexid, effecttable, effectid, num, inheritsfrom, data, slots, events, sprites, origin, trackdex, trackid, locked,
		updated) VALUES (
		${dexid}, ${table}, ${effectid}, ${num}, ${inheritsfrom}, ${json(data)}, ${json(slots)}, ${json(events)},
		${json(images)}, ${json(origin)}, ${trackdex}, ${trackid}, ${json(locked)}, ${now}
	) ON CONFLICT (dexid, effecttable, effectid) DO UPDATE SET num = EXCLUDED.num, inheritsfrom = EXCLUDED.inheritsfrom,
		data = EXCLUDED.data, slots = EXCLUDED.slots, events = EXCLUDED.events, sprites = EXCLUDED.sprites,
		origin = EXCLUDED.origin, trackdex = EXCLUDED.trackdex, trackid = EXCLUDED.trackid, locked = EXCLUDED.locked,
		updated = EXCLUDED.updated`);
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
	const ids = new Set<ID>();
	for (const name of names) {
		const species = base.species.get(name);
		if (!species.exists || !base.data.Pokedex[species.id]) {
			throw new Chat.ErrorMessage(`"${name}" isn't a Pokemon in ${baseName(loaded.row)}.`);
		}
		const formes = species.baseSpecies === species.name ? species.formeOrder || [species.name] : [species.name];
		for (const forme of formes) {
			if (base.data.Pokedex[toID(forme)]) ids.add(toID(forme));
		}
	}
	return ids;
}

export async function setSpecies(loaded: LoadedDex, ids: Set<ID>, add: boolean) {
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

export async function putEntries(loaded: LoadedDex, inputs: unknown[]) {
	if (!inputs.length || (inputs.length > MAX_BATCH && !loaded.row.official)) {
		throw new Chat.ErrorMessage(`Send 1 to ${MAX_BATCH} Pokemon at a time.`);
	}
	const base = baseOf(loaded.row);
	const entries = new Map(loaded.entries);
	const changed = new Map<ID, SpeciesEntry>();
	for (const input of inputs) {
		if (!isObject(input)) throw new Chat.ErrorMessage(`Each Pokemon needs to be a JSON object, like {"name": "Pikachu"}.`);
		const entry = validateEntry(input, base, entries, loaded.dex, loaded.row.official);
		checkUnlocked(loaded, 'Pokedex', [entry.speciesid, entry.inheritsfrom]);
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
	return { loaded: dexes.get(updated.row.dexid) || updated, entries: [...changed.values()] };
}

export async function putEntry(loaded: LoadedDex, input: AnyObject) {
	const { loaded: updated, entries } = await putEntries(loaded, [input]);
	return { loaded: updated, entry: entries[0] };
}

export function getEntry(loaded: LoadedDex, name: string) {
	const entry = loaded.entries.get(toID(name));
	if (!entry) throw new Chat.ErrorMessage(`${loaded.row.name} has no custom or edited Pokemon called "${name}".`);
	return entry;
}

export async function deleteEntry(loaded: LoadedDex, name: string) {
	const entry = getEntry(loaded, name);
	const entries = new Map(loaded.entries);
	entries.delete(entry.speciesid);
	check(compile(loaded.row, entries, loaded.effects));
	await database().query(SQL`DELETE FROM dex_species
		WHERE dexid = ${loaded.row.dexid} AND speciesid = ${entry.speciesid}`);
	return saved(loaded, 'Pokedex', entry.speciesid);
}

export function spriteSlot(loaded: LoadedDex, name: string, kind: string) {
	if (kind === 'item') {
		const item = loaded.dex.items.get(name);
		return { table: 'Items' as const, name: item.exists ? item.name : name, key: kind };
	}
	const species = loaded.dex.species.get(name);
	if (!species.exists) return { table: 'Pokedex' as const, name, key: kind };
	if (species.isCosmeticForme) {
		return { table: 'Pokedex' as const, name: species.baseSpecies, key: `${species.id}:${kind}` };
	}
	return { table: 'Pokedex' as const, name: species.name, key: kind };
}

export async function setSprite(
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
		const used = storageUsed(account, { sha: decoded.sha, bytes: decoded.data.length });
		if (used > MAX_STORAGE_BYTES) {
			throw new Chat.ErrorMessage(`That would use ${megabytes(used)} of your ${megabytes(MAX_STORAGE_BYTES)} sprite storage. Remove sprites you don't need first.`);
		}
	}
	if (decoded && !entriesOf(loaded, slot.table).has(id)) {
		if (slot.table === 'Items' ? !loaded.dex.items.get(id).exists : !loaded.data.species.includes(id)) {
			throw new Chat.ErrorMessage(`${loaded.row.name} has no ${tableName(slot.table)} called "${name}".`);
		}
		const edited = slot.table === 'Items' ?
			await putEffect(loaded, 'Items', { name: slot.name }) : await putEntry(loaded, { name: slot.name });
		loaded = edited.loaded;
	}
	const entry = slot.table === 'Items' ? getEffect(loaded, 'Items', slot.name) : getEntry(loaded, slot.name);
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
	if (slot.table === 'Items') {
	} else {
	}
	await writeEntry(loaded.row.dexid, slot.table, detached);
	return saved(loaded, slot.table, id);
}

export async function deleteSprite(user: User, uploadid: string) {
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
	await sprites.remove(database(), image);
	for (const dexid of changed) await refresh(dexid);
	return { image, uses: species.length + effects.length };
}

export async function putEffect(loaded: LoadedDex, table: EffectTable, input: AnyObject) {
	const base = baseOf(loaded.row);
	const lookup = lookupTables(base, loaded.data.Pokedex, loaded.effects);
	const entry = validateEffect(input, table, base, loaded.effects[table], lookup, loaded.row.official);
	checkUnlocked(loaded, table, [entry.effectid, entry.inheritsfrom]);
	if (!base.data[table][entry.effectid]) {
		entry.num ||= newNum(table);
		entry.data.num = entry.num;
	}
	const effects = { ...loaded.effects, [table]: new Map([...loaded.effects[table], [entry.effectid, entry]]) };
	const stale: string[] = [];
	check(compile(loaded.row, loaded.entries, effects, stale));
	const broken = stale.filter(problem => !loaded.stale.includes(problem));
	if (broken.length) throw new Chat.ErrorMessage(`These changes don't work: ${broken.join('; ')}`);
	await writeEntry(loaded.row.dexid, table, entry);
	return { loaded: await saved(loaded, table, entry.effectid), entry };
}

export function getEffect<T extends EffectTable | 'TypeChart'>(loaded: LoadedDex, table: T, name: string) {
	const entry = loaded.effects[table].get(toID(name)) as Effects[T] extends Map<ID, infer E> ? E : never;
	if (!entry) {
		throw new Chat.ErrorMessage(`${loaded.row.name} has no custom or edited ${tableName(table)} called "${name}".`);
	}
	return entry;
}

export async function putType(loaded: LoadedDex, input: AnyObject) {
	const entry = validateType(input, baseOf(loaded.row), loaded.effects.TypeChart, loaded.dex);
	checkUnlocked(loaded, 'TypeChart', [entry.effectid]);
	const effects = { ...loaded.effects, TypeChart: new Map([...loaded.effects.TypeChart, [entry.effectid, entry]]) };
	check(compile(loaded.row, loaded.entries, effects));
	await writeEntry(loaded.row.dexid, 'TypeChart', entry);
	return { loaded: await saved(loaded, 'TypeChart', entry.effectid), entry };
}

export async function deleteEffect(loaded: LoadedDex, table: EffectTable | 'TypeChart', name: string) {
	const entry = getEffect(loaded, table, name);
	const effects = { ...loaded.effects, [table]: new Map(entriesOf(loaded, table)) } as Effects;
	effects[table].delete(entry.effectid);
	check(compile(loaded.row, loaded.entries, effects));
	await database().query(SQL`DELETE FROM dex_effects
		WHERE dexid = ${loaded.row.dexid} AND effecttable = ${table} AND effectid = ${entry.effectid}`);
	return saved(loaded, table, entry.effectid);
}

function originOf(source: LoadedDex, entry: Entry): Origin {
	const trim = (origin: Origin | undefined, depth: number): Origin | undefined => (
		origin && depth < MAX_ORIGINS ? { ...origin, from: trim(origin.from, depth + 1) } : undefined
	);
	return {
		dexid: source.row.dexid, dex: source.row.name, owner: source.row.ownername, name: entry.data.name,
		creator: entry.origin ? entry.origin.creator : source.row.ownerid, from: trim(entry.origin || undefined, 1),
	};
}

export function dependencies(
	source: LoadedDex, table: Table, id: ID, target: LoadedDex,
	found = new Map<string, [Table, ID, LoadedDex]>(), missing: string[] = []
) {
	const layers = ancestorsOf(source);
	const owner = layers.find(layer => entriesOf(layer, table).has(id));
	if (!owner) {
		throw new Chat.ErrorMessage(`${source.row.name} has no custom or edited ${tableName(table)} called "${id}".`);
	}
	if (found.has(`${table}:${id}`)) return found;
	found.set(`${table}:${id}`, [table, id, owner]);
	const entry = entriesOf(owner, table).get(id)!;
	const world = baseOf(target.row);
	const visit = (value: unknown) => {
		if (Array.isArray(value)) return value.forEach(visit);
		if (isObject(value)) return Object.values(value).forEach(visit);
		const ref = toID(value);
		if (typeof value !== 'string' || !ref) return;
		for (const other of TABLES) {
			if ((other === table && ref === id) || isBase(world, other, ref) || found.has(`${other}:${ref}`)) continue;
			const layer: LoadedDex | undefined = layers.find(each => entriesOf(each, other).has(ref));
			const dep = layer && entriesOf(layer, other).get(ref)!;
			if (dep && !isBase(baseOf(layer.row), other, ref) && (!dep.inheritsfrom || isBase(world, other, dep.inheritsfrom))) {
				dependencies(source, other, ref, target, found, missing);
			} else if ((dep || isBase(source.dex, other, ref)) && !isBase(target.dex, other, ref)) {
				const what = `the ${tableName(other)} ${dep?.data.name || (source.dex.data[other][ref] as AnyObject).name || ref}`;
				if (!missing.includes(what)) missing.push(what);
			}
		}
	};
	visit(entry.data);
	if (table === 'Pokedex') {
		const { learnset } = entry as SpeciesEntry;
		visit(Object.keys(learnset).filter(move => learnset[move]));
	} else if (table === 'TypeChart') {
		visit([...Object.keys(entry.data.damageTaken), ...Object.keys(entry.data.attacks)]);
	} else {
		visit(Object.values((entry as EffectEntry).slots).flatMap(edits => Object.values(edits).map(edit => edit.to)));
	}
	return found;
}

async function copyInto(
	target: LoadedDex, keys: [Table, ID, LoadedDex][],
	options: { overwrite?: boolean, update?: boolean, seen?: Set<string> } = {}
) {
	const base = baseOf(target.row);
	const entries = new Map(target.entries);
	const effects = Object.fromEntries(TABLES.slice(1).map(table => [table, new Map(entriesOf(target, table))])) as Effects;
	const species = new Set(target.row.species);
	const copied: [Table, Entry][] = [];
	for (const [table, id, source] of keys) {
		if (target.row.dexid === source.row.dexid) throw new Chat.ErrorMessage(`That's the same dex.`);
		const sourceBase = baseOf(source.row);
		const entry = entriesOf(source, table).get(id)!;
		const into: Map<ID, Entry> = table === 'Pokedex' ? entries : effects[table];
		const existing = into.get(id);
		const what = `the ${tableName(table)} ${entry.data.name}`;
		if (entry.locked && source.row.ownerid !== target.row.ownerid) {
			throw new Chat.ErrorMessage(`${what} in ${source.row.name} is locked, so only its creator can fork it.`);
		}
		if (existing && !(existing.trackdex === source.row.dexid && existing.trackid === id)) {
			if (options.update) continue;
			checkUnlocked(target, table, [id]);
			if (!options.overwrite) {
				throw new Chat.ErrorMessage(`${target.row.name} already has its own version of ${what}. Add "overwrite" to replace it.`);
			}
		}
		const official = isBase(base, table, id);
		if (official !== isBase(sourceBase, table, id)) {
			throw new Chat.ErrorMessage(official ?
				`${what} is custom in ${source.row.name}, but ${baseName(target.row)} already has one.` :
				`${what} is an edit of something ${baseName(target.row)} doesn't have.`);
		}
		if (entry.inheritsfrom && !isBase(base, table, entry.inheritsfrom)) {
			throw new Chat.ErrorMessage(`${what} copies ${entry.inheritsfrom}, which ${baseName(target.row)} doesn't have.`);
		}
		checkUnlocked(target, table, [id, entry.inheritsfrom]);
		let link: Entry | undefined = entry;
		for (let i = 0; link?.trackdex && i < 100; i++) {
			if (link.trackdex === target.row.dexid && link.trackid === id) {
				throw new Chat.ErrorMessage(`${what} in ${source.row.name} comes from ${target.row.name} already.`);
			}
			const next = dexes.get(link.trackdex);
			link = next && entriesOf(next, table).get(link.trackid!);
		}
		const copy = { ...JSON.parse(json(entry)), origin: originOf(source, entry), trackdex: source.row.dexid, trackid: id };
		copy.locked = (existing ? existing.locked : entry.locked) && copy.origin.creator === target.row.ownerid;
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
		loaded: dexes.get(loaded.row.dexid) || loaded, warnings,
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
	const source = dexes.get(dexid);
	for (const row of rows) {
		const target = dexes.get(row.dexid);
		if (!target) continue;
		try {
			if (!source || !entriesOf(source, table).has(id)) throw new Error(`The original is gone.`);
			await copyInto(target, [...dependencies(source, table, id, target).values()], { update: true, seen });
		} catch {
			await detach(dexes.get(row.dexid) || target, table, id);
		}
	}
}

export async function detach(loaded: LoadedDex, table: Table, id: ID) {
	if (table === 'Pokedex') {
		await database().query(SQL`UPDATE dex_species SET trackdex = NULL, trackid = NULL
			WHERE dexid = ${loaded.row.dexid} AND speciesid = ${id}`);
	} else {
		await database().query(SQL`UPDATE dex_effects SET trackdex = NULL, trackid = NULL
			WHERE dexid = ${loaded.row.dexid} AND effecttable = ${table} AND effectid = ${id}`);
	}
	return (await refresh(loaded.row.dexid))!;
}

export async function setLocked(loaded: LoadedDex, table: Table, name: string, locked: boolean) {
	const entry = table === 'Pokedex' ? getEntry(loaded, name) : getEffect(loaded, table, name);
	if (locked && entry.origin && entry.origin.creator !== loaded.row.ownerid) {
		throw new Chat.ErrorMessage(`${entry.data.name} was forked from someone else's, so it can't be locked, even after edits.`);
	}
	await writeEntry(loaded.row.dexid, table, { ...entry, locked });
	return saved(loaded, table, toID(name));
}

export async function forkEntry(target: LoadedDex, source: LoadedDex, table: Table, name: string, overwrite = false) {
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

export async function forkLine(target: LoadedDex, source: LoadedDex, name: string, overwrite = false) {
	const line = evoLine(source, name);
	const custom = (id: ID) => ancestorsOf(source).some(layer => layer.entries.has(id));
	const found = new Map<string, [Table, ID, LoadedDex]>();
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
	const { official, base: original } = baseEffect(base, table, id, edit);
	return {
		...describeEffect(base, table, id, loaded.effects[table].get(id), lookup),
		edited: loaded.effects[table].has(id), editable: loaded.row.official ? null : EDITABLE[table],
		data: { ...effect, ...describeText(base, table, edit, id) },
		original: original ? {
			...JSON.parse(json(original)), ...describeText(base, table, { data: {}, inherit: edit.inherit }, id),
			...(official ? {} : { countsAs: true }),
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
			const list = key === 'doublesTier' ? DOUBLES_TIERS : ['tier', 'natDexTier'].includes(key) ? TIERS : null;
			if (!list) throw new Chat.ErrorMessage(`"${key}" isn't a tier field: use tier, natDexTier or doublesTier.`);
			if (!list.includes(entry[key])) throw new Chat.ErrorMessage(`"${entry[key]}" isn't a ${key}: use one of ${list.join(', ')}.`);
			checked[key] = entry[key];
		}
		if (Object.keys(checked).length) tiers[species.id] = checked;
	}
	return Object.keys(tiers).length ? tiers : null;
}

export async function setTiers(loaded: LoadedDex, input: AnyObject) {
	const field = `${input.field}`;
	if (!['tier', 'natDexTier', 'doublesTier'].includes(field)) {
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
			for (const key of ['tier', 'doublesTier', 'natDexTier']) {
				if (!own[key] && (key === 'doublesTier' ? DOUBLES_TIERS : TIERS).includes(species[key])) resolved[key] = species[key];
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

export async function putFormat(loaded: LoadedDex, input: AnyObject) {
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
	const from: AnyObject = input.from !== undefined ? Dex.formats.get(`${input.from}`) : {};
	const lost = Object.keys(from).filter(key => typeof from[key] === 'function');
	return { loaded: await save(loaded), formatid, lost };
}

export async function deleteFormat(loaded: LoadedDex, name: string) {
	const formatid = loaded.formats.has(toID(name)) ? toID(name) :
		[...loaded.formats].find(([, data]) => toID(data.name) === toID(name))?.[0] || toID(name);
	if (!loaded.formats.has(formatid)) throw new Chat.ErrorMessage(`${loaded.row.name} has no format called "${name}".`);
	await database().query(SQL`DELETE FROM dex_formats WHERE formatid = ${formatid}`);
	return save(loaded);
}
