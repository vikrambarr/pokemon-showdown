/**
 * Custom Pokemon: a per-account library of user-authored species.
 *
 * The command layer only: storage, validation and payload building live under
 * ../custom/, where the battle path can reach them without going through a
 * hotpatchable plugin.
 */
import { Utils } from '../../lib';
import * as actions from '../custom/species/actions';
import * as database from '../custom/species/database';
import * as sprites from '../custom/species/sprites';
import * as store from '../custom/entries';
import {
	bst, MAX_NOTES_LENGTH, normalizeLearnset, normalizeMoveSources, normalizeSpeciesData,
	resolveLearnset, resolveSpecies, STATS, toExportJSON,
} from '../custom/species/validator';

import { type CustomSpeciesRow, MAX_CUSTOM_SPECIES } from '../custom/species/database';

const MAX_SEARCH = 50;

export const CustomSpecies = new class {
	validateAccess(user: User) {
		actions.validateAccess(user);
	}

	ownedNames(ownerid: ID, excludeEntryid?: number) {
		return actions.ownedNames(ownerid, excludeEntryid);
	}

	getOwn(user: User, name: string) {
		return store.getOwn(user, name, actions.NOUN, database.get);
	}

	getVisible(user: User, ownerid: ID, name: string) {
		return store.getVisible(user, ownerid, name, actions.NOUN, database.get);
	}

	revalidate(row: CustomSpeciesRow, changes: AnyObject) {
		return actions.revalidate(row, changes);
	}

	summary(row: CustomSpeciesRow) {
		const species = resolveSpecies(row);
		const parts = [`<strong>${Utils.escapeHTML(row.name)}</strong>`];
		if (row.inheritsfrom) {
			parts.push(`<small>(variant of ${Utils.escapeHTML(Dex.species.get(row.inheritsfrom).name)})</small>`);
		}
		if (species.types?.length) parts.push(Utils.escapeHTML(species.types.join('/')));
		if (species.baseStats) parts.push(`${statLine(species)} <small>(BST ${bst(species)})</small>`);
		if (row.private) parts.push(`<small>[private]</small>`);
		return parts.join(' &middot; ');
	}

	details(row: CustomSpeciesRow) {
		const species = resolveSpecies(row);
		const learnset = resolveLearnset(row);
		let buf = `<h3>${Utils.escapeHTML(row.name)}</h3>`;
		buf += this.spriteHTML(row);
		buf += `<p>`;
		if (row.inheritsfrom) {
			buf += `Variant of <strong>${Utils.escapeHTML(Dex.species.get(row.inheritsfrom).name)}</strong><br />`;
		}
		buf += `By <strong>${Utils.escapeHTML(row.ownerid)}</strong> &middot; #${row.num} &middot; ${row.views} views`;
		buf += `</p>`;
		const rows: [string, string][] = [];
		if (species.types?.length) rows.push(['Types', species.types.join(' / ')]);
		if (species.baseStats) rows.push(['Base stats', `${statLine(species)} (BST ${bst(species)})`]);
		if (species.abilities) {
			rows.push(['Abilities', Object.entries(species.abilities)
				.map(([slot, ability]) => `${ability}${slot === 'H' ? ' (H)' : slot === 'S' ? ' (S)' : ''}`)
				.join(', ')]);
		}
		if (species.eggGroups?.length) rows.push(['Egg groups', species.eggGroups.join(', ')]);
		if (species.color) rows.push(['Color', species.color]);
		if (species.heightm) rows.push(['Height', `${species.heightm} m`]);
		if (species.weightkg) rows.push(['Weight', `${species.weightkg} kg`]);
		if (species.gender !== undefined) rows.push(['Gender', species.gender || 'M/F']);
		if (species.prevo) rows.push(['Prevo', species.prevo]);
		if (species.evos?.length) rows.push(['Evos', species.evos.join(', ')]);
		if (row.notes) rows.push(['Notes', row.notes]);
		buf += `<table>`;
		for (const [label, value] of rows) {
			buf += `<tr><th style="text-align:right;padding-right:6px">${label}</th>` +
				`<td>${Utils.escapeHTML(value)}</td></tr>`;
		}
		buf += `</table>`;
		const moves = Object.keys(learnset);
		buf += `<p><strong>Learnset</strong> (${Chat.count(moves, "moves")})`;
		if (moves.length) {
			buf += `<br /><small>${Utils.escapeHTML(
				moves.map(id => Dex.moves.get(id).name).sort().join(', ')
			)}</small>`;
		}
		buf += `</p>`;
		return buf;
	}

	spriteHTML(row: CustomSpeciesRow) {
		const stored = row.sprites || {};
		const kinds = Object.keys(sprites.SPRITE_KINDS).filter(kind => stored[kind]);
		if (!kinds.length) return ``;
		return `<p>${kinds.map(kind => {
			const { width, height } = sprites.SPRITE_KINDS[kind];
			return `<img src="${sprites.spriteURL(stored[kind])}" alt="${kind}" ` +
				`width="${width}" height="${height}" style="image-rendering:pixelated" />`;
		}).join(' ')}</p>`;
	}
};

const statLine = (species: AnyObject) =>
	STATS.map(stat => `${stat.toUpperCase()} ${species.baseStats[stat]}`).join(' / ');

export const commands: Chat.ChatCommands = {
	custommon: 'custompokemon',
	custompokemon: {
		async create(target, room, user, connection, cmd) {
			CustomSpecies.validateAccess(user);
			const dryRun = cmd === 'check';
			const input = store.parseInput(target, 'species');
			const otherNames = await CustomSpecies.ownedNames(user.id);
			const normalized = normalizeSpeciesData(input, { otherNames });
			if (dryRun) {
				return this.sendReplyBox(
					`<strong>${Utils.escapeHTML(normalized.name)}</strong> is valid. ` +
					`Nothing was saved - use <code>/custompokemon create</code> to save it.`
				);
			}
			const row = await actions.create(user, input);
			this.sendReply(`Created custom Pokemon "${row.name}" (#${row.num}).`);
			return this.sendReplyBox(CustomSpecies.details(row));
		},
		check: 'create',
		createhelp: [
			`/custompokemon create {json} - Saves a custom Pokemon. Requires: autoconfirmed`,
			`/custompokemon check {json} - Validates without saving. Requires: autoconfirmed`,
		],

		async list(target, room, user) {
			CustomSpecies.validateAccess(user);
			const ownerid = toID(target) || user.id;
			const rows = await database.list(ownerid, MAX_CUSTOM_SPECIES, ownerid !== user.id && !user.can('rangeban'));
			if (!rows.length) {
				return this.sendReply(
					ownerid === user.id ?
						`You haven't made any custom Pokemon yet. Try /custompokemon help.` :
						`${ownerid} has no public custom Pokemon.`
				);
			}
			let buf = `<strong>${Utils.escapeHTML(ownerid)}'s custom Pokemon (${rows.length}):</strong><ul>`;
			for (const row of rows) buf += `<li>${CustomSpecies.summary(row)}</li>`;
			buf += `</ul>`;
			return this.sendReplyBox(buf);
		},

		'': 'view',
		show: 'view',
		async view(target, room, user) {
			CustomSpecies.validateAccess(user);
			if (!toID(target)) return this.parse(`/custompokemon list`);
			const [ownerid, name] = store.parseOwnerAndName(target, user);
			const row = await CustomSpecies.getVisible(user, ownerid, name);
			// Cheap: a stat() per sprite, and a write only if the cache lost them.
			await sprites.ensureCached(row.entryid);
			if (row.ownerid !== user.id) await database.bumpViews(row.entryid);
			return this.sendReplyBox(CustomSpecies.details(row));
		},

		async export(target, room, user) {
			CustomSpecies.validateAccess(user);
			const [ownerid, name] = store.parseOwnerAndName(target, user);
			const row = await CustomSpecies.getVisible(user, ownerid, name);
			return this.sendReplyBox(
				`<details open><summary><strong>${Utils.escapeHTML(row.name)}</strong></summary>` +
				`<textarea rows="14" style="width:100%" readonly>${Utils.escapeHTML(toExportJSON(row))}</textarea>` +
				`</details>`
			);
		},

		async edit(target, room, user) {
			CustomSpecies.validateAccess(user);
			const [name, json] = Utils.splitFirst(target, ',', 1).map(part => part.trim());
			if (!json) throw new Chat.ErrorMessage(`Usage: /custompokemon edit [name], {json}`);
			const row = await actions.edit(user, name, store.parseInput(json, 'species'));
			this.sendReply(`Updated "${row.name}".`);
			return this.sendReplyBox(CustomSpecies.details(row));
		},
		edithelp: [
			`/custompokemon edit [name], {json} - Merges the given fields into a custom Pokemon.`,
			`The whole entry is re-validated, so an edit can't leave it in a broken state.`,
		],

		async rename(target, room, user) {
			CustomSpecies.validateAccess(user);
			const [name, newName] = Utils.splitFirst(target, ',', 1).map(part => part.trim());
			if (!newName) throw new Chat.ErrorMessage(`Usage: /custompokemon rename [name], [new name]`);
			const row = await CustomSpecies.getOwn(user, name);
			const normalized = await CustomSpecies.revalidate(row, { name: newName });
			await database.update(row.entryid, { speciesid: normalized.speciesid, name: normalized.name });
			return this.sendReply(`Renamed "${row.name}" to "${normalized.name}".`);
		},

		learnset: {
			async add(target, room, user, connection, cmd) {
				CustomSpecies.validateAccess(user);
				const [name, moveName, rawSource] = Utils.splitFirst(target, ',', 2).map(part => part.trim());
				if (!moveName) {
					throw new Chat.ErrorMessage(`Usage: /custompokemon learnset add [name], [move], [source]`);
				}
				const row = await CustomSpecies.getOwn(user, name);
				const move = Dex.moves.get(moveName);
				if (!move.exists) throw new Chat.ErrorMessage(`"${moveName}" isn't a move.`);
				// Default source: level 1 in the current generation.
				const sources = normalizeMoveSources(rawSource || `${Dex.gen}L1`, move.name);
				const learnset = { ...row.learnset, [move.id]: sources };
				await database.update(row.entryid, { learnset: normalizeLearnset(learnset) });
				return this.sendReply(`${row.name} now learns ${move.name} (${sources.join(', ')}).`);
			},
			remove: 'delete',
			async delete(target, room, user) {
				CustomSpecies.validateAccess(user);
				const [name, moveName] = Utils.splitFirst(target, ',', 1).map(part => part.trim());
				if (!moveName) {
					throw new Chat.ErrorMessage(`Usage: /custompokemon learnset remove [name], [move]`);
				}
				const row = await CustomSpecies.getOwn(user, name);
				const move = Dex.moves.get(moveName);
				if (!move.exists) throw new Chat.ErrorMessage(`"${moveName}" isn't a move.`);
				if (!row.learnset[move.id]) {
					throw new Chat.ErrorMessage(`${row.name} doesn't learn ${move.name}.`);
				}
				const learnset = { ...row.learnset };
				delete learnset[move.id];
				await database.update(row.entryid, { learnset });
				return this.sendReply(`${row.name} no longer learns ${move.name}.`);
			},
			''() {
				return this.parse(`/help custompokemon`);
			},
		},

		async setnotes(target, room, user) {
			CustomSpecies.validateAccess(user);
			const [name, notes] = Utils.splitFirst(target, ',', 1).map(part => part.trim());
			const row = await CustomSpecies.getOwn(user, name);
			if (notes.length > MAX_NOTES_LENGTH) {
				throw new Chat.ErrorMessage(`Notes can be at most ${MAX_NOTES_LENGTH} characters.`);
			}
			await database.update(row.entryid, { notes: notes || null });
			return this.sendReply(notes ? `Notes updated for "${row.name}".` : `Notes cleared for "${row.name}".`);
		},

		async setprivacy(target, room, user) {
			CustomSpecies.validateAccess(user);
			const [name, rawPrivacy] = Utils.splitFirst(target, ',', 1).map(part => part.trim());
			if (!rawPrivacy) throw new Chat.ErrorMessage(`Usage: /custompokemon setprivacy [name], [on/off]`);
			const row = await CustomSpecies.getOwn(user, name);
			const privacy = store.parsePrivacy(this, rawPrivacy);
			await database.update(row.entryid, { private: privacy });
			return this.sendReply(`"${row.name}" is now ${privacy ? 'private' : 'public'}.`);
		},

		async delete(target, room, user) {
			const row = await actions.remove(user, target);
			return this.sendReply(`Deleted "${row.name}".`);
		},

		async search(target, room, user) {
			CustomSpecies.validateAccess(user);
			const filters: database.SearchFilters = {};
			for (const part of target.split(',')) {
				const [rawKey, rawValue] = Utils.splitFirst(part, '=', 1).map(piece => piece.trim());
				if (!rawValue) continue;
				const key = toID(rawKey);
				switch (key) {
				case 'owner': filters.owner = toID(rawValue); break;
				case 'type': {
					const type = Dex.types.get(rawValue);
					if (!type.exists) throw new Chat.ErrorMessage(`"${rawValue}" isn't a type.`);
					filters.type = type.name;
					break;
				}
				case 'ability': {
					const ability = Dex.abilities.get(rawValue);
					if (!ability.exists) throw new Chat.ErrorMessage(`"${rawValue}" isn't an ability.`);
					filters.ability = ability.name;
					break;
				}
				case 'move': {
					const move = Dex.moves.get(rawValue);
					if (!move.exists) throw new Chat.ErrorMessage(`"${rawValue}" isn't a move.`);
					filters.move = move.id;
					break;
				}
				case 'minbst': filters.minbst = Number(rawValue); break;
				case 'maxbst': filters.maxbst = Number(rawValue); break;
				default:
					throw new Chat.ErrorMessage(
						`"${rawKey}" isn't a filter. Use owner, type, ability, move, minbst or maxbst.`
					);
				}
			}
			if (!Object.keys(filters).length) {
				throw new Chat.ErrorMessage(`Usage: /custompokemon search type=Dragon, minbst=500`);
			}
			if (Number.isNaN(filters.minbst) || Number.isNaN(filters.maxbst)) {
				throw new Chat.ErrorMessage(`BST filters must be numbers.`);
			}
			const rows = await database.search(filters, MAX_SEARCH);
			if (!rows.length) return this.sendReply(`No public custom Pokemon matched.`);
			let buf = `<strong>${Chat.count(rows, "results")}:</strong><ul>`;
			for (const row of rows) {
				buf += `<li>${CustomSpecies.summary(row)} <small>by ${Utils.escapeHTML(row.ownerid)}</small></li>`;
			}
			buf += `</ul>`;
			return this.sendReplyBox(buf);
		},

		async setsprite(target, room, user) {
			CustomSpecies.validateAccess(user);
			const [name, rawKind, data] = Utils.splitFirst(target, ',', 2).map(part => part.trim());
			if (!data) {
				throw new Chat.ErrorMessage(
					`Usage: /custompokemon setsprite [name], [kind], [base64 PNG]<br />` +
					`Kinds: ${Object.keys(sprites.SPRITE_KINDS).join(', ')}`
				);
			}
			const row = await CustomSpecies.getOwn(user, name);
			const kind = sprites.normalizeKind(rawKind);
			const image = await sprites.save(row.entryid, kind, data);
			this.sendReply(`Set the ${kind} sprite for "${row.name}" (${Math.round(image.data.length / 102.4) / 10}KB).`);
			return this.sendReplyBox(
				`<img src="${sprites.spriteURL(image.sha)}" alt="${kind}" width="${image.width}" ` +
				`height="${image.height}" style="image-rendering:pixelated" />`
			);
		},
		setspritehelp: [
			`/custompokemon setsprite [name], [kind], [base64 PNG] - Uploads pixel art.`,
			`front/back/front-shiny/back-shiny must be 96x96; icon must be 40x30. PNG only, max 64KB.`,
		],

		async clearsprite(target, room, user) {
			CustomSpecies.validateAccess(user);
			const [name, rawKind] = Utils.splitFirst(target, ',', 1).map(part => part.trim());
			if (!rawKind) throw new Chat.ErrorMessage(`Usage: /custompokemon clearsprite [name], [kind]`);
			const row = await CustomSpecies.getOwn(user, name);
			const kind = sprites.normalizeKind(rawKind);
			if (!row.sprites?.[kind]) {
				throw new Chat.ErrorMessage(`"${row.name}" has no ${kind} sprite.`);
			}
			await database.removeSprite(row.entryid, kind);
			return this.sendReply(`Removed the ${kind} sprite from "${row.name}".`);
		},

		async sprites(target, room, user) {
			CustomSpecies.validateAccess(user);
			const [ownerid, name] = store.parseOwnerAndName(target, user);
			const row = await CustomSpecies.getVisible(user, ownerid, name);
			const rows = await sprites.ensureCached(row.entryid);
			if (!rows.length) return this.sendReply(`"${row.name}" has no sprites yet.`);
			let buf = `<strong>${Utils.escapeHTML(row.name)}</strong>${CustomSpecies.spriteHTML(row)}<ul>`;
			for (const sprite of rows) {
				buf += `<li>${sprite.kind}: <code>${sprites.spriteURL(sprite.sha)}</code> ` +
					`<small>(${sprite.width}x${sprite.height}, ${Math.round(sprite.bytes / 102.4) / 10}KB)</small></li>`;
			}
			buf += `</ul>`;
			return this.sendReplyBox(buf);
		},

		async rebuildsprites(target, room, user) {
			this.checkCan('rangeban');
			CustomSpecies.validateAccess(user);
			const { total, written } = await sprites.rebuildCache();
			return this.sendReply(`Rebuilt the sprite cache: ${written} of ${total} written, the rest already present.`);
		},
	},

	custompokemonhelp: [
		`/custompokemon create {json} - Saves a custom Pokemon. See below for the fields.`,
		`/custompokemon check {json} - Validates JSON without saving it.`,
		`/custompokemon list [user] - Lists a user's custom Pokemon. Defaults to yourself.`,
		`/custompokemon view [user], [name] - Shows one in full.`,
		`/custompokemon export [user], [name] - Shows its JSON, which /custompokemon create accepts.`,
		`/custompokemon edit [name], {json} - Merges fields into one of yours.`,
		`/custompokemon rename [name], [new name] - Renames one of yours.`,
		`/custompokemon learnset add [name], [move], [source] - Adds a move. Source defaults to this gen, level 1.`,
		`/custompokemon learnset remove [name], [move] - Removes a move.`,
		`/custompokemon setsprite [name], [kind], [base64 PNG] - Uploads art. Kinds: front, back, front-shiny, back-shiny (96x96), icon (40x30).`,
		`/custompokemon clearsprite [name], [kind] - Removes one image.`,
		`/custompokemon sprites [user], [name] - Lists the image URLs.`,
		`/custompokemon setnotes [name], [text] - Sets freeform notes.`,
		`/custompokemon setprivacy [name], [on/off] - Hides one from other users.`,
		`/custompokemon delete [name] - Deletes one of yours, and its images.`,
		`/custompokemon search type=Dragon, minbst=500 - Searches public entries. Filters: owner, type, ability, move, minbst, maxbst.`,
		`A standalone entry needs name, types, abilities, baseStats, eggGroups and weightkg. Alternatively,`,
		`set "inheritsFrom" to an official species and supply only the fields you want to change.`,
		`Example: /custompokemon create {"inheritsFrom":"Garchomp","name":"Garchomp-Steel","types":["Dragon","Steel"]}`,
		`Custom Pokemon are playable in a custom format that unbans them - see /customformat help.`,
	],
};

export function start() {
	void database.connect();
	// JSON and base64 payloads both run past one line in the client's chat box.
	Chat.multiLinePattern.register(
		'/custompokemon create ', '/custompokemon check ', '/custompokemon edit ', '/custompokemon setsprite ',
		'/custommon create ', '/custommon check ', '/custommon edit ', '/custommon setsprite '
	);
}
