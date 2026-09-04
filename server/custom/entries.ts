/** Access gates, owner-scoped lookups and target parsing, shared by both custom plugins. */
import * as crypto from 'crypto';
import { Utils } from '../../lib';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');

/** How a custom format is named where a format id is expected. */
export const customFormatId = (ownerid: ID, formatid: ID) => `custom-${ownerid}-${formatid}`;

/** Must keep `toID(customFormatName(o, n)) === toID(customFormatId(o, toID(n)))`. */
export const customFormatName = (ownerid: ID, name: string) => `Custom (${ownerid}) ${name}`;

/** An owner-scoped row, as much of one as anything here needs to know. */
export interface OwnedRow {
	entryid: number;
	ownerid: ID;
	name: string;
	private: string | null;
}

export function isPlainObject(value: unknown): value is AnyObject {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function err(message: string): never {
	throw new Chat.ErrorMessage(message);
}

/** Postgres unique violation: the index is what settles a name race the checks above can't. */
export const isDuplicateName = (e: any) => e?.code === '23505';

/** `[a], [b], ...`, trimmed. */
export function parts(target: string, limit = 1) {
	return Utils.splitFirst(target, ',', limit).map(part => part.trim());
}

export function parseInput(target: string, what: string) {
	const text = target.trim();
	if (!text) err(`Provide the ${what} data as JSON.`);
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch (e: any) {
		err(`That isn't valid JSON: ${e.message}`);
	}
	if (!isPlainObject(parsed)) err(`${what} data must be a JSON object.`);
	return parsed;
}

/** `[owner], [name]`, or just `[name]` for your own. */
export function parseOwnerAndName(target: string, user: User): [ID, string] {
	const [first, second] = parts(target);
	if (second) return [toID(first), second];
	return [user.id, first];
}

export function generatePassword(len = 20) {
	let pw = '';
	for (let i = 0; i < len; i++) pw += ALPHABET[crypto.randomInt(ALPHABET.length)];
	return pw;
}

/** Looking something up needs the database to be up, but not the right to author anything. */
export function validateRead(ready: boolean, setting: unknown, what: string) {
	if (!Config.usepostgres || !setting || !ready) {
		throw new Chat.ErrorMessage(`The ${what} database is currently disabled.`);
	}
}

export function validateAccess(user: User, ready: boolean, setting: unknown, what: string) {
	validateRead(ready, setting, what);
	if (user.locked || user.semilocked) {
		throw new Chat.ErrorMessage(`You cannot use the ${what} database while locked.`);
	}
	if (!Users.globalAuth.atLeast(user, setting as GroupSymbol)) {
		throw new Chat.ErrorMessage(`You cannot currently use the ${what} database.`);
	}
}

/** An owner's entries keyed by id: the uniqueness check, and what a prevo/evo may point at. */
export function nameMap<T extends OwnedRow>(rows: T[], id: (row: T) => ID, excludeEntryid?: number) {
	const names = new Map<ID, string>();
	for (const row of rows) {
		if (row.entryid === excludeEntryid) continue;
		names.set(id(row), row.name);
	}
	return names;
}

type Getter<T> = (ownerid: ID, id: ID) => Promise<T | undefined>;

/** An entry the user is allowed to edit. */
export async function getOwn<T extends OwnedRow>(user: User, name: string, what: string, get: Getter<T>) {
	const id = toID(name);
	if (!id) throw new Chat.ErrorMessage(`Specify which ${what}.`);
	const row = await get(user.id, id);
	if (!row) throw new Chat.ErrorMessage(`You don't have a ${what} named "${name}".`);
	return row;
}

/** Readable by the viewer: their own, someone else's that isn't private, or one they have the password to. */
export async function getVisible<T extends OwnedRow>(
	user: User, ownerid: ID, name: string, what: string, get: Getter<T>, password?: string
) {
	const id = toID(name);
	if (!id) throw new Chat.ErrorMessage(`Specify which ${what}.`);
	const row = await get(ownerid, id);
	const shared = !!password && row?.private === password;
	if (!row || (row.private && row.ownerid !== user.id && !shared && !user.can('rangeban'))) {
		throw new Chat.ErrorMessage(`${ownerid} doesn't have a ${what} named "${name}".`);
	}
	return row;
}

/** Staff may delete anyone's; everyone else only their own. */
export async function getDeletable<T extends OwnedRow>(
	target: string, user: User, what: string, get: Getter<T>
) {
	const id = toID(target);
	if (!id) throw new Chat.ErrorMessage(`Specify which ${what}.`);
	let row = await get(user.id, id);
	if (!row && user.can('rangeban')) {
		const [ownerid, name] = parseOwnerAndName(target, user);
		row = await get(ownerid, toID(name));
	}
	if (!row) throw new Chat.ErrorMessage(`You don't have a ${what} named "${target}".`);
	return row;
}

/** `on`/`off` as the privacy column stores it: a password, or null. */
export function parsePrivacy(context: Chat.CommandContext, input: string) {
	if (context.meansYes(input)) return generatePassword();
	if (context.meansNo(input)) return null;
	throw new Chat.ErrorMessage(`Invalid privacy setting - use "on" or "off".`);
}
