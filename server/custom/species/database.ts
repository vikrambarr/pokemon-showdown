/**
 * Storage for user-authored Pokemon species.
 *
 * Postgres only, on the pool in ../database.ts. Everything user-facing lives in
 * chat-plugins/custom-species.ts; this file returns data, never messages.
 */
import { SQL, type PGDatabase, type DatabaseTable } from '../../../lib/database';
import { countOwned, ensureSchema, getTable } from '../database';

/**
 * Dex number band for custom species. Negative `num` is upstream's convention for
 * non-canonical Pokemon; CAP occupies -1 to -5014, so start well clear of it.
 */
const NUM_BASE = -100000;

/** How many custom species one account may own. */
export const MAX_CUSTOM_SPECIES = 100;

export interface CustomSpeciesRow {
	entryid: number;
	ownerid: ID;
	speciesid: ID;
	name: string;
	num: number;
	/** null = standalone; otherwise a real species id whose data `species` overrides */
	inheritsfrom: ID | null;
	/** SpeciesData, or just the overrides when inheritsfrom is set */
	species: AnyObject;
	/** LearnsetData['learnset'] */
	learnset: AnyObject;
	/** {kind: sha} projection of CustomSpeciesSpriteRow */
	sprites: { [kind: string]: string };
	notes: string | null;
	/** password */
	private: string | null;
	views: number;
	date: Date;
	updated: Date;
}

export interface CustomSpeciesSpriteRow {
	entryid: number;
	kind: string;
	sha: string;
	width: number;
	height: number;
	bytes: number;
	data: Buffer;
	updated: Date;
}

export let entries: DatabaseTable<CustomSpeciesRow, PGDatabase> | undefined;
export let sprites: DatabaseTable<CustomSpeciesSpriteRow, PGDatabase> | undefined;

export function connect() {
	entries = getTable<CustomSpeciesRow>(Config.custompokemon, 'custom_species', 'entryid');
	// No single-column primary key: (entryid, kind).
	sprites = getTable<CustomSpeciesSpriteRow>(Config.custompokemon, 'custom_species_sprites');
	return ensureSchema(entries, 'custom-species.sql');
}

/** JSONB columns have to be passed as text; the driver sends `$n` untyped and Postgres casts. */
const json = (value: AnyObject) => JSON.stringify(value ?? {});

export async function create(entry: {
	ownerid: ID, speciesid: ID, name: string, inheritsfrom: ID | null,
	species: AnyObject, learnset: AnyObject, notes: string | null,
}) {
	const now = new Date().toISOString();
	const row = await entries!.queryOne<{ entryid: number }>()`INSERT INTO custom_species (${{
		...entry, num: 0, species: json(entry.species), learnset: json(entry.learnset),
		sprites: json({}), views: 0, date: now, updated: now,
	}}) RETURNING entryid`;
	await entries!.update(row!.entryid, { num: NUM_BASE - row!.entryid });
	return (await getById(row!.entryid))!;
}

export function getById(entryid: number) {
	return entries!.get(entryid);
}

export function get(ownerid: ID, speciesid: ID) {
	return entries!.selectOne()`WHERE ownerid = ${ownerid} AND speciesid = ${speciesid}`;
}

export function list(ownerid: ID, limit: number, publicOnly = false) {
	const publicOnlyQuery = publicOnly ? SQL`AND private IS NULL ` : SQL``;
	return entries!.selectAll(
		['entryid', 'ownerid', 'speciesid', 'name', 'num', 'inheritsfrom', 'species',
			'sprites', 'notes', 'private', 'views', 'date', 'updated']
	)`WHERE ownerid = ${ownerid} ${publicOnlyQuery}ORDER BY updated DESC LIMIT ${limit}`;
}

/** Just enough to check a name against the owner's other entries. */
export function ownedNames(ownerid: ID) {
	return entries!.selectAll(
		['entryid', 'ownerid', 'speciesid', 'name', 'private']
	)`WHERE ownerid = ${ownerid} LIMIT ${MAX_CUSTOM_SPECIES}`;
}

/** Everything an owner's entries need to become dex data. */
export function collection(ownerid: ID, limit = MAX_CUSTOM_SPECIES) {
	return entries!.selectAll(
		['entryid', 'name', 'num', 'inheritsfrom', 'species', 'learnset', 'sprites']
	)`WHERE ownerid = ${ownerid} ORDER BY updated DESC LIMIT ${limit}`;
}

export function count(ownerid: ID) {
	return countOwned(entries!, 'custom_species', ownerid);
}

export function update(entryid: number, data: {
	speciesid?: ID, name?: string, inheritsfrom?: ID | null, species?: AnyObject,
	learnset?: AnyObject, sprites?: AnyObject, notes?: string | null, private?: string | null,
}) {
	const patch: AnyObject = { ...data, updated: new Date().toISOString() };
	for (const field of ['species', 'learnset', 'sprites'] as const) {
		if (data[field]) patch[field] = json(data[field]);
	}
	return entries!.update(entryid, patch);
}

export function remove(entryid: number) {
	// custom_species_sprites is ON DELETE CASCADE, so its rows go too.
	return entries!.delete(entryid);
}

export function bumpViews(entryid: number) {
	return entries!.updateOne(SQL`views = views + 1`)`WHERE entryid = ${entryid}`;
}

export interface SearchFilters {
	owner?: ID;
	type?: string;
	ability?: string;
	move?: string;
	minbst?: number;
	maxbst?: number;
}

export function search(filters: SearchFilters, limit: number) {
	const where = [SQL`WHERE private IS NULL`];
	if (filters.owner) where.push(SQL` AND ownerid = ${filters.owner}`);
	// jsonb containment, so custom_species_data_idx serves it.
	if (filters.type) where.push(SQL` AND species @> ${json({ types: [filters.type] })}`);
	if (filters.ability) {
		// abilities is {0, 1, H, S}, not an array, so containment won't do.
		where.push(SQL` AND EXISTS (
			SELECT 1 FROM jsonb_each_text(COALESCE(species -> 'abilities', '{}'::jsonb)) a
			WHERE a.value = ${filters.ability}
		)`);
	}
	if (filters.move) where.push(SQL` AND learnset ? ${filters.move}`);
	const bst = SQL`(
		COALESCE((species -> 'baseStats' ->> 'hp')::int, 0) +
		COALESCE((species -> 'baseStats' ->> 'atk')::int, 0) +
		COALESCE((species -> 'baseStats' ->> 'def')::int, 0) +
		COALESCE((species -> 'baseStats' ->> 'spa')::int, 0) +
		COALESCE((species -> 'baseStats' ->> 'spd')::int, 0) +
		COALESCE((species -> 'baseStats' ->> 'spe')::int, 0)
	)`;
	if (filters.minbst) where.push(SQL` AND ${bst} >= ${filters.minbst}`);
	if (filters.maxbst) where.push(SQL` AND ${bst} <= ${filters.maxbst}`);
	return entries!.selectAll()`${where} ORDER BY updated DESC LIMIT ${limit}`;
}

export function getSprite(entryid: number, kind: string) {
	return sprites!.selectOne()`WHERE entryid = ${entryid} AND kind = ${kind}`;
}

/** Metadata only - `getSprite` is what fetches the bytes, and only on a cache miss. */
export function listSprites(entryid: number) {
	return sprites!.selectAll(
		['entryid', 'kind', 'sha', 'width', 'height', 'bytes', 'updated']
	)`WHERE entryid = ${entryid}`;
}

/** Every sprite in the database, for rebuilding the served cache from scratch. */
export function allSprites() {
	return sprites!.selectAll()`ORDER BY entryid`;
}

export async function putSprite(
	entryid: number, kind: string, sha: string,
	width: number, height: number, base64: string, bytes: number
) {
	const now = new Date().toISOString();
	// bytea can't be sent through the SQL tag, so hand Postgres the base64 and let it decode.
	await sprites!.queryExec()`INSERT INTO custom_species_sprites (${{
		entryid, kind, sha, width, height, bytes,
		data: SQL`decode(${base64}, 'base64')`, updated: now,
	}}) ON CONFLICT (entryid, kind) DO UPDATE SET ${{
		sha, width, height, bytes, data: SQL`decode(${base64}, 'base64')`, updated: now,
	}}`;
	await syncSpriteProjection(entryid);
}

export async function removeSprite(entryid: number, kind: string) {
	await sprites!.deleteAll()`WHERE entryid = ${entryid} AND kind = ${kind}`;
	await syncSpriteProjection(entryid);
}

/** Rewrites custom_species.sprites from the sprite rows. Called after every sprite write. */
async function syncSpriteProjection(entryid: number) {
	const rows = await sprites!.selectAll(['kind', 'sha'])`WHERE entryid = ${entryid}`;
	const projection: { [kind: string]: string } = {};
	for (const row of rows) projection[row.kind] = row.sha;
	await update(entryid, { sprites: projection });
}
