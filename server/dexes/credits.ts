import { SQL } from '../../lib/database';
import { isObject } from '../../sim/dex-custom';
import { accountOf, ancestorsOf, database, dexes, findDex } from './index';

export interface Credit {
	account?: string;
	name: string;
	username?: string | null;
	avatar?: string;
}

interface Profile {
	discordid: string;
	name: string;
	names: string[];
	username: string | null;
	globalname: string | null;
	avatar: string;
}

export const MAX_CREDITS = 8;
const PROFILE_TIME = 60 * 1000;
const profileCache = new Map<string, { profile: Profile | null, time: number }>();

function remember(found: Profile[], asked: string[] = []) {
	const now = Date.now();
	for (const id of asked) profileCache.set(id, { profile: null, time: now });
	for (const profile of found) profileCache.set(profile.discordid, { profile, time: now });
}

export async function profiles(ids: string[]) {
	const now = Date.now();
	const missing = [...new Set(ids)].filter(id => !(now - (profileCache.get(id)?.time || 0) < PROFILE_TIME));
	if (missing.length) {
		const [result] = await LoginServer.request('discord/profiles', { ids: missing.join(',') });
		if (result?.profiles) remember(result.profiles, missing);
	}
	return new Map(ids.map(id => [id, profileCache.get(id)?.profile || null]));
}

function shown(profile: Profile): Credit {
	return { account: profile.discordid, name: profile.name, username: profile.globalname || profile.username, avatar: profile.avatar };
}

const keyOf = (credit: { account?: string | null, name: string }) => (credit.account ? `a:${credit.account}` : `n:${toID(credit.name)}`);

export async function creditsOf(uploadids: string[]) {
	const result: { [uploadid: string]: Credit[] } = {};
	if (!uploadids.length) return result;
	const uploads = await database().query<{ uploadid: string, artist: string | null, credited: boolean }>(SQL`
		SELECT uploadid, artist, credited FROM dex_sprite_uploads WHERE uploadid IN (${uploadids})`);
	const rows = await database().query<{ uploadid: string, accountid: string | null, name: string }>(SQL`
		SELECT uploadid, accountid, name FROM dex_credits WHERE uploadid IN (${uploadids}) ORDER BY position`);
	const found = await profiles(rows.flatMap(row => (row.accountid ? [row.accountid] : [])));
	for (const upload of uploads) {
		if (!upload.credited) {
			result[upload.uploadid] = upload.artist ? [{ name: upload.artist }] : [];
			continue;
		}
		result[upload.uploadid] = rows.filter(row => row.uploadid === upload.uploadid).map(row => {
			const profile = row.accountid && found.get(row.accountid);
			return profile ? shown(profile) : row.accountid ? { account: row.accountid, name: row.name } : { name: row.name };
		});
	}
	return result;
}

export async function editable(user: User, uploadids: string[]) {
	const account = user.registered ? await accountOf(user).catch(() => null) : null;
	const result: { [uploadid: string]: boolean } = {};
	if (!account || !uploadids.length) return { account, editable: result };
	const uploads = await database().query<{ uploadid: string, accountid: string, dexid: ID }>(SQL`
		SELECT uploadid, accountid, dexid FROM dex_sprite_uploads WHERE uploadid IN (${uploadids})`);
	for (const upload of uploads) {
		result[upload.uploadid] = upload.accountid === account || dexes.get(upload.dexid)?.row.ownerid === account ||
			user.can('bypassall');
	}
	return { account, editable: result };
}

export async function setCredits(user: User, uploadid: string, input: unknown) {
	const account = await accountOf(user);
	const upload = await database().queryOne<{ accountid: string, dexid: ID }>(SQL`
		SELECT accountid, dexid FROM dex_sprite_uploads WHERE uploadid = ${uploadid}`);
	if (!upload) throw new Chat.ErrorMessage(`That sprite doesn't exist anymore.`);
	if (!Array.isArray(input) || input.length > MAX_CREDITS) {
		throw new Chat.ErrorMessage(`Credits must be a list of at most ${MAX_CREDITS} people.`);
	}
	const credits = input.map(each => {
		if (isObject(each) && typeof each.account === 'string' && /^\d{1,20}$/.test(each.account)) {
			return { account: each.account, name: '' };
		}
		const name = isObject(each) && typeof each.name === 'string' ? each.name.trim() : '';
		if (!toID(name) || name.length > 100) throw new Chat.ErrorMessage(`A credit needs an account, or a name of up to 100 characters.`);
		return { name };
	}).filter((credit, i, all) => all.findIndex(other => keyOf(other) === keyOf(credit)) === i);
	const current = (await creditsOf([uploadid]))[uploadid];
	const owner = dexes.get(upload.dexid)?.row.ownerid;
	if (upload.accountid !== account && owner !== account && !user.can('bypassall')) {
		const rest = current.filter(credit => credit.account !== account).map(keyOf);
		if (rest.length === current.length || rest.join() !== credits.map(keyOf).join()) {
			throw new Chat.ErrorMessage(`Only the uploader and the dex's owner can change these credits, but you can take yourself off them.`);
		}
	}
	const accounts = credits.flatMap(credit => (credit.account ? [credit.account] : []));
	const found = await profiles(accounts);
	for (const credit of credits) {
		if (!credit.account) continue;
		const profile = found.get(credit.account);
		if (!profile) throw new Chat.ErrorMessage(`One of those accounts doesn't exist.`);
		credit.name = profile.name;
	}
	const db = database();
	await db.query(SQL`DELETE FROM dex_credits WHERE uploadid = ${uploadid}`);
	for (const [position, credit] of credits.entries()) {
		await db.query(SQL`INSERT INTO dex_credits (uploadid, position, accountid, name, addedby, added) VALUES (
			${uploadid}, ${position}, ${credit.account || null}, ${credit.name}, ${account}, ${Date.now()}
		)`);
	}
	await db.query(SQL`UPDATE dex_sprite_uploads SET credited = true WHERE uploadid = ${uploadid}`);
	return (await creditsOf([uploadid]))[uploadid];
}

export async function people(dexid: string) {
	const loaded = findDex(dexid);
	if (!loaded) return [];
	const ids = [loaded.row.ownerid, ...loaded.editors.keys()];
	const found = await profiles(ids);
	return ids.map((id, i): Credit => {
		const profile = found.get(id);
		return profile ? shown(profile) : { account: id, name: i ? loaded.editors.get(id)! : loaded.row.ownername };
	});
}

export async function suggestions(user: User, dexid: string, query: string) {
	if (toID(query)) {
		const [result] = await LoginServer.request('discord/search', { query: query.slice(0, 32) });
		const found: Profile[] = result?.profiles || [];
		remember(found);
		return found.map(shown);
	}
	const db = database();
	const ids: string[] = [];
	const loaded = findDex(dexid);
	if (loaded) {
		ids.push(loaded.row.ownerid, ...loaded.editors.keys());
		const rows = await db.query<{ accountid: string }>(SQL`SELECT accountid FROM dex_sprite_uploads
			WHERE dexid IN (${ancestorsOf(loaded).map(layer => layer.row.dexid)})
			GROUP BY accountid ORDER BY max(created) DESC LIMIT 20`);
		ids.push(...rows.map(row => row.accountid));
	}
	if (user.registered) {
		const account = await accountOf(user);
		const rows = await db.query<{ accountid: string }>(SQL`SELECT accountid FROM dex_credits
			WHERE addedby = ${account} AND accountid IS NOT NULL GROUP BY accountid ORDER BY max(added) DESC LIMIT 20`);
		ids.push(...rows.map(row => row.accountid));
	}
	const unique = [...new Set(ids)].slice(0, 40);
	const found = await profiles(unique);
	return unique.flatMap(id => {
		const profile = found.get(id);
		return profile ? [shown(profile)] : [];
	});
}
