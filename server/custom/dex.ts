/**
 * Custom dex payloads: stored custom species as the payload a battle carries,
 * so the simulator and validator processes never have to read the database.
 */
import { customFormatId, customFormatName, isPlainObject } from './entries';
import * as formatDatabase from './formats/database';
import { modList, rulesetCatalogue, tagCatalogue, toFormatData } from './formats/validator';
import * as database from './species/database';
import { spriteURL } from './species/sprites';
import { type FieldLimit, fieldLimits, resolveLearnset, resolveSpecies } from './species/validator';

import type { ModdedDex } from '../../sim/dex';
import type { Format, FormatData } from '../../sim/dex-formats';
import { buildCustomDex, type CustomDexPayload, releaseCustomDex } from '../../sim/dex-custom';
import type { SpeciesData } from '../../sim/dex-species';
import type { CustomFormatRow } from './formats/database';
import type { CustomSpeciesRow } from './species/database';

/** One battle's worth of custom data. A single socket message tops out at 100KB. */
export const MAX_PAYLOAD_BYTES = 64 * 1024;

const CUSTOM_FORMAT_REGEX = /^custom-([a-z0-9]+)-(.+)$/i;
/** The same format as `customFormatName` writes it, which is what a format selector offers. */
const CUSTOM_FORMAT_NAME_REGEX = /^custom \(([a-z0-9]+)\) (.+)$/i;

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
		id: string, name: string, mod: string, baseMod: string, base: string,
		ruleset: string[], banlist: string[], unbanlist: string[],
	}[];
	/** What the format builder can offer: every toggleable ruleset and tag, and every mod. */
	rulesets: { id: string, name: string, desc?: string }[];
	tags: { id: string, name: string, kind: string }[];
	mods: string[];
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

/** As much of a stored format as a client needs to offer it: its id, name and what it's built on. */
export function formatSummary(row: CustomFormatRow) {
	const base = row.base ? Dex.formats.get(row.base) : null;
	return {
		id: customFormatId(row.ownerid, row.formatid),
		name: row.name,
		// The mod as the owner set it, plus what the base would supply on its own, so the builder
		// can offer "same as base format" without guessing.
		mod: row.mod || '',
		baseMod: base?.mod || '',
		base: base?.name || '',
	};
}

/** Everything one user can build with, as a dex overlay rather than entries in the global format list. */
export function toOverlay(rows: CollectionRow[], formatRows: CustomFormatRow[]): CustomDexOverlay {
	const overlay: CustomDexOverlay = {
		...toCollection(rows), limits: fieldLimits(), sprites: {}, entries: [], formats: [],
		rulesets: rulesetCatalogue(), tags: tagCatalogue(), mods: modList(),
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
			...formatSummary(row),
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
		const dex = buildCustomDex(payload as CustomDexPayload, `${payload.format.mod || ''}`);
		try {
			Dex.formats.getRuleTable(new Dex.Format({ ...payload.format, effectType: 'Format', mod: dex.currentMod }));
		} catch {
			return undefined;
		} finally {
			releaseCustomDex(dex);
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
const formatCache = new WeakMap<CustomDexPayload, { format: Format, dex: ModdedDex }>();
export function customFormat(options: { customData?: CustomDexPayload }) {
	const payload = options.customData;
	if (!payload?.format) return null;
	let cached = formatCache.get(payload);
	if (!cached) {
		// A format's rules may name the author's own species, and a rule table only resolves what
		// its dex knows about, so it's built on the same dex the battle itself will run on.
		const dex = buildCustomDex(payload, payload.format.mod);
		cached = { format: new Dex.Format({ ...payload.format, mod: dex.currentMod }), dex };
		formatCache.set(payload, cached);
	}
	return cached.format;
}

/**
 * A live battle's format, published where `Dex.formats.get` will find it. Kept out of
 * `formatsListCache` - the list every connection pays for - but still resolvable, or the
 * upstream `Dex.formats.get(room.battle.format)` call sites silently get a nonexistent
 * format: the battle timer, the replay uploader and `/importinputlog` all read one.
 */
const registered = new Map<RoomID, { id: ID, payload: CustomDexPayload }>();

export function registerCustomFormat(roomid: RoomID, options: { customData?: CustomDexPayload }) {
	const format = customFormat(options);
	if (!format) return null;
	registered.set(roomid, { id: format.id, payload: options.customData! });
	Dex.formats.rulesetCache.set(format.id, format);
	return format;
}

/**
 * The art a battle's custom species were uploaded with. The payload the simulator carries has no
 * room for it - and no use for it - so it's resolved from the database when a client asks.
 */
const battleSprites = new Map<RoomID, { [speciesid: string]: { [kind: string]: string } }>();

export async function customBattleSprites(roomid: RoomID, ownerids: ID[], speciesids: string[]) {
	const cached = battleSprites.get(roomid);
	if (cached) return cached;
	const wanted = new Set(speciesids);
	const sprites: { [speciesid: string]: { [kind: string]: string } } = {};
	if (database.entries) {
		for (const ownerid of new Set(ownerids)) {
			for (const row of await database.collection(ownerid)) {
				const id = toID(row.name);
				if (!wanted.has(id) || sprites[id]) continue;
				const urls: { [kind: string]: string } = {};
				for (const kind in row.sprites || {}) urls[kind] = spriteURL(row.sprites[kind]);
				if (Object.keys(urls).length) sprites[id] = urls;
			}
		}
	}
	battleSprites.set(roomid, sprites);
	return sprites;
}

/** Called when a battle room is destroyed; the last room out takes the format with it. */
export function releaseCustomFormat(roomid: RoomID) {
	battleSprites.delete(roomid);
	const entry = registered.get(roomid);
	if (!entry) return;
	registered.delete(roomid);
	const cached = formatCache.get(entry.payload);
	if (cached) releaseCustomDex(cached.dex);
	for (const stillOpen of registered.values()) {
		if (stillOpen.id === entry.id) return;
	}
	Dex.formats.rulesetCache.delete(entry.id);
}

export function parseCustomFormat(formatName: string) {
	// `@@@` rules would be silently folded into the name, so reject them rather than mangle them.
	if (formatName.includes('@@@')) return null;
	formatName = formatName.trim();
	const match = CUSTOM_FORMAT_REGEX.exec(formatName) || CUSTOM_FORMAT_NAME_REGEX.exec(formatName);
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

/**
 * The format and everything the player may build with, resolved at challenge time: their own
 * collection, plus the author's, since a format's rules are written against the author's dex and
 * anyone invited to play it has to be able to field what those rules allow.
 */
export async function resolveBattleData(ref: { ownerid: ID, formatid: ID }, userid: ID): Promise<CustomBattleData> {
	const [format, authored, own] = await Promise.all([
		resolveFormat(ref.ownerid, ref.formatid),
		resolveCollection(ref.ownerid),
		userid === ref.ownerid ? null : resolveCollection(userid),
	]);
	if (!format) {
		throw new Chat.ErrorMessage(`${ref.ownerid} doesn't have a custom format called "${ref.formatid}".`);
	}
	return { ...mergeCollections(own ? [authored, own] : [authored]), format };
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
