/**
 * Pixel art for user-authored Pokemon.
 *
 * Postgres holds the bytes; the served directory is a write-through cache. Files are named
 * by the sha256 of their contents, so a URL is immutable.
 */
import * as crypto from 'crypto';
import { FS } from '../../../lib';
import * as database from './database';

/** Dimensions the client expects, by sprite kind. */
export const SPRITE_KINDS: { [kind: string]: { width: number, height: number } } = {
	'front': { width: 96, height: 96 },
	'back': { width: 96, height: 96 },
	'front-shiny': { width: 96, height: 96 },
	'back-shiny': { width: 96, height: 96 },
	'icon': { width: 40, height: 30 },
};

/** Generous for 96x96 pixel art, well inside the 100KB socket message cap. */
const MAX_SPRITE_BYTES = 64 * 1024;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

/** Bind-mounted into the web container's docroot at play.pokemonshowdown.com/sprites/custom. */
const spriteDir = () => Config.custompokemonspritepath || 'custom-sprites';

export const cachePath = (sha: string) => `${spriteDir()}/${sha}.png`;

export function spriteURL(sha: string) {
	return `https://${Config.routes?.client || 'play.pokemonshowdown.com'}/sprites/custom/${sha}.png`;
}

export function normalizeKind(input: string) {
	const kind = input.trim().toLowerCase().replace(/[\s_]+/g, '-');
	if (!Object.prototype.hasOwnProperty.call(SPRITE_KINDS, kind)) {
		throw new Chat.ErrorMessage(
			`Invalid sprite kind "${input}". Valid kinds: ${Object.keys(SPRITE_KINDS).join(', ')}.`
		);
	}
	return kind;
}

/** Width and height from the IHDR chunk, which the PNG spec requires to come first. */
export function readPNGDimensions(data: Buffer) {
	if (data.length < 24 || !data.subarray(0, 8).equals(PNG_MAGIC)) return null;
	if (data.subarray(12, 16).toString('latin1') !== 'IHDR') return null;
	return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

export function decodeUpload(kind: string, input: string) {
	// A client file picker hands back a data URI, so accept one as-is.
	const base64 = input.trim().replace(/^data:image\/png;base64,/, '').replace(/\s+/g, '');
	if (!base64) throw new Chat.ErrorMessage(`No image data provided.`);
	if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
		throw new Chat.ErrorMessage(`Image data must be base64-encoded (or a data:image/png;base64 URI).`);
	}
	const data = Buffer.from(base64, 'base64');
	if (!data.length) throw new Chat.ErrorMessage(`Could not decode that image data.`);
	if (data.length > MAX_SPRITE_BYTES) {
		throw new Chat.ErrorMessage(
			`That image is ${Math.round(data.length / 1024)}KB; the limit is ${MAX_SPRITE_BYTES / 1024}KB.`
		);
	}
	const dimensions = readPNGDimensions(data);
	if (!dimensions) throw new Chat.ErrorMessage(`Sprites must be PNG files.`);
	const expected = SPRITE_KINDS[kind];
	if (dimensions.width !== expected.width || dimensions.height !== expected.height) {
		throw new Chat.ErrorMessage(
			`A ${kind} sprite must be ${expected.width}x${expected.height}; ` +
			`that image is ${dimensions.width}x${dimensions.height}.`
		);
	}
	return {
		data,
		// Re-encoded rather than reused, so what Postgres decodes is exactly what we hashed.
		base64: data.toString('base64'),
		sha: crypto.createHash('sha256').update(data).digest('hex'),
		...dimensions,
	};
}

/** Writes the file if it isn't already there. Never throws: Postgres still has the bytes. */
export async function writeThrough(sha: string, data: Buffer) {
	const path = FS(cachePath(sha));
	try {
		if (path.existsSync()) return false;
		await FS(spriteDir()).mkdirp();
		await path.write(data);
		return true;
	} catch (err: any) {
		Monitor.warn(
			`Could not write the custom Pokemon sprite cache at ${cachePath(sha)}: ${err.message}. ` +
			`The image is safe in the database; run /custompokemon rebuildsprites once the path is writable.`
		);
		return false;
	}
}

export async function save(entryid: number, kind: string, input: string) {
	const image = decodeUpload(kind, input);
	await database.putSprite(
		entryid, kind, image.sha, image.width, image.height, image.base64, image.data.length
	);
	await writeThrough(image.sha, image.data);
	return image;
}

/** Restores any of an entry's sprites missing from the cache, and returns the listing it checked. */
export async function ensureCached(entryid: number) {
	const rows = await database.listSprites(entryid);
	for (const row of rows) {
		if (FS(cachePath(row.sha)).existsSync()) continue;
		const stored = await database.getSprite(entryid, row.kind);
		if (stored) await writeThrough(stored.sha, stored.data);
	}
	return rows;
}

/** Re-dumps every sprite in the database, for when the cache volume is lost. */
export async function rebuildCache() {
	const rows = await database.allSprites();
	let written = 0;
	for (const row of rows) {
		if (await writeThrough(row.sha, row.data)) written++;
	}
	// A sha can appear on more than one entry, so `total` counts rows, not files.
	return { total: rows.length, written };
}
