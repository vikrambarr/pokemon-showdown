/**
 * Custom dex payloads: stored custom species as the payload a battle carries,
 * so the simulator and validator processes never have to read the database.
 */
import { customFormatId, customFormatName, isPlainObject } from './entries';
import * as formatDatabase from './formats/database';
import { toFormatData } from './formats/validator';
import * as database from './species/database';
import { spriteURL } from './species/sprites';
import { type FieldLimit, fieldLimits, resolveLearnset, resolveSpecies } from './species/validator';

import type { Format, FormatData } from '../../sim/dex-formats';
import type { CustomDexPayload } from '../../sim/dex-custom';
import type { SpeciesData } from '../../sim/dex-species';
import type { CustomFormatRow } from './formats/database';
import type { CustomSpeciesRow } from './species/database';

/** One battle's worth of custom data. A single socket message tops out at 100KB. */
export const MAX_PAYLOAD_BYTES = 64 * 1024;

const CUSTOM_FORMAT_REGEX = /^custom-([a-z0-9]+)-(.+)$/i;

export type CustomCollection = Required<Omit<CustomDexPayload, 'format'>>;
/** A collection plus the format it's being played under: everything a battle needs. */
export type CustomBattleData = CustomCollection & { format: FormatData };
type CollectionRow = Pick<CustomSpeciesRow, 'name' | 'num' | 'inheritsfrom' | 'species' | 'learnset' | 'sprites'>;

/** One entry as its owner wrote it: overrides only, so the client's editor round-trips an edit. */
export interface CustomDexEntry {
	name: string;
	inheritsFrom: string | null;
	species: AnyObject;
	learnset: AnyObject;
}

/** What the teambuilder needs to offer a user their own creations, before any battle exists. */
export interface CustomDexOverlay extends CustomCollection {
	limits: { [field: string]: FieldLimit };
	sprites: { [speciesid: string]: { [kind: string]: string } };
	entries: CustomDexEntry[];
	formats: {
		id: string, name: string, base: string,
		ruleset: string[], banlist: string[], unbanlist: string[],
	}[];
}

export function emptyCollection(): CustomCollection {
	return { Pokedex: {}, Learnsets: {}, FormatsData: {} };
}

function checkSize(collection: CustomCollection) {
	const bytes = JSON.stringify(collection).length;
	if (bytes > MAX_PAYLOAD_BYTES) {
		throw new Chat.ErrorMessage(
			`Your custom Pokemon come to ${bytes} bytes, over the ${MAX_PAYLOAD_BYTES} byte limit for one battle.`
		);
	}
	return collection;
}

export function toCollection(rows: CollectionRow[]): CustomCollection {
	const collection = emptyCollection();
	for (const row of rows) {
		const id = toID(row.name);
		collection.Pokedex[id] = { ...resolveSpecies(row), name: row.name, isNonstandard: 'Custom' } as SpeciesData;
		collection.Learnsets[id] = { learnset: resolveLearnset(row) };
		collection.FormatsData[id] = { isNonstandard: 'Custom' };
	}
	return collection;
}

export async function resolveCollection(ownerid: ID): Promise<CustomCollection> {
	if (!database.entries) return emptyCollection();
	return toCollection(await database.collection(ownerid));
}

/** Everything one user can build with, as a dex overlay rather than entries in the global format list. */
export function toOverlay(rows: CollectionRow[], formatRows: CustomFormatRow[]): CustomDexOverlay {
	const overlay: CustomDexOverlay = {
		...toCollection(rows), limits: fieldLimits(), sprites: {}, entries: [], formats: [],
	};
	for (const row of rows) {
		const urls: { [kind: string]: string } = {};
		for (const kind in row.sprites || {}) urls[kind] = spriteURL(row.sprites[kind]);
		if (Object.keys(urls).length) overlay.sprites[toID(row.name)] = urls;
		overlay.entries.push({
			name: row.name,
			inheritsFrom: row.inheritsfrom && Dex.species.get(row.inheritsfrom).name,
			species: row.species || {},
			learnset: row.learnset || {},
		});
	}
	for (const row of formatRows) {
		overlay.formats.push({
			id: customFormatId(row.ownerid, row.formatid),
			name: row.name,
			base: Dex.formats.get(row.base).name,
			ruleset: row.ruleset,
			banlist: row.banlist,
			unbanlist: row.unbanlist,
		});
	}
	return overlay;
}

export async function resolveOverlay(userid: ID): Promise<CustomDexOverlay> {
	const [rows, formatRows] = await Promise.all([
		database.entries ? database.collection(userid) : [],
		formatDatabase.entries ? formatDatabase.list(userid, formatDatabase.MAX_CUSTOM_FORMATS) : [],
	]);
	return toOverlay(rows, formatRows);
}

/**
 * The payload a battle was started with, recovered from its own input log, since
 * `/importinputlog` and a restart both hand us a log and nothing else. Re-checked on the
 * way out: a log is only ever as trustworthy as whoever handed it over.
 */
export function customDataFromInputLog(inputLog: string): CustomDexPayload | undefined {
	let start = inputLog.startsWith('>start ') ? 0 : inputLog.indexOf('\n>start ');
	if (start < 0) return undefined;
	if (start) start++;
	const end = inputLog.indexOf('\n', start);
	const line = end < 0 ? inputLog.slice(start) : inputLog.slice(start, end);
	if (!line.includes(`"customData"`)) return undefined;
	let options;
	try {
		options = JSON.parse(line.slice(7));
	} catch {
		return undefined;
	}
	if (!isPlainObject(options) || !parseCustomFormat(`${options.formatid || ''}`)) return undefined;
	return validatePayload(options.customData);
}

/** A structural check plus a rule table that has to build, on a path only a restore reaches. */
function validatePayload(payload: unknown): CustomDexPayload | undefined {
	if (!isPlainObject(payload)) return undefined;
	if (JSON.stringify(payload).length > MAX_PAYLOAD_BYTES) return undefined;
	for (const table of ['Pokedex', 'Learnsets', 'FormatsData'] as const) {
		if (payload[table] === undefined) continue;
		if (!isPlainObject(payload[table])) return undefined;
		for (const id in payload[table]) {
			if (!isPlainObject(payload[table][id])) return undefined;
		}
	}
	if (payload.format !== undefined) {
		if (!isPlainObject(payload.format)) return undefined;
		try {
			Dex.formats.getRuleTable(new Dex.Format({ ...payload.format, effectType: 'Format' }));
		} catch {
			return undefined;
		}
	}
	return payload as CustomDexPayload;
}

/** The payload a player joining a running battle plays under: its dex was built at start. */
export function toBattleData(payload: CustomDexPayload | undefined): CustomBattleData | null {
	if (!payload?.format) return null;
	return {
		Pokedex: payload.Pokedex || {},
		Learnsets: payload.Learnsets || {},
		FormatsData: payload.FormatsData || {},
		format: payload.format,
	};
}

/** The inline format a battle is running under, cached per payload the way real formats are. */
const formatCache = new WeakMap<CustomDexPayload, Format>();
export function customFormat(options: { customData?: CustomDexPayload }) {
	const payload = options.customData;
	if (!payload?.format) return null;
	let format = formatCache.get(payload);
	if (!format) formatCache.set(payload, format = new Dex.Format(payload.format));
	return format;
}

/**
 * A live battle's format, published where `Dex.formats.get` will find it. Kept out of
 * `formatsListCache` - the list every connection pays for - but still resolvable, or the
 * upstream `Dex.formats.get(room.battle.format)` call sites silently get a nonexistent
 * format: the battle timer, the replay uploader and `/importinputlog` all read one.
 */
const registered = new Map<RoomID, ID>();

export function registerCustomFormat(roomid: RoomID, options: { customData?: CustomDexPayload }) {
	const format = customFormat(options);
	if (!format) return null;
	registered.set(roomid, format.id);
	Dex.formats.rulesetCache.set(format.id, format);
	return format;
}

/** Called when a battle room is destroyed; the last room out takes the format with it. */
export function releaseCustomFormat(roomid: RoomID) {
	const id = registered.get(roomid);
	if (!id) return;
	registered.delete(roomid);
	for (const stillOpen of registered.values()) {
		if (stillOpen === id) return;
	}
	Dex.formats.rulesetCache.delete(id);
}

export function parseCustomFormat(formatName: string) {
	// `@@@` rules would be silently folded into the name, so reject them rather than mangle them.
	if (formatName.includes('@@@')) return null;
	const match = CUSTOM_FORMAT_REGEX.exec(formatName.trim());
	if (!match) return null;
	const ownerid = toID(match[1]);
	const formatid = toID(match[2]);
	if (!ownerid || !formatid) return null;
	return { ownerid, formatid, id: customFormatId(ownerid, formatid) };
}

/** A stored format as the dex wants it, named so that `toID(name)` is the id it plays under. */
export async function resolveFormat(ownerid: ID, formatid: ID): Promise<FormatData | null> {
	if (!formatDatabase.entries) return null;
	const row = await formatDatabase.get(ownerid, formatid);
	if (!row) return null;
	return { ...toFormatData(row), name: customFormatName(row.ownerid, row.name) };
}

/** The format and the challenger's own collection, resolved at challenge time. */
export async function resolveBattleData(ref: { ownerid: ID, formatid: ID }, userid: ID): Promise<CustomBattleData> {
	const [format, collection] = await Promise.all([
		resolveFormat(ref.ownerid, ref.formatid),
		resolveCollection(userid),
	]);
	if (!format) {
		throw new Chat.ErrorMessage(`${ref.ownerid} doesn't have a custom format called "${ref.formatid}".`);
	}
	return { ...checkSize(collection), format };
}

/** `num` is the owner's own row id, so two copies of one species always differ by it. */
function sameEntry(a: CustomCollection, b: CustomCollection, id: string) {
	return JSON.stringify([{ ...a.Pokedex[id], num: 0 }, a.Learnsets[id]]) ===
		JSON.stringify([{ ...b.Pokedex[id], num: 0 }, b.Learnsets[id]]);
}

/** Names only have to be unique within the battle they're used in, not across the server. */
export function mergeCollections(collections: CustomCollection[]): CustomCollection {
	const merged = emptyCollection();
	for (const collection of collections) {
		for (const id in collection.Pokedex) {
			const species = collection.Pokedex[id];
			if (merged.Pokedex[id] && !sameEntry(merged, collection, id)) {
				throw new Chat.ErrorMessage(
					`You and your opponent each have a different custom Pokemon named "${species.name}". ` +
					`One of you will have to rename it before you can battle.`
				);
			}
			merged.Pokedex[id] = species;
			merged.Learnsets[id] = collection.Learnsets[id];
			merged.FormatsData[id] = collection.FormatsData[id];
		}
	}
	return checkSize(merged);
}
