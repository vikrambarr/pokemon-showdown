/**
 * Custom formats: the command layer. A format here is composition over the rules in
 * data/rulesets.ts - a base format plus rule names - so nothing a user writes can
 * execute; ../custom/formats/validator.ts is what enforces that.
 */
import { Utils } from '../../lib';
import * as database from '../custom/formats/database';
import * as store from '../custom/entries';
import {
	MAX_NOTES_LENGTH, normalizeFormatData, RULE_LISTS, toExportJSON, toFormatData,
} from '../custom/formats/validator';

import { type CustomFormatRow, MAX_CUSTOM_FORMATS } from '../custom/formats/database';

const NOUN = 'custom format';

function validateAccess(user: User) {
	store.validateAccess(user, !!database.entries, Config.customformats, NOUN);
}

async function ownedNames(ownerid: ID, excludeEntryid?: number) {
	return store.nameMap(await database.ownedNames(ownerid), row => row.formatid, excludeEntryid);
}

const getOwn = (user: User, name: string) => store.getOwn(user, name, NOUN, database.get);
const getVisible = (user: User, ownerid: ID, name: string) =>
	store.getVisible(user, ownerid, name, NOUN, database.get);

/** Re-validates the whole entry rather than just the change, as the species plugin does. */
async function revalidate(row: CustomFormatRow, changes: AnyObject) {
	const editable = {
		name: row.name, base: Dex.formats.get(row.base).name,
		ruleset: row.ruleset, banlist: row.banlist, unbanlist: row.unbanlist,
	};
	const otherNames = await ownedNames(row.ownerid, row.entryid);
	return normalizeFormatData({ ...editable, ...changes }, { otherNames, ownerid: row.ownerid });
}

function summary(row: CustomFormatRow) {
	const rules = row.ruleset.length + row.banlist.length + row.unbanlist.length;
	let buf = `<strong>${Utils.escapeHTML(row.name)}</strong>`;
	buf += ` &middot; based on ${Utils.escapeHTML(Dex.formats.get(row.base).name)}`;
	buf += ` &middot; ${Chat.count(rules, "rules")}`;
	if (row.private) buf += ` <small>[private]</small>`;
	return buf;
}

function details(row: CustomFormatRow) {
	let buf = `<h3>${Utils.escapeHTML(row.name)}</h3>`;
	buf += `<p>Based on <strong>${Utils.escapeHTML(Dex.formats.get(row.base).name)}</strong></p>`;
	for (const field of RULE_LISTS) {
		if (!row[field].length) continue;
		buf += `<p><strong>${field}:</strong> ${Utils.escapeHTML(row[field].join(', '))}</p>`;
	}
	if (row.notes) buf += `<p>${Utils.escapeHTML(row.notes)}</p>`;
	return buf;
}

export const commands: Chat.ChatCommands = {
	customformat: {
		async create(target, room, user, connection, cmd) {
			validateAccess(user);
			const input = store.parseInput(target, 'format');
			const otherNames = await ownedNames(user.id);
			const normalized = normalizeFormatData(input, { otherNames, ownerid: user.id });
			if (cmd === 'check') {
				return this.sendReplyBox(
					`<strong>${Utils.escapeHTML(normalized.name)}</strong> is valid. ` +
					`Nothing was saved - use <code>/customformat create</code> to save it.`
				);
			}
			if (await database.count(user.id) >= MAX_CUSTOM_FORMATS) {
				throw new Chat.ErrorMessage(
					`You already have ${MAX_CUSTOM_FORMATS} custom formats, which is the limit. Delete one first.`
				);
			}
			const row = await database.create({ ownerid: user.id, ...normalized, notes: null });
			this.sendReply(`Created custom format "${row.name}".`);
			return this.sendReplyBox(details(row));
		},
		check: 'create',
		createhelp: [
			`/customformat create {json} - Saves a custom format. Requires: autoconfirmed`,
			`/customformat check {json} - Validates without saving. Requires: autoconfirmed`,
		],

		async list(target, room, user) {
			validateAccess(user);
			const ownerid = toID(target) || user.id;
			const rows = await database.list(ownerid, MAX_CUSTOM_FORMATS, ownerid !== user.id && !user.can('rangeban'));
			if (!rows.length) {
				return this.sendReply(
					ownerid === user.id ?
						`You haven't made any custom formats yet. Try /customformat help.` :
						`${ownerid} has no public custom formats.`
				);
			}
			let buf = `<strong>${Utils.escapeHTML(ownerid)}'s custom formats (${rows.length}):</strong><ul>`;
			for (const row of rows) buf += `<li>${summary(row)}</li>`;
			return this.sendReplyBox(`${buf}</ul>`);
		},

		'': 'view',
		show: 'view',
		async view(target, room, user) {
			validateAccess(user);
			if (!toID(target)) return this.parse(`/customformat list`);
			const row = await getVisible(user, ...store.parseOwnerAndName(target, user));
			if (row.ownerid !== user.id) await database.bumpViews(row.entryid);
			return this.sendReplyBox(details(row));
		},

		async rules(target, room, user) {
			validateAccess(user);
			const row = await getVisible(user, ...store.parseOwnerAndName(target, user));
			// The assembled rule table, which is what a battle would actually run under.
			const rules = [...Dex.formats.getRuleTable(new Dex.Format(toFormatData(row))).keys()].sort();
			return this.sendReplyBox(
				`<details open><summary><strong>${Utils.escapeHTML(row.name)}</strong> ` +
				`(${Chat.count(rules, "rules")})</summary>${Utils.escapeHTML(rules.join(', '))}</details>`
			);
		},

		async export(target, room, user) {
			validateAccess(user);
			const row = await getVisible(user, ...store.parseOwnerAndName(target, user));
			return this.sendReplyBox(
				`<details open><summary><strong>${Utils.escapeHTML(row.name)}</strong></summary>` +
				`<textarea rows="12" style="width:100%" readonly>${Utils.escapeHTML(toExportJSON(row))}</textarea>` +
				`</details>`
			);
		},

		async edit(target, room, user) {
			validateAccess(user);
			const [name, json] = store.parts(target);
			if (!json) throw new Chat.ErrorMessage(`Usage: /customformat edit [name], {json}`);
			const row = await getOwn(user, name);
			const normalized = await revalidate(row, store.parseInput(json, 'format'));
			await database.update(row.entryid, normalized);
			this.sendReply(`Updated "${normalized.name}".`);
			return this.sendReplyBox(details((await database.getById(row.entryid))!));
		},
		edithelp: [
			`/customformat edit [name], {json} - Merges the given fields into a custom format.`,
			`The whole entry is re-validated, so an edit can't leave it in a broken state.`,
		],

		async rename(target, room, user) {
			validateAccess(user);
			const [name, newName] = store.parts(target);
			if (!newName) throw new Chat.ErrorMessage(`Usage: /customformat rename [name], [new name]`);
			const row = await getOwn(user, name);
			const normalized = await revalidate(row, { name: newName });
			await database.update(row.entryid, { formatid: normalized.formatid, name: normalized.name });
			return this.sendReply(`Renamed "${row.name}" to "${normalized.name}".`);
		},

		async notes(target, room, user) {
			validateAccess(user);
			const [name, notes] = store.parts(target);
			if (notes.length > MAX_NOTES_LENGTH) {
				throw new Chat.ErrorMessage(`Notes can be at most ${MAX_NOTES_LENGTH} characters.`);
			}
			const row = await getOwn(user, name);
			await database.update(row.entryid, { notes: notes || null });
			return this.sendReply(notes ? `Set the notes on "${row.name}".` : `Cleared the notes on "${row.name}".`);
		},

		async private(target, room, user) {
			validateAccess(user);
			const [name, rawPrivacy] = store.parts(target);
			const row = await getOwn(user, name);
			const privacy = store.parsePrivacy(this, rawPrivacy);
			await database.update(row.entryid, { private: privacy });
			return this.sendReply(`"${row.name}" is now ${privacy ? 'private' : 'public'}.`);
		},

		async challenge(target, room, user) {
			validateAccess(user);
			const [targetUsername, name] = store.parts(target);
			if (!name) throw new Chat.ErrorMessage(`Usage: /customformat challenge [user], [format]`);
			// Checked here so the error names the format, rather than the challenge failing later.
			const row = await getVisible(user, user.id, name);
			return this.parse(`/challenge ${targetUsername}, ${store.customFormatId(user.id, row.formatid)}`);
		},
		challengehelp: [
			`/customformat challenge [user], [format] - Challenges someone to one of your custom formats.`,
		],

		async delete(target, room, user) {
			validateAccess(user);
			const row = await store.getDeletable(target, user, NOUN, database.get);
			await database.remove(row.entryid);
			return this.sendReply(`Deleted "${row.name}".`);
		},
	},

	customformathelp: [
		`/customformat create {json} - Saves a custom format. See below for the fields.`,
		`/customformat check {json} - Validates JSON without saving it.`,
		`/customformat list [user] - Lists a user's custom formats. Defaults to yourself.`,
		`/customformat view [user], [name] - Shows one in full.`,
		`/customformat rules [user], [name] - Shows every rule the format resolves to.`,
		`/customformat export [user], [name] - Shows one as JSON you can re-import.`,
		`/customformat edit [name], {json} - Merges fields into one of yours.`,
		`/customformat rename [name], [new name] - Renames one of yours.`,
		`/customformat notes [name], [text] - Sets a description.`,
		`/customformat private [name], on/off - Hides one from other users.`,
		`/customformat challenge [user], [name] - Challenges someone to one of yours.`,
		`/customformat delete [name] - Deletes one of yours.`,
		`Fields: name, base, ruleset, banlist, unbanlist. Rules are the same names /tier accepts.`,
		`Example: /customformat create {"name":"Monotype Chomp","base":"[Gen 9] OU","banlist":["Uber"],"ruleset":["Same Type Clause"]}`,
	],
};

export function start() {
	void database.connect();
	Chat.multiLinePattern.register('/customformat create ', '/customformat check ', '/customformat edit ');
}
