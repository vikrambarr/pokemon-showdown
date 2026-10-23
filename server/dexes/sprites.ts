import * as crypto from 'crypto';
import { FS } from '../../lib';
import { SQL, type PGDatabase } from '../../lib/database';

const BATTLE_SPRITE = { width: 96, height: 96, max: 400 };
const ICON_SPRITE = { width: 40, height: 30, max: 64 };

export const SPRITE_KINDS: { [kind: string]: { width: number, height: number, max: number } } = {
	'front': BATTLE_SPRITE,
	'back': BATTLE_SPRITE,
	'front-shiny': BATTLE_SPRITE,
	'back-shiny': BATTLE_SPRITE,
	'front-f': BATTLE_SPRITE,
	'back-f': BATTLE_SPRITE,
	'front-shiny-f': BATTLE_SPRITE,
	'back-shiny-f': BATTLE_SPRITE,
	'afd-front': BATTLE_SPRITE,
	'afd-back': BATTLE_SPRITE,
	'afd-front-shiny': BATTLE_SPRITE,
	'afd-back-shiny': BATTLE_SPRITE,
	'icon': ICON_SPRITE,
	'icon-f': ICON_SPRITE,
	'item': { width: 24, height: 24, max: 64 },
};

export const SPRITE_SETTINGS: { [key: string]: [(value: any) => boolean, string] } = {
	artist: [
		value => typeof value === 'string' && !!value.trim() && value.trim().length <= 100, 'text up to 100 characters',
	],
	pixelated: [value => typeof value === 'boolean', 'true or false'],
	flip: [value => typeof value === 'boolean', 'true or false'],
	y: [value => Number.isInteger(value) && Math.abs(value) <= 96, 'a whole number from -96 to 96'],
	gen: [value => Number.isInteger(value) && value >= 1 && value <= 5, 'a generation from 1 to 5'],
};

export interface Upload {
	uploadid: string;
	sha: string;
	kind: string;
	accountid: string;
	uploadername: string;
	dexid: ID;
	dexname: string;
	artist: string | null;
	display: AnyObject;
	created: number;
	format: string;
	width: number;
	height: number;
}

export const MAX_SPRITE_BYTES = 512 * 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

const spritePath = (sha: string, format: string) => `${Config.dexspritepath || 'dex-sprites'}/${sha}.${format}`;

export function spriteURL(image: { sha: string, format: string }) {
	return `https://${Config.routes?.client || 'play.pokemonshowdown.com'}/sprites/custom/${image.sha}.${image.format}`;
}

export function toKind(input: string) {
	const kind = input.trim().toLowerCase().replace(/[\s_]+/g, '-');
	if (!SPRITE_KINDS[kind]) {
		throw new Chat.ErrorMessage(`"${input}" isn't a sprite kind. Kinds: ${Object.keys(SPRITE_KINDS).join(', ')}.`);
	}
	return kind;
}

export function toSettings(input: AnyObject) {
	const display: AnyObject = {};
	let artist: string | null = null;
	for (const key of Object.keys(input)) {
		if (!Object.hasOwn(SPRITE_SETTINGS, key)) {
			throw new Chat.ErrorMessage(`"${key}" isn't a sprite setting. Settings: ${Object.keys(SPRITE_SETTINGS).join(', ')}.`);
		}
		const [check, description] = SPRITE_SETTINGS[key];
		if (!check(input[key])) throw new Chat.ErrorMessage(`"${key}" must be ${description}.`);
		if (key === 'artist') {
			artist = input[key].trim();
		} else {
			display[key] = input[key];
		}
	}
	return { artist, display };
}

export function decode(kind: string, input: string) {
	const base64 = input.trim().replace(/^data:image\/(png|gif);base64,/, '').replace(/\s+/g, '');
	if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
		throw new Chat.ErrorMessage(`Sprites must be base64-encoded PNG or GIF files.`);
	}
	const data = Buffer.from(base64, 'base64');
	if (data.length > MAX_SPRITE_BYTES) {
		throw new Chat.ErrorMessage(`That image is ${Math.ceil(data.length / 1024)}KB; the limit is ${MAX_SPRITE_BYTES / 1024}KB.`);
	}
	let format;
	let width;
	let height;
	if (data.length >= 24 && data.subarray(0, 8).equals(PNG_MAGIC) && data.toString('latin1', 12, 16) === 'IHDR') {
		format = 'png';
		width = data.readUInt32BE(16);
		height = data.readUInt32BE(20);
	} else if (data.length >= 10 && /^GIF8[79]a$/.test(data.toString('latin1', 0, 6))) {
		format = 'gif';
		width = data.readUInt16LE(6);
		height = data.readUInt16LE(8);
	} else {
		throw new Chat.ErrorMessage(`Sprites must be PNG or GIF files.`);
	}
	const { max } = SPRITE_KINDS[kind];
	if (!width || !height || width > max || height > max) {
		throw new Chat.ErrorMessage(`A ${kind} sprite can be at most ${max}x${max}; that image is ${width}x${height}.`);
	}
	return { data, format, width, height, sha: crypto.createHash('sha256').update(data).digest('hex') };
}

async function writeFile(sha: string, format: string, data: Buffer) {
	const path = FS(spritePath(sha, format));
	if (path.existsSync()) return false;
	await path.parentDir().mkdirp();
	await path.write(data);
	return true;
}

export async function save(db: PGDatabase, image: ReturnType<typeof decode>) {
	await db.query(SQL`INSERT INTO dex_sprites (sha, width, height, format, data, created) VALUES (
		${image.sha}, ${image.width}, ${image.height}, ${image.format},
		decode(${image.data.toString('base64')}, 'base64'), ${Date.now()}
	) ON CONFLICT (sha) DO NOTHING`);
	await writeFile(image.sha, image.format, image.data);
}

export async function upload(
	db: PGDatabase, image: ReturnType<typeof decode>, kind: string, accountid: string, name: string,
	dex: { dexid: ID, name: string }, settings: ReturnType<typeof toSettings>
) {
	await save(db, image);
	const uploadid = crypto.randomBytes(12).toString('hex');
	await db.query(SQL`INSERT INTO dex_sprite_uploads
		(uploadid, sha, kind, accountid, uploadername, dexid, dexname, artist, display, created) VALUES (
		${uploadid}, ${image.sha}, ${kind}, ${accountid}, ${name}, ${dex.dexid}, ${dex.name},
		${settings.artist}, ${JSON.stringify(settings.display)}, ${Date.now()}
	)`);
	return uploadid;
}

export async function getUploads(db: PGDatabase, ids: string[]) {
	if (!ids.length) return new Map<string, Upload>();
	const rows = await db.query<Upload>(SQL`SELECT uploads.*, images.format, images.width, images.height
		FROM dex_sprite_uploads AS uploads JOIN dex_sprites AS images ON images.sha = uploads.sha
		WHERE uploads.uploadid IN (${ids})`);
	return new Map(rows.map(row => [row.uploadid, { ...row, created: Number(row.created) }]));
}

export async function remove(db: PGDatabase, image: Upload) {
	await db.query(SQL`DELETE FROM dex_sprite_uploads WHERE uploadid = ${image.uploadid}`);
	const others = await db.queryOne<{ count: string }>(SQL`
		SELECT count(*) FROM dex_sprite_uploads WHERE sha = ${image.sha}`);
	if (Number(others?.count)) return;
	await db.query(SQL`DELETE FROM dex_sprites WHERE sha = ${image.sha}`);
	await FS(spritePath(image.sha, image.format)).unlinkIfExists();
}

export async function rebuild(db: PGDatabase) {
	let written = 0;
	const rows = await db.query<{ sha: string, format: string }>(SQL`SELECT sha, format FROM dex_sprites`);
	for (const { sha, format } of rows) {
		if (FS(spritePath(sha, format)).existsSync()) continue;
		const row = await db.queryOne<{ data: Buffer }>(SQL`SELECT data FROM dex_sprites WHERE sha = ${sha}`);
		if (row && await writeFile(sha, format, row.data)) written++;
	}
	return { total: rows.length, written };
}
