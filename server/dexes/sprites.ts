import * as crypto from 'crypto';
import { FS } from '../../lib';
import { SQL, type PGDatabase } from '../../lib/database';

export const SPRITE_KINDS: { [kind: string]: { width: number, height: number } } = {
	'front': { width: 96, height: 96 },
	'back': { width: 96, height: 96 },
	'front-shiny': { width: 96, height: 96 },
	'back-shiny': { width: 96, height: 96 },
	'icon': { width: 40, height: 30 },
};

const MAX_SPRITE_BYTES = 64 * 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

const spritePath = (sha: string) => `${Config.dexspritepath || 'dex-sprites'}/${sha}.png`;

export function spriteURL(sha: string) {
	return `https://${Config.routes?.client || 'play.pokemonshowdown.com'}/sprites/custom/${sha}.png`;
}

export function toKind(input: string) {
	const kind = input.trim().toLowerCase().replace(/[\s_]+/g, '-');
	if (!SPRITE_KINDS[kind]) {
		throw new Chat.ErrorMessage(`"${input}" isn't a sprite kind. Kinds: ${Object.keys(SPRITE_KINDS).join(', ')}.`);
	}
	return kind;
}

export function decode(kind: string, input: string) {
	const base64 = input.trim().replace(/^data:image\/png;base64,/, '').replace(/\s+/g, '');
	if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
		throw new Chat.ErrorMessage(`Sprites must be base64-encoded PNG files.`);
	}
	const data = Buffer.from(base64, 'base64');
	if (data.length > MAX_SPRITE_BYTES) {
		throw new Chat.ErrorMessage(`That image is ${Math.ceil(data.length / 1024)}KB; the limit is ${MAX_SPRITE_BYTES / 1024}KB.`);
	}
	if (data.length < 24 || !data.subarray(0, 8).equals(PNG_MAGIC) || data.toString('latin1', 12, 16) !== 'IHDR') {
		throw new Chat.ErrorMessage(`Sprites must be PNG files.`);
	}
	const width = data.readUInt32BE(16);
	const height = data.readUInt32BE(20);
	const expected = SPRITE_KINDS[kind];
	if (width !== expected.width || height !== expected.height) {
		throw new Chat.ErrorMessage(
			`A ${kind} sprite must be ${expected.width}x${expected.height}; that image is ${width}x${height}.`
		);
	}
	return { data, width, height, sha: crypto.createHash('sha256').update(data).digest('hex') };
}

async function writeFile(sha: string, data: Buffer) {
	const path = FS(spritePath(sha));
	if (path.existsSync()) return false;
	await path.parentDir().mkdirp();
	await path.write(data);
	return true;
}

export async function save(db: PGDatabase, image: ReturnType<typeof decode>) {
	await db.query(SQL`INSERT INTO dex_sprites (sha, width, height, data, created) VALUES (
		${image.sha}, ${image.width}, ${image.height}, decode(${image.data.toString('base64')}, 'base64'), ${Date.now()}
	) ON CONFLICT (sha) DO NOTHING`);
	await writeFile(image.sha, image.data);
}

export async function rebuild(db: PGDatabase) {
	let written = 0;
	const rows = await db.query<{ sha: string }>(SQL`SELECT sha FROM dex_sprites`);
	for (const { sha } of rows) {
		if (FS(spritePath(sha)).existsSync()) continue;
		const row = await db.queryOne<{ data: Buffer }>(SQL`SELECT data FROM dex_sprites WHERE sha = ${sha}`);
		if (row && await writeFile(sha, row.data)) written++;
	}
	return { total: rows.length, written };
}
