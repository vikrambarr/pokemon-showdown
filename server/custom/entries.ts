/**
 * Custom entry helpers
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * What the custom Pokemon and custom format plugins do identically: the access
 * gate, owner-scoped lookups, and parsing the `[owner], [name]` target they both
 * take, plus the id a custom format is challenged by. Lives above chat-plugins/
 * so both can import it without importing each other.
 *
 * @license MIT
 */
import * as crypto from 'crypto';
import { Utils } from '../../lib';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');

/** How a custom format is named where a format id is expected. */
export const customFormatId = (ownerid: ID, formatid: ID) => `custom-${ownerid}-${formatid}`;

/**
 * The display name a custom format carries once it's in play. Chosen so that
 * `toID(customFormatName(owner, name)) === toID(customFormatId(owner, toID(name)))`:
 * the id the dex registers it under, the id in its battle room's name, and the id it is
 * challenged by all have to agree, or a restarted battle can't find its format again.
 */
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

/** Parses the JSON a command was handed, with a message a user can act on. */
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
	const [first, second] = Utils.splitFirst(target, ',', 1).map(part => part.trim());
	if (second) return [toID(first), second];
	return [user.id, first];
}

export function generatePassword(len = 20) {
	let pw = '';
	for (let i = 0; i < len; i++) pw += ALPHABET[crypto.randomInt(ALPHABET.length)];
	return pw;
}

/** The same gate the teams database uses, for the same reasons. */
export function validateAccess(user: User, ready: boolean, setting: unknown, what: string) {
	if (!Config.usepostgres || !setting || !ready) {
		throw new Chat.ErrorMessage(`The ${what} database is currently disabled.`);
	}
	if (user.locked || user.semilocked) {
		throw new Chat.ErrorMessage(`You cannot use the ${what} database while locked.`);
	}
	if (!user.autoconfirmed) {
		throw new Chat.ErrorMessage(
			`To use the ${what} database, you must be autoconfirmed, which means being ` +
			`registered for at least one week and winning one rated game.`
		);
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

/** An entry the user is allowed to edit, or an error explaining which part failed. */
export async function getOwn<T extends OwnedRow>(
	user: User, name: string, what: string, get: (ownerid: ID, id: ID) => Promise<T | undefined>
) {
	const id = toID(name);
	if (!id) throw new Chat.ErrorMessage(`Specify which ${what}.`);
	const row = await get(user.id, id);
	if (!row) throw new Chat.ErrorMessage(`You don't have a ${what} named "${name}".`);
	return row;
}

/** Readable by the viewer: their own, or someone else's that isn't private. */
export async function getVisible<T extends OwnedRow>(
	user: User, ownerid: ID, name: string, what: string, get: (ownerid: ID, id: ID) => Promise<T | undefined>
) {
	const id = toID(name);
	if (!id) throw new Chat.ErrorMessage(`Specify which ${what}.`);
	const row = await get(ownerid, id);
	if (!row || (row.private && row.ownerid !== user.id && !user.can('rangeban'))) {
		throw new Chat.ErrorMessage(`${ownerid} doesn't have a ${what} named "${name}".`);
	}
	return row;
}

/** Staff may delete anyone's; everyone else only their own. */
export async function getDeletable<T extends OwnedRow>(
	target: string, user: User, what: string, get: (ownerid: ID, id: ID) => Promise<T | undefined>
) {
	const id = toID(target);
	if (!id) throw new Chat.ErrorMessage(`Specify which ${what}.`);
	let row = await get(user.id, id);
	if (!row && user.can('rangeban')) {
		// Staff clean-up: [owner], [name].
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
