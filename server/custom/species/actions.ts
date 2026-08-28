/**
 * Custom species mutations
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * Creating, editing and deleting an entry, shared by the chat commands in
 * chat-plugins/custom-species.ts and the `/crq custompokemon` the teambuilder
 * room uses, so both go through the same limits and the same validator.
 *
 * @license MIT
 */
import * as store from '../entries';
import * as database from './database';
import { normalizeSpeciesData } from './validator';

import { type CustomSpeciesRow, MAX_CUSTOM_SPECIES } from './database';

export const NOUN = 'custom Pokemon';

export function validateAccess(user: User) {
	store.validateAccess(user, !!database.entries, Config.custompokemon, NOUN);
}

export async function ownedNames(ownerid: ID, excludeEntryid?: number) {
	return store.nameMap(await database.ownedNames(ownerid), row => row.speciesid, excludeEntryid);
}

/** A stored row back in the shape `create` accepts, so edits can re-run the full validator. */
function toEditableObject(row: CustomSpeciesRow): AnyObject {
	const editable: AnyObject = { ...row.species, name: row.name, learnset: row.learnset };
	if (row.inheritsfrom) editable.inheritsFrom = Dex.species.get(row.inheritsfrom).name;
	return editable;
}

/**
 * Re-validates the whole entry rather than just the change, so no sequence of
 * partial edits can leave an invalid row behind.
 */
export async function revalidate(row: CustomSpeciesRow, changes: AnyObject) {
	const merged = {
		...toEditableObject(row),
		...changes,
	};
	const otherNames = await ownedNames(row.ownerid, row.entryid);
	return normalizeSpeciesData(merged, { otherNames });
}

export async function create(user: User, input: AnyObject) {
	validateAccess(user);
	const otherNames = await ownedNames(user.id);
	const normalized = normalizeSpeciesData(input, { otherNames });
	if (await database.count(user.id) >= MAX_CUSTOM_SPECIES) {
		throw new Chat.ErrorMessage(
			`You already have ${MAX_CUSTOM_SPECIES} custom Pokemon, which is the limit. ` +
			`Delete one first.`
		);
	}
	return database.create({
		ownerid: user.id,
		speciesid: normalized.speciesid,
		name: normalized.name,
		inheritsfrom: normalized.inheritsFrom,
		species: normalized.species,
		learnset: normalized.learnset,
		notes: null,
	});
}

export async function edit(user: User, name: string, changes: AnyObject) {
	validateAccess(user);
	const row = await store.getOwn(user, name, NOUN, database.get);
	const normalized = await revalidate(row, changes);
	await database.update(row.entryid, {
		speciesid: normalized.speciesid,
		name: normalized.name,
		inheritsfrom: normalized.inheritsFrom,
		species: normalized.species,
		learnset: normalized.learnset,
	});
	return (await database.getById(row.entryid))!;
}

export async function remove(user: User, target: string) {
	validateAccess(user);
	const row = await store.getDeletable(target, user, NOUN, database.get);
	await database.remove(row.entryid);
	return row;
}
