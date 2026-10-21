import * as crypto from 'crypto';
import { FS } from '../../lib';
import { SQL, PGDatabase } from '../../lib/database';
import { buildDex, buildFormat, releaseDex, type DexData } from '../../sim/dex-custom';
import type { ModdedDex } from '../../sim/dex';
import type { FormatData } from '../../sim/dex-formats';
import * as sprites from './sprites';
import { resolveEntries, validateEntry, validateName, type SpeciesEntry } from './species';

export interface DexRow {
	dexid: ID;
	ownerid: string;
	ownername: string;
	name: string;
	mod: string;
	species: ID[];
	created: number;
	updated: number;
}

export interface LoadedDex {
	row: DexRow;
	editors: string[];
	entries: Map<ID, SpeciesEntry>;
	formats: Map<ID, FormatData>;
	data: DexData;
	dex: ModdedDex;
}

export const MAX_DEXES = 10;
export const MAX_ENTRIES = 200;
export const MAX_FORMATS = 20;
export const MAX_DATA_BYTES = 256 * 1024;

const GAME_TYPES = ['singles', 'doubles', 'triples', 'multi', 'freeforall'];
const FORMAT_LISTS = ['ruleset', 'banlist', 'unbanlist', 'restricted'];
const FORMAT_FLAGS = ['bestOfDefault', 'teraPreviewDefault'];

export const dexes = new Map<ID, LoadedDex>();
const formatDexes = new Map<ID, ID>();
const savedSnapshots = new Set<string>();
const refreshing = new Map<ID, Promise<LoadedDex | null>>();
const accounts = new Map<ID, string>();
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
	for (const loaded of dexes.values()) {
		releaseDex(loaded.dex);
		loaded.dex = buildDex(loaded.data, Dex);
		register(loaded);
	}
	registeredOn = Dex;
}

function formatData(loaded: LoadedDex, data: FormatData): FormatData {
	return {
		...data, name: `[${loaded.row.name}] ${data.name}`, searchShow: false, challengeShow: true, tournamentShow: true,
	};
}

function register(loaded: LoadedDex) {
	for (const [formatid, data] of loaded.formats) {
		Dex.formats.rulesetCache.set(formatid, buildFormat(loaded.dex, formatData(loaded, data)));
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

function compile(row: DexRow, entries: Map<ID, SpeciesEntry>): DexData {
	const base = Dex.mod(row.mod);
	const custom = [...entries.keys()].filter(id => !base.data.Pokedex[id]);
	const content = { mod: row.mod, species: [...row.species, ...custom], ...resolveEntries(base, entries.values()) };
	const spriteShas = [...entries.values()].map(entry => [entry.speciesid, entry.sprites]);
	const hash = crypto.createHash('sha256').update(json([content, spriteShas])).digest('hex').slice(0, 20);
	const data = { hash, ...content };
	if (Buffer.byteLength(json(data)) > MAX_DATA_BYTES) {
		throw new Chat.ErrorMessage(`That would make the dex bigger than ${MAX_DATA_BYTES / 1024}KB, the limit for one battle.`);
	}
	return data;
}

function make(row: DexRow, editors: string[], entries: Map<ID, SpeciesEntry>, formats: Map<ID, FormatData>) {
	const data = compile(row, entries);
	return { row, editors, entries, formats, data, dex: buildDex(data, Dex) };
}

export function refresh(dexid: ID) {
	const next = (refreshing.get(dexid) || Promise.resolve(null)).catch(() => null).then(() => reload(dexid));
	refreshing.set(dexid, next);
	return next;
}

async function reload(dexid: ID) {
	const [[row], editors, entries, formats] = await Promise.all([
		database().query<DexRow>(SQL`SELECT * FROM dexes WHERE dexid = ${dexid}`),
		database().query<{ accountid: string }>(SQL`SELECT accountid FROM dex_editors WHERE dexid = ${dexid}`),
		database().query<SpeciesEntry>(SQL`SELECT * FROM dex_species WHERE dexid = ${dexid}`),
		database().query<{ formatid: ID, data: FormatData }>(SQL`SELECT * FROM dex_formats WHERE dexid = ${dexid}`),
	]);
	if (registeredOn !== Dex) reregister();
	const loaded = row ? make(
		{ ...row, created: Number(row.created), updated: Number(row.updated) },
		editors.map(editor => editor.accountid),
		new Map(entries.map(entry => [entry.speciesid, entry])),
		new Map(formats.map(format => [format.formatid, format.data])),
	) : null;
	const old = dexes.get(dexid);
	if (old) unregister(old);
	if (loaded) {
		dexes.set(dexid, loaded);
		register(loaded);
	} else {
		dexes.delete(dexid);
	}
	return loaded;
}

export function getDex(name: string) {
	const loaded = dexes.get(toID(name));
	if (!loaded) throw new Chat.ErrorMessage(`There's no dex called "${name}".`);
	return loaded;
}

export function battleData(formatid: string): DexData | undefined {
	const loaded = dexes.get(formatDexes.get(toID(formatid))!);
	const data = loaded?.formats.get(toID(formatid));
	if (!loaded || !data) return undefined;
	return { ...loaded.data, format: formatData(loaded, data) };
}

export function clientData(loaded: LoadedDex) {
	const spriteShas: { [speciesid: string]: { [kind: string]: string } } = {};
	for (const entry of loaded.entries.values()) {
		if (Object.keys(entry.sprites).length) spriteShas[entry.speciesid] = entry.sprites;
	}
	const { hash, mod, species, Pokedex, Learnsets, FormatsData } = loaded.data;
	return {
		hash, dexid: loaded.row.dexid, name: loaded.row.name, mod, species, Pokedex, Learnsets, FormatsData,
		sprites: spriteShas,
	};
}

export async function saveSnapshot(formatid: string) {
	const loaded = dexes.get(formatDexes.get(toID(formatid))!);
	if (!loaded || savedSnapshots.has(loaded.data.hash)) return;
	const data = clientData(loaded);
	await database().query(SQL`INSERT INTO dex_snapshots (hash, dexid, data, created) VALUES (
		${data.hash}, ${data.dexid}, ${json(data)}, ${Date.now()}
	) ON CONFLICT (hash) DO NOTHING`);
	await writeSnapshot(data.hash, data);
	savedSnapshots.add(data.hash);
}

async function writeSnapshot(hash: string, data: AnyObject) {
	const path = FS(`${Config.dexsnapshotpath || 'dex-snapshots'}/${hash}.json`);
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
	return { snapshots: hashes.length, written, sprites: await sprites.rebuild(database()) };
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

export async function editable(user: User, name: string) {
	const loaded = getDex(name);
	const account = await accountOf(user);
	if (loaded.row.ownerid !== account && !loaded.editors.includes(account) && !user.can('bypassall')) {
		throw new Chat.ErrorMessage(`You can't edit ${loaded.row.name}.`);
	}
	return loaded;
}

export async function createDex(user: User, name: string, mod: string) {
	name = validateName(name, 'dex');
	const dexid = toID(name);
	if (dexid.length > 20) throw new Chat.ErrorMessage(`Dex names can be at most 20 letters and numbers long.`);
	if (dexes.has(dexid)) throw new Chat.ErrorMessage(`There's already a dex called ${dexes.get(dexid)!.row.name}.`);
	const modid = toID(mod);
	const base = Dex.dexes[modid];
	if (!base || modid.startsWith('dex')) {
		throw new Chat.ErrorMessage(`"${mod}" isn't a dex you can build on. Try gen9, or another mod's id.`);
	}
	const account = await accountOf(user);
	const owned = [...dexes.values()].filter(loaded => loaded.row.ownerid === account).length;
	if (owned >= MAX_DEXES && !user.can('bypassall')) {
		throw new Chat.ErrorMessage(`You can own at most ${MAX_DEXES} dexes.`);
	}
	const species = base.includeData().species.all()
		.filter(entry => entry.exists && !entry.isNonstandard).map(entry => entry.id);
	const now = Date.now();
	await database().query(SQL`INSERT INTO dexes (dexid, ownerid, ownername, name, mod, species, created, updated) VALUES (
		${dexid}, ${account}, ${user.name}, ${name}, ${modid}, ${json(species)}, ${now}, ${now}
	)`);
	return (await refresh(dexid))!;
}

export async function deleteDex(loaded: LoadedDex) {
	await database().query(SQL`DELETE FROM dexes WHERE dexid = ${loaded.row.dexid}`);
	await refresh(loaded.row.dexid);
}

async function save(loaded: LoadedDex) {
	await database().query(SQL`UPDATE dexes SET updated = ${Date.now()} WHERE dexid = ${loaded.row.dexid}`);
	return (await refresh(loaded.row.dexid))!;
}

export function findSpecies(loaded: LoadedDex, names: string[]) {
	const base = Dex.mod(loaded.row.mod);
	const ids = new Set<ID>();
	for (const name of names) {
		const species = base.species.get(name);
		if (!species.exists || !base.data.Pokedex[species.id]) {
			throw new Chat.ErrorMessage(`"${name}" isn't a Pokemon in ${base.currentMod}.`);
		}
		const formes = species.baseSpecies === species.name ? species.formeOrder || [species.name] : [species.name];
		for (const forme of formes) {
			if (base.data.Pokedex[toID(forme)]) ids.add(toID(forme));
		}
	}
	return ids;
}

export async function setSpecies(loaded: LoadedDex, ids: Set<ID>, add: boolean) {
	const species = add ?
		[...new Set([...loaded.row.species, ...ids])] : loaded.row.species.filter(id => !ids.has(id));
	compile({ ...loaded.row, species }, loaded.entries);
	await database().query(SQL`UPDATE dexes SET species = ${json(species)} WHERE dexid = ${loaded.row.dexid}`);
	return save(loaded);
}

export async function putEntry(loaded: LoadedDex, input: AnyObject) {
	const entry = validateEntry(input, Dex.mod(loaded.row.mod), loaded.entries);
	if (!loaded.entries.has(entry.speciesid) && loaded.entries.size >= MAX_ENTRIES) {
		throw new Chat.ErrorMessage(`A dex can have at most ${MAX_ENTRIES} custom or edited Pokemon.`);
	}
	if (!entry.num && !Dex.mod(loaded.row.mod).data.Pokedex[entry.speciesid]) {
		entry.num = Math.min(-10000, ...[...loaded.entries.values()].map(other => other.num)) - 1;
	}
	compile(loaded.row, new Map([...loaded.entries, [entry.speciesid, entry]]));
	await database().query(SQL`INSERT INTO dex_species
		(dexid, speciesid, num, inheritsfrom, data, learnset, sprites, updated) VALUES (
		${loaded.row.dexid}, ${entry.speciesid}, ${entry.num}, ${entry.inheritsfrom}, ${json(entry.data)},
		${json(entry.learnset)}, ${json(entry.sprites)}, ${Date.now()}
	) ON CONFLICT (dexid, speciesid) DO UPDATE SET inheritsfrom = EXCLUDED.inheritsfrom, data = EXCLUDED.data,
		learnset = EXCLUDED.learnset, updated = EXCLUDED.updated`);
	return { loaded: await save(loaded), entry };
}

export function getEntry(loaded: LoadedDex, name: string) {
	const entry = loaded.entries.get(toID(name));
	if (!entry) throw new Chat.ErrorMessage(`${loaded.row.name} has no custom or edited Pokemon called "${name}".`);
	return entry;
}

export async function deleteEntry(loaded: LoadedDex, name: string) {
	const entry = getEntry(loaded, name);
	await database().query(SQL`DELETE FROM dex_species
		WHERE dexid = ${loaded.row.dexid} AND speciesid = ${entry.speciesid}`);
	return save(loaded);
}

export async function setSprite(loaded: LoadedDex, name: string, kind: string, image: string | null) {
	const entry = getEntry(loaded, name);
	const entrySprites = { ...entry.sprites };
	if (image === null) {
		if (!entrySprites[kind]) throw new Chat.ErrorMessage(`${entry.data.name} has no ${kind} sprite.`);
		delete entrySprites[kind];
	} else {
		const decoded = sprites.decode(kind, image);
		await sprites.save(database(), decoded);
		entrySprites[kind] = decoded.sha;
	}
	await database().query(SQL`UPDATE dex_species SET sprites = ${json(entrySprites)}, updated = ${Date.now()}
		WHERE dexid = ${loaded.row.dexid} AND speciesid = ${entry.speciesid}`);
	return save(loaded);
}

function validateFormat(loaded: LoadedDex, input: AnyObject, old?: FormatData): FormatData {
	const data: AnyObject = { ...old, name: validateName(input.name, 'format') };
	for (const field in input) {
		const value = input[field];
		if (field === 'name') continue;
		if (field === 'gameType') {
			if (!GAME_TYPES.includes(value)) throw new Chat.ErrorMessage(`"gameType" must be one of: ${GAME_TYPES.join(', ')}.`);
			if (old && (old.gameType || 'singles') !== value) {
				throw new Chat.ErrorMessage(`A format's game type can't change; make a new format instead.`);
			}
		} else if (FORMAT_LISTS.includes(field)) {
			if (!Array.isArray(value) || value.length > 200 || value.some(rule => typeof rule !== 'string' || rule.length > 100)) {
				throw new Chat.ErrorMessage(`"${field}" must be a list of rule names.`);
			}
		} else if (FORMAT_FLAGS.includes(field)) {
			if (typeof value !== 'boolean') throw new Chat.ErrorMessage(`"${field}" must be true or false.`);
		} else {
			throw new Chat.ErrorMessage(`"${field}" isn't something you can set. You can set: name, gameType, ${[...FORMAT_LISTS, ...FORMAT_FLAGS].join(', ')}.`);
		}
		data[field] = value;
	}
	if (!data.ruleset) data.ruleset = ['Standard'];
	try {
		Dex.formats.getRuleTable(buildFormat(loaded.dex, formatData(loaded, data as FormatData)));
	} catch (e: any) {
		throw new Chat.ErrorMessage(`That format doesn't work: ${e.message}`);
	}
	return data as FormatData;
}

export async function putFormat(loaded: LoadedDex, input: AnyObject) {
	if (typeof input.name !== 'string') throw new Chat.ErrorMessage(`A format needs a name.`);
	const formatid = toID(`${loaded.row.name}${input.name}`) as ID;
	const old = loaded.formats.get(formatid);
	if (!old && Dex.formats.get(formatid).exists) {
		throw new Chat.ErrorMessage(`There's already a format called ${Dex.formats.get(formatid).name}.`);
	}
	if (!old && loaded.formats.size >= MAX_FORMATS) {
		throw new Chat.ErrorMessage(`A dex can have at most ${MAX_FORMATS} formats.`);
	}
	if (formatid.length > 40) {
		throw new Chat.ErrorMessage(`The dex and format names together can be at most 40 letters and numbers.`);
	}
	const data = validateFormat(loaded, input, old);
	await database().query(SQL`INSERT INTO dex_formats (formatid, dexid, data, updated) VALUES (
		${formatid}, ${loaded.row.dexid}, ${json(data)}, ${Date.now()}
	) ON CONFLICT (formatid) DO UPDATE SET data = EXCLUDED.data, updated = EXCLUDED.updated`);
	return { loaded: await save(loaded), formatid };
}

export async function deleteFormat(loaded: LoadedDex, name: string) {
	const formatid = loaded.formats.has(toID(name)) ? toID(name) : toID(`${loaded.row.name}${name}`);
	if (!loaded.formats.has(formatid)) throw new Chat.ErrorMessage(`${loaded.row.name} has no format called "${name}".`);
	await database().query(SQL`DELETE FROM dex_formats WHERE formatid = ${formatid}`);
	return save(loaded);
}
