import * as crypto from 'crypto';
import { FS } from '../../lib';
import { SQL, PGDatabase } from '../../lib/database';
import { buildDex, buildFormat, EFFECT_TABLES, releaseDex, type DexData, type EffectTable } from '../../sim/dex-custom';
import type { ModdedDex } from '../../sim/dex';
import type { FormatData } from '../../sim/dex-formats';
import * as sprites from './sprites';
import { resolveEntries, validateEntry, validateName, type Origin, type SpeciesEntry } from './species';
import {
	describeEffect, describeText, EFFECT_NAMES, lookupTables, resolveEdits, validateEffect, type EffectEntry,
} from './effects';

export type Effects = { [table in EffectTable]: Map<ID, EffectEntry> };
export type Table = 'Pokedex' | EffectTable;
export type Visibility = 'public' | 'private';
type Entry = SpeciesEntry | EffectEntry;

export interface DexRow {
	dexid: ID;
	ownerid: string;
	ownername: string;
	name: string;
	mod: string;
	species: ID[];
	visibility: Visibility;
	origin: Origin | null;
	created: number;
	updated: number;
}

export interface LoadedDex {
	row: DexRow;
	editors: string[];
	entries: Map<ID, SpeciesEntry>;
	formats: Map<ID, FormatData>;
	effects: Effects;
	uploads: Map<string, sprites.Upload>;
	stale: string[];
	data: DexData;
	dex: ModdedDex;
}

export const MAX_DEXES = 10;
export const MAX_ENTRIES = 200;
export const MAX_FORMATS = 20;
export const MAX_EFFECTS = 300;
export const MAX_DATA_BYTES = 256 * 1024;
export const MAX_ORIGINS = 5;
export const VISIBILITIES = ['public', 'private'];

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
const isObject = (value: unknown): value is AnyObject => !!value && typeof value === 'object' && !Array.isArray(value);
const tableName = (table: Table) => table === 'Pokedex' ? 'Pokemon' : EFFECT_NAMES[table];

export function entriesOf(loaded: LoadedDex, table: Table): Map<ID, Entry> {
	return table === 'Pokedex' ? loaded.entries : loaded.effects[table];
}

function isBase(dex: ModdedDex, table: Table, id: ID) {
	return !!dex.data[table][id];
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

const noEffects = (): Effects => ({ Moves: new Map(), Abilities: new Map(), Items: new Map(), Conditions: new Map() });

function compile(row: DexRow, entries: Map<ID, SpeciesEntry>, effects: Effects, stale: string[] = []): DexData {
	const base = Dex.mod(row.mod);
	const custom = [...entries.keys()].filter(id => !base.data.Pokedex[id]);
	const resolved = resolveEntries(base, entries.values());
	const lookup = lookupTables(base, resolved.Pokedex, effects);
	const edits: NonNullable<DexData['effects']> = {};
	for (const table of EFFECT_TABLES) {
		for (const [id, entry] of effects[table]) (edits[table] ||= {})[id] = resolveEdits(base, entry, lookup, stale);
	}
	const content = {
		mod: row.mod, species: [...row.species, ...custom], ...resolved,
		...(Object.keys(edits).length ? { effects: edits } : {}),
	};
	const speciesSprites = [...entries.values()].map(entry => [entry.speciesid, entry.sprites]);
	const itemSprites = [...effects.Items.values()].filter(entry => entry.sprites.item)
		.map(entry => [entry.effectid, entry.sprites]);
	const hashed = itemSprites.length ? [content, speciesSprites, itemSprites] : [content, speciesSprites];
	const hash = crypto.createHash('sha256').update(json(hashed)).digest('hex').slice(0, 20);
	const data = { hash, ...content };
	if (Buffer.byteLength(json(data)) > MAX_DATA_BYTES) {
		throw new Chat.ErrorMessage(`That would make the dex bigger than ${MAX_DATA_BYTES / 1024}KB, the limit for one battle.`);
	}
	return data;
}

function check(data: DexData) {
	try {
		releaseDex(buildDex(data, Dex));
	} catch (e: any) {
		throw new Chat.ErrorMessage(`That doesn't work: ${e.message}`);
	}
}

function make(
	row: DexRow, editors: string[], entries: Map<ID, SpeciesEntry>, formats: Map<ID, FormatData>, effects: Effects,
	uploads: Map<string, sprites.Upload>
) {
	const stale: string[] = [];
	const data = compile(row, entries, effects, stale);
	return { row, editors, entries, formats, effects, uploads, stale, data, dex: buildDex(data, Dex) };
}

export function refresh(dexid: ID) {
	const next = (refreshing.get(dexid) || Promise.resolve(null)).catch(() => null).then(() => reload(dexid));
	refreshing.set(dexid, next);
	return next;
}

async function reload(dexid: ID) {
	const [[row], editors, entries, formats, effectRows] = await Promise.all([
		database().query<DexRow>(SQL`SELECT * FROM dexes WHERE dexid = ${dexid}`),
		database().query<{ accountid: string }>(SQL`SELECT accountid FROM dex_editors WHERE dexid = ${dexid}`),
		database().query<SpeciesEntry>(SQL`SELECT * FROM dex_species WHERE dexid = ${dexid}`),
		database().query<{ formatid: ID, data: FormatData }>(SQL`SELECT * FROM dex_formats WHERE dexid = ${dexid}`),
		database().query<EffectEntry>(SQL`SELECT * FROM dex_effects WHERE dexid = ${dexid}`),
	]);
	const effects = noEffects();
	for (const entry of effectRows) effects[entry.effecttable]?.set(entry.effectid, entry);
	const uploads = await sprites.getUploads(database(), [...new Set(
		[...entries, ...effectRows].flatMap(entry => Object.values(entry.sprites))
	)]);
	if (registeredOn !== Dex) reregister();
	const loaded = row ? make(
		{ ...row, created: Number(row.created), updated: Number(row.updated) },
		editors.map(editor => editor.accountid),
		new Map(entries.map(entry => [entry.speciesid, entry])),
		new Map(formats.map(format => [format.formatid, format.data])),
		effects, uploads,
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

export function spriteShas(loaded: LoadedDex, entrySprites: { [kind: string]: string }) {
	const shas: { [kind: string]: string } = {};
	for (const kind in entrySprites) {
		const image = loaded.uploads.get(entrySprites[kind]);
		if (image) shas[kind] = image.sha;
	}
	return shas;
}

export function clientData(loaded: LoadedDex) {
	const speciesSprites: { [speciesid: string]: { [kind: string]: string } } = {};
	const credits: { [sha: string]: { uploader: string, dex: string } } = {};
	for (const image of loaded.uploads.values()) credits[image.sha] = { uploader: image.uploadername, dex: image.dexname };
	for (const entry of loaded.entries.values()) {
		const shas = spriteShas(loaded, entry.sprites);
		if (Object.keys(shas).length) speciesSprites[entry.speciesid] = shas;
	}
	const { hash, mod, species, Pokedex, Learnsets, FormatsData } = loaded.data;
	const effects: { [table: string]: AnyObject } = {};
	const itemSprites: { [itemid: string]: string } = {};
	for (const table of EFFECT_TABLES) {
		for (const [id, entry] of loaded.effects[table]) {
			const effect = JSON.parse(json(loaded.dex.data[table][id]));
			const edit = loaded.data.effects![table]![id];
			(effects[table] ||= {})[id] = { ...effect, ...describeText(Dex.mod(mod), table, edit, effect, id) };
			const sha = spriteShas(loaded, entry.sprites).item;
			if (sha) itemSprites[id] = sha;
		}
	}
	return {
		hash, dexid: loaded.row.dexid, name: loaded.row.name, mod, species, Pokedex, Learnsets, FormatsData,
		sprites: speciesSprites, ...effects, ...(Object.keys(itemSprites).length ? { itemSprites } : {}),
		...(Object.keys(credits).length ? { credits } : {}),
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

export function knownAccount(user: User) {
	return user.registered ? accounts.get(user.id) || null : null;
}

export function listed(loaded: LoadedDex, account: string | null) {
	return loaded.row.visibility === 'public' ||
		(!!account && (loaded.row.ownerid === account || loaded.editors.includes(account)));
}

export function search(text: string, account: string | null) {
	const query = toID(text);
	return [...dexes.values()].filter(loaded => listed(loaded, account) && loaded.row.dexid.includes(query));
}

export async function dexesOf(name: string, account: string | null) {
	const [result] = await LoginServer.request('discord/names', { userid: toID(name) });
	const owner = result?.discordid ? `${result.discordid}` : null;
	return [...dexes.values()].filter(loaded => listed(loaded, account) && (owner ?
		loaded.row.ownerid === owner || loaded.editors.includes(owner) : toID(loaded.row.ownername) === toID(name)));
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
	if (loaded.row.ownerid !== account && !loaded.editors.includes(account) && !user.can('bypassall')) {
		throw new Chat.ErrorMessage(`You can't edit ${loaded.row.name}.`);
	}
	return loaded;
}

export async function createDex(user: User, name: string, mod: string, from?: LoadedDex) {
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
	const species = from ? from.row.species : base.includeData().species.all()
		.filter(entry => entry.exists && !entry.isNonstandard).map(entry => entry.id);
	const origin: Origin | null = from ?
		{ dexid: from.row.dexid, dex: from.row.name, owner: from.row.ownername, name: from.row.name } : null;
	const now = Date.now();
	await database().query(SQL`INSERT INTO dexes
		(dexid, ownerid, ownername, name, mod, species, visibility, origin, created, updated) VALUES (
		${dexid}, ${account}, ${user.name}, ${name}, ${modid}, ${json(species)}, 'public', ${json(origin)}, ${now}, ${now}
	)`);
	return (await refresh(dexid))!;
}

export async function deleteDex(loaded: LoadedDex) {
	const dexid = loaded.row.dexid;
	await database().query(SQL`DELETE FROM dexes WHERE dexid = ${dexid}`);
	await refresh(dexid);
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
		(dexid, effecttable, effectid, num, inheritsfrom, data, slots, events, sprites, origin, trackdex, trackid, updated)
		VALUES (
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
	compile({ ...loaded.row, species }, loaded.entries, loaded.effects);
	await database().query(SQL`UPDATE dexes SET species = ${json(species)} WHERE dexid = ${loaded.row.dexid}`);
	return save(loaded);
}

export async function putEntry(loaded: LoadedDex, input: AnyObject) {
	const entry = validateEntry(input, Dex.mod(loaded.row.mod), loaded.entries, loaded.dex);
	if (!loaded.entries.has(entry.speciesid) && loaded.entries.size >= MAX_ENTRIES) {
		throw new Chat.ErrorMessage(`A dex can have at most ${MAX_ENTRIES} custom or edited Pokemon.`);
	}
	if (!entry.num && !Dex.mod(loaded.row.mod).data.Pokedex[entry.speciesid]) {
		entry.num = Math.min(-10000, ...[...loaded.entries.values()].map(other => other.num)) - 1;
	}
	check(compile(loaded.row, new Map([...loaded.entries, [entry.speciesid, entry]]), loaded.effects));
	await writeEntry(loaded.row.dexid, 'Pokedex', entry);
	return { loaded: await saved(loaded, 'Pokedex', entry.speciesid), entry };
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
	return saved(loaded, 'Pokedex', entry.speciesid);
}

export async function setSprite(user: User, loaded: LoadedDex, name: string, kind: string, image: string | null) {
	const table: Table = kind === 'item' ? 'Items' : 'Pokedex';
	const entry = table === 'Items' ? getEffect(loaded, 'Items', name) : getEntry(loaded, name);
	const entrySprites = { ...entry.sprites };
	if (image === null) {
		if (!entrySprites[kind]) throw new Chat.ErrorMessage(`${entry.data.name} has no ${kind} sprite.`);
		delete entrySprites[kind];
	} else {
		const decoded = sprites.decode(kind, image);
		entrySprites[kind] = await sprites.upload(database(), decoded, kind, await accountOf(user), user.name, loaded.row);
	}
	await writeEntry(loaded.row.dexid, table, { ...entry, sprites: entrySprites, trackdex: null, trackid: null });
	return saved(loaded, table, toID(name));
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
	const base = Dex.mod(loaded.row.mod);
	const lookup = lookupTables(base, loaded.data.Pokedex, loaded.effects);
	const entry = validateEffect(input, table, base, loaded.effects[table], lookup);
	const count = EFFECT_TABLES.reduce((total, other) => total + loaded.effects[other].size, 0);
	if (!loaded.effects[table].has(entry.effectid) && count >= MAX_EFFECTS) {
		throw new Chat.ErrorMessage(`A dex can have at most ${MAX_EFFECTS} custom or edited moves, abilities, items and conditions.`);
	}
	if (!base.data[table][entry.effectid]) {
		entry.num ||= Math.min(-10000, ...[...loaded.effects[table].values()].map(other => other.num)) - 1;
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

export function getEffect(loaded: LoadedDex, table: EffectTable, name: string) {
	const entry = loaded.effects[table].get(toID(name));
	if (!entry) {
		throw new Chat.ErrorMessage(`${loaded.row.name} has no custom or edited ${EFFECT_NAMES[table]} called "${name}".`);
	}
	return entry;
}

export async function deleteEffect(loaded: LoadedDex, table: EffectTable, name: string) {
	const entry = getEffect(loaded, table, name);
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
		from: trim(entry.origin || undefined, 1),
	};
}

export function dependencies(source: LoadedDex, table: Table, id: ID, found = new Map<string, [Table, ID]>()) {
	const entry = entriesOf(source, table).get(id);
	if (!entry) {
		throw new Chat.ErrorMessage(`${source.row.name} has no custom or edited ${tableName(table)} called "${id}".`);
	}
	if (found.has(`${table}:${id}`)) return found;
	found.set(`${table}:${id}`, [table, id]);
	const base = Dex.mod(source.row.mod);
	const visit = (value: unknown) => {
		if (Array.isArray(value)) return value.forEach(visit);
		if (isObject(value)) return Object.values(value).forEach(visit);
		const ref = toID(value);
		if (typeof value !== 'string' || !ref) return;
		for (const other of ['Pokedex', ...EFFECT_TABLES] as Table[]) {
			if ((other !== table || ref !== id) && !isBase(base, other, ref) && entriesOf(source, other).has(ref)) {
				dependencies(source, other, ref, found);
			}
		}
	};
	visit(entry.data);
	if (table === 'Pokedex') {
		visit(Object.keys((entry as SpeciesEntry).learnset));
	} else {
		visit(Object.values((entry as EffectEntry).slots).flatMap(edits => Object.values(edits).map(edit => edit.to)));
	}
	return found;
}

async function copyInto(
	target: LoadedDex, source: LoadedDex, keys: [Table, ID][],
	options: { overwrite?: boolean, update?: boolean, seen?: Set<string> } = {}
) {
	if (target.row.dexid === source.row.dexid) throw new Chat.ErrorMessage(`That's the same dex.`);
	const base = Dex.mod(target.row.mod);
	const sourceBase = Dex.mod(source.row.mod);
	const entries = new Map(target.entries);
	const effects = Object.fromEntries(EFFECT_TABLES.map(table => [table, new Map(target.effects[table])])) as Effects;
	const species = new Set(target.row.species);
	const copied: [Table, Entry][] = [];
	for (const [table, id] of keys) {
		const entry = entriesOf(source, table).get(id)!;
		const into: Map<ID, Entry> = table === 'Pokedex' ? entries : effects[table];
		const existing = into.get(id);
		const what = `the ${tableName(table)} ${entry.data.name}`;
		if (existing && !(existing.trackdex === source.row.dexid && existing.trackid === id)) {
			if (options.update) continue;
			if (!options.overwrite) {
				throw new Chat.ErrorMessage(`${target.row.name} already has its own version of ${what}. Add "overwrite" to replace it.`);
			}
		}
		const official = isBase(base, table, id);
		if (official !== isBase(sourceBase, table, id)) {
			throw new Chat.ErrorMessage(official ?
				`${what} is custom in ${source.row.name}, but ${target.row.mod} already has one.` :
				`${what} is an edit of something ${target.row.mod} doesn't have.`);
		}
		if (entry.inheritsfrom && !isBase(base, table, entry.inheritsfrom)) {
			throw new Chat.ErrorMessage(`${what} copies ${entry.inheritsfrom}, which ${target.row.mod} doesn't have.`);
		}
		let link: Entry | undefined = entry;
		for (let i = 0; link?.trackdex && i < 100; i++) {
			if (link.trackdex === target.row.dexid && link.trackid === id) {
				throw new Chat.ErrorMessage(`${what} in ${source.row.name} comes from ${target.row.name} already.`);
			}
			const next = dexes.get(link.trackdex);
			link = next && entriesOf(next, table).get(link.trackid!);
		}
		const copy = { ...JSON.parse(json(entry)), origin: originOf(source, entry), trackdex: source.row.dexid, trackid: id };
		copy.num = official ? existing?.num || 0 :
			existing?.num || Math.min(-10000, ...[...into.values()].map(other => other.num)) - 1;
		if (table !== 'Pokedex' && !official) copy.data.num = copy.num;
		into.set(id, copy);
		if (table === 'Pokedex' && official) species.add(id);
		copied.push([table, copy]);
	}
	const count = (all: Effects) => EFFECT_TABLES.reduce((total, table) => total + all[table].size, 0);
	if (entries.size > MAX_ENTRIES && entries.size > target.entries.size) {
		throw new Chat.ErrorMessage(`A dex can have at most ${MAX_ENTRIES} custom or edited Pokemon.`);
	}
	if (count(effects) > MAX_EFFECTS && count(effects) > count(target.effects)) {
		throw new Chat.ErrorMessage(`A dex can have at most ${MAX_EFFECTS} custom or edited moves, abilities, items and conditions.`);
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
			await copyInto(target, source, [...dependencies(source, table, id).values()], { update: true, seen });
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

export function importEntry(target: LoadedDex, source: LoadedDex, table: Table, name: string, overwrite = false) {
	return copyInto(target, source, [...dependencies(source, table, toID(name)).values()], { overwrite });
}

export async function importDex(user: User, name: string, source: LoadedDex) {
	let loaded = await createDex(user, name, source.row.mod, source);
	try {
		const keys: [Table, ID][] = (['Pokedex', ...EFFECT_TABLES] as Table[])
			.flatMap(table => [...entriesOf(source, table).keys()].map(id => [table, id] as [Table, ID]));
		const result = keys.length ? await copyInto(loaded, source, keys) : { loaded, copied: [], warnings: [] };
		loaded = result.loaded;
		for (const data of source.formats.values()) {
			try {
				({ loaded } = await putFormat(loaded, data));
			} catch (e: any) {
				result.warnings.push(`the format ${data.name}: ${e.message}`);
			}
		}
		return { ...result, loaded };
	} catch (e) {
		await deleteDex(dexes.get(loaded.row.dexid) || loaded);
		throw e;
	}
}

export function effectEditor(loaded: LoadedDex, table: EffectTable, name: string) {
	const id = toID(name);
	const base = Dex.mod(loaded.row.mod);
	if (!loaded.effects[table].has(id) && !base.data[table][id]) {
		throw new Chat.ErrorMessage(`There's no ${EFFECT_NAMES[table]} called "${name}" in ${loaded.row.name}.`);
	}
	const lookup = lookupTables(base, loaded.data.Pokedex, loaded.effects);
	const effect = JSON.parse(json(loaded.dex.data[table][id]));
	const edit = loaded.data.effects?.[table]?.[id] || { data: {} };
	return {
		...describeEffect(base, table, id, loaded.effects[table].get(id), lookup),
		data: { ...effect, ...describeText(base, table, edit, effect, id) },
	};
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
