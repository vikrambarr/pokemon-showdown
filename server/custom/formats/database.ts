/** Storage for user-authored battle formats. Returns data, never messages. */
import { SQL, type PGDatabase, type DatabaseTable } from '../../../lib/database';
import { ensureSchema, getTable } from '../database';

/** How many custom formats one account may own. */
export const MAX_CUSTOM_FORMATS = 25;

export interface CustomFormatRow {
	entryid: number;
	ownerid: ID;
	formatid: ID;
	name: string;
	/** the mechanics to play under; null means inherit the base format's */
	mod: ID | null;
	/** a real format id, whose rules this one is layered on top of; null for a bare mod */
	base: ID | null;
	ruleset: string[];
	banlist: string[];
	unbanlist: string[];
	notes: string | null;
	/** password */
	private: string | null;
	views: number;
	date: Date;
	updated: Date;
}

export let entries: DatabaseTable<CustomFormatRow, PGDatabase> | undefined;

export function connect() {
	entries = getTable<CustomFormatRow>(Config.customformats, 'custom_formats', 'entryid');
	return ensureSchema([entries], 'custom-formats.sql');
}

const json = (value: unknown) => JSON.stringify(value ?? []);

export async function create(entry: {
	ownerid: ID, formatid: ID, name: string, mod: ID | null, base: ID | null,
	ruleset: string[], banlist: string[], unbanlist: string[], notes: string | null,
}) {
	const now = new Date().toISOString();
	const row = await entries!.queryOne<{ entryid: number }>()`INSERT INTO custom_formats (${{
		...entry, ruleset: json(entry.ruleset), banlist: json(entry.banlist), unbanlist: json(entry.unbanlist),
		views: 0, date: now, updated: now,
	}}) RETURNING entryid`;
	return (await getById(row!.entryid))!;
}

export function getById(entryid: number) {
	return entries!.get(entryid);
}

export function get(ownerid: ID, formatid: ID) {
	return entries!.selectOne()`WHERE ownerid = ${ownerid} AND formatid = ${formatid}`;
}

/** The id a saved team's `format` field carries: `toID()` collapses `customFormatId`'s hyphens. */
export function getByBareId(bareid: ID) {
	return entries!.selectOne()`WHERE 'custom' || ownerid || formatid = ${bareid}`;
}

/** Just enough to check a name against the owner's other entries. */
export function ownedNames(ownerid: ID) {
	return entries!.selectAll(
		['entryid', 'ownerid', 'formatid', 'name', 'private']
	)`WHERE ownerid = ${ownerid} LIMIT ${MAX_CUSTOM_FORMATS}`;
}

export function list(ownerid: ID, limit: number, publicOnly = false) {
	const publicOnlyQuery = publicOnly ? SQL`AND private IS NULL ` : SQL``;
	return entries!.selectAll()`WHERE ownerid = ${ownerid} ${publicOnlyQuery}ORDER BY updated DESC LIMIT ${limit}`;
}

/** Every owner's public formats: what the directory browses, narrowed the way its search asks. */
export function browse(search: { ownerid?: ID, name?: ID }, sorter: string, limit: number) {
	const where = [SQL`WHERE private IS NULL`];
	if (search.ownerid) where.push(SQL` AND ownerid = ${search.ownerid}`);
	if (search.name) where.push(SQL` AND formatid LIKE ${`%${search.name}%`}`);
	const order = sorter === 'views' ? SQL` ORDER BY views DESC` : SQL` ORDER BY updated DESC`;
	return entries!.selectAll()`${where}${order} LIMIT ${limit}`;
}

export function update(entryid: number, data: {
	formatid?: ID, name?: string, mod?: ID | null, base?: ID | null, ruleset?: string[], banlist?: string[],
	unbanlist?: string[], notes?: string | null, private?: string | null,
}) {
	const patch: AnyObject = { ...data, updated: new Date().toISOString() };
	for (const field of ['ruleset', 'banlist', 'unbanlist'] as const) {
		if (data[field]) patch[field] = json(data[field]);
	}
	return entries!.update(entryid, patch);
}

export function remove(entryid: number) {
	return entries!.delete(entryid);
}

export function bumpViews(entryid: number) {
	return entries!.updateOne(SQL`views = views + 1`)`WHERE entryid = ${entryid}`;
}
