import { Utils } from '../../lib';
import * as Dexes from '../dexes';
import { EFFECT_NAMES, EFFECT_PLURALS } from '../dexes/effects';
import type { Origin } from '../dexes/species';
import type { EffectTable } from '../../sim/dex-custom';
import { SPRITE_KINDS, spriteURL, toKind } from '../dexes/sprites';

void Dexes.load().catch(err => Monitor.crashlog(err, 'Loading dexes'));

function checkEnabled(user: User) {
	if (!Config.usepostgres || Config.dexes === undefined || Config.dexes === false) {
		throw new Chat.ErrorMessage(`Dexes are turned off on this server.`);
	}
	if (!Users.globalAuth.atLeast(user, Config.dexes)) {
		throw new Chat.ErrorMessage(`You don't have permission to make or edit dexes.`);
	}
}

function parseJSON(target: string) {
	try {
		const value = JSON.parse(target);
		if (value && typeof value === 'object' && !Array.isArray(value)) return value as AnyObject;
	} catch {}
	throw new Chat.ErrorMessage(`That needs to be a JSON object, like {"name": "Pikachu"}.`);
}

function args(target: string, count: number, usage: string) {
	const parts = Utils.splitFirst(target, ',', count - 1).map(part => part.trim());
	if (parts.some(part => !part)) throw new Chat.ErrorMessage(`Usage: ${usage}`);
	return parts;
}

const PAGE_SIZE = 50;
const EFFECT_TABLES: { [name: string]: EffectTable } = {
	move: 'Moves', ability: 'Abilities', item: 'Items', condition: 'Conditions',
};

function toTable(input: string) {
	const table = EFFECT_TABLES[toID(input)];
	if (!table) throw new Chat.ErrorMessage(`"${input}" isn't one of: ${Object.keys(EFFECT_TABLES).join(', ')}.`);
	return table;
}

function toAnyTable(input: string): Dexes.Table {
	return toID(input) === 'pokemon' ? 'Pokedex' : toTable(input);
}

async function viewer(user: User) {
	try {
		return user.registered ? await Dexes.accountOf(user) : null;
	} catch {
		return null;
	}
}

async function owned(user: User, name: string) {
	const loaded = Dexes.getDex(name);
	if (loaded.row.ownerid !== await Dexes.accountOf(user) && !user.can('bypassall')) {
		throw new Chat.ErrorMessage(`Only the owner of ${loaded.row.name} can do that.`);
	}
	return loaded;
}

function originHTML(entry: { origin: Origin | null, trackdex: ID | null }) {
	if (!entry.origin) return '';
	const { name, dex, owner } = entry.origin;
	return Utils.html` (from ${name} in ${dex} by ${owner}${entry.trackdex ? `, following its changes` : ''})`;
}

function dexTable(list: Dexes.LoadedDex[], empty: string) {
	if (!list.length) return empty;
	let buf = `<table><tr><th>Dex</th><th>Based on</th><th>Owner</th><th>Pok&eacute;mon</th><th>Formats</th></tr>`;
	for (const loaded of list) {
		const dex = summary(loaded);
		buf += Utils.html`<tr><td><button class="button" name="send" value="/dexes info ${dex.id}">${dex.name}</button>`;
		buf += `${dex.visibility === 'private' ? ' (private)' : ''}</td>`;
		buf += Utils.html`<td>${dex.mod}</td><td>${dex.owner}</td><td>${dex.species} (${dex.entries} custom or edited)</td>`;
		buf += Utils.html`<td>${dex.formats.map(format => format.name).join(', ') || '(none)'}</td></tr>`;
	}
	return `${buf}</table>`;
}

function summary(loaded: Dexes.LoadedDex) {
	return {
		id: loaded.row.dexid,
		name: loaded.row.name,
		mod: loaded.row.mod,
		owner: loaded.row.ownername,
		visibility: loaded.row.visibility,
		origin: loaded.row.origin,
		species: loaded.data.species.length,
		entries: loaded.entries.size,
		formats: [...loaded.formats.keys()].map(formatid => ({ id: formatid, name: Dex.formats.get(formatid).name })),
	};
}

function spriteHTML(loaded: Dexes.LoadedDex, images: { [kind: string]: string }) {
	return Object.keys(SPRITE_KINDS).filter(kind => loaded.uploads.has(images[kind])).map(kind => {
		const { width, height } = SPRITE_KINDS[kind];
		const image = loaded.uploads.get(images[kind])!;
		const title = `${kind} by ${image.uploadername}, from ${image.dexname}`;
		return Utils.html`<img src="${spriteURL(image.sha)}" alt="${kind}" title="${title}" width="${width}" height="${height}" />`;
	}).join(' ');
}

export const commands: Chat.ChatCommands = {
	dexes: {
		''(target, room, user) {
			return this.parse(`/dexes list`);
		},
		async list(target, room, user) {
			this.runBroadcast();
			const account = await viewer(user);
			const list = [...Dexes.dexes.values()].filter(loaded => Dexes.listed(loaded, account));
			const page = Math.max(1, parseInt(target) || 1);
			let buf = dexTable(list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), `There are no dexes here.`);
			if (list.length > page * PAGE_SIZE) {
				buf += `<br /><button class="button" name="send" value="/dexes list ${page + 1}">More</button>`;
			}
			return this.sendReplyBox(buf);
		},
		async search(target, room, user) {
			this.runBroadcast();
			if (!toID(target)) return this.parse(`/help dexes`);
			const list = Dexes.search(target, await viewer(user)).slice(0, PAGE_SIZE);
			return this.sendReplyBox(dexTable(list, Utils.html`No dexes have "${target}" in their names.`));
		},
		async user(target, room, user) {
			this.runBroadcast();
			if (!toID(target)) return this.parse(`/help dexes`);
			const list = await Dexes.dexesOf(target, await viewer(user));
			return this.sendReplyBox(dexTable(list, Utils.html`${target} has no dexes you can see.`));
		},
		async visibility(target, room, user) {
			checkEnabled(user);
			const [dexName, visibility] = args(target, 2, `/dexes visibility [dex], [public|private]`);
			const loaded = await Dexes.setVisibility(await owned(user, dexName), toID(visibility));
			this.sendReply(loaded.row.visibility === 'private' ?
				`${loaded.row.name} is private: it isn't listed or searchable, but anyone with its exact name can see, use and import it.` :
				`${loaded.row.name} is public.`);
		},
		async import(target, room, user) {
			checkEnabled(user);
			const usage = `/dexes import [your dex], [from dex], [pokemon|move|ability|item|condition], [name], [overwrite]`;
			const [dexName, sourceName, kind, rest] = args(target, 4, usage);
			const [name, flag] = rest.split(',').map(part => part.trim());
			const { loaded, copied, warnings } = await Dexes.importEntry(
				await Dexes.editable(user, dexName), Dexes.getDex(sourceName), toAnyTable(kind), name, toID(flag) === 'overwrite'
			);
			let buf = Utils.html`Imported into ${loaded.row.name}: ${copied.join(', ')}. They follow changes to the originals until you edit them.`;
			if (warnings.length) buf += Utils.html`<br />Some changes don't carry over: ${warnings.join('; ')}`;
			this.sendReplyBox(buf);
		},
		async importdex(target, room, user) {
			checkEnabled(user);
			const [name, sourceName] = args(target, 2, `/dexes importdex [new dex name], [from dex]`);
			const { loaded, copied, warnings } = await Dexes.importDex(user, name, Dexes.getDex(sourceName));
			let buf = Utils.html`Made ${loaded.row.name}, a copy of ${sourceName} with ${Chat.count(copied, 'custom or edited entries', 'custom or edited entry')} `;
			buf += Utils.html`and ${Chat.count(loaded.formats, 'formats')}. Entries follow changes to the originals until you edit them.`;
			if (warnings.length) buf += Utils.html`<br />Some things didn't carry over: ${warnings.join('; ')}`;
			this.sendReplyBox(buf);
		},
		async detach(target, room, user) {
			checkEnabled(user);
			const [dexName, kind, name] = args(target, 3, `/dexes detach [dex], [pokemon|move|ability|item|condition], [name]`);
			const loaded = await Dexes.editable(user, dexName);
			const table = toAnyTable(kind);
			const entry = Dexes.entriesOf(loaded, table).get(toID(name));
			if (!entry?.trackdex) throw new Chat.ErrorMessage(`${name} in ${loaded.row.name} isn't following anything.`);
			await Dexes.detach(loaded, table, toID(name));
			this.sendReply(`${entry.data.name} in ${loaded.row.name} no longer follows changes to the original.`);
		},
		info(target, room, user) {
			this.runBroadcast();
			const loaded = Dexes.getDex(target);
			const dex = summary(loaded);
			let buf = Utils.html`<strong>${dex.name}</strong>, based on ${dex.mod}, owned by ${dex.owner}`;
			if (dex.origin) buf += Utils.html`, copied from ${dex.origin.dex} by ${dex.origin.owner}`;
			buf += `. ${dex.visibility === 'private' ? 'Private' : 'Public'}.<br />`;
			buf += `${dex.species} Pok&eacute;mon, ${dex.entries} custom or edited. Version <code>${loaded.data.hash}</code>.`;
			for (const entry of loaded.entries.values()) {
				buf += Utils.html`<br /><strong>${entry.data.name}</strong>${entry.inheritsfrom ? ` (based on ${entry.inheritsfrom})` : ''}`;
				buf += `${originHTML(entry)} ${spriteHTML(loaded, entry.sprites)}`;
			}
			for (const table in EFFECT_NAMES) {
				const effects = [...loaded.effects[table as EffectTable].values()];
				if (!effects.length) continue;
				buf += `<br />${EFFECT_PLURALS[table as EffectTable]}: `;
				buf += effects.map(entry => Utils.html`<strong>${entry.data.name}</strong>` +
					(entry.inheritsfrom ? Utils.html` (based on ${entry.inheritsfrom})` : '') + originHTML(entry) +
					(entry.sprites.item ? ' ' + spriteHTML(loaded, { item: entry.sprites.item }) : '')).join(', ');
			}
			buf += `<br />Formats: `;
			buf += dex.formats.map(format => Utils.html`<code>${format.name}</code>`).join(', ') || '(none)';
			if (loaded.stale.length) {
				buf += `<br />These changes stopped working after an update and are being skipped: `;
				buf += loaded.stale.map(problem => Utils.html`${problem}`).join('; ');
			}
			return this.sendReplyBox(buf);
		},
		async create(target, room, user) {
			checkEnabled(user);
			const [name, mod] = args(target, 2, `/dexes create [name], [base mod]`);
			const loaded = await Dexes.createDex(user, name, mod);
			this.sendReply(`Made ${loaded.row.name}, with the ${loaded.row.species.length} Pokemon in ${loaded.row.mod}.`);
		},
		async delete(target, room, user) {
			checkEnabled(user);
			const loaded = Dexes.getDex(target);
			if (loaded.row.ownerid !== await Dexes.accountOf(user) && !user.can('bypassall')) {
				throw new Chat.ErrorMessage(`Only the owner of ${loaded.row.name} can delete it.`);
			}
			await Dexes.deleteDex(loaded);
			this.sendReply(`Deleted ${loaded.row.name}. Replays of its battles keep working.`);
		},
		async add(target, room, user, connection, cmd) {
			checkEnabled(user);
			const [dexName, names] = args(target, 2, `/dexes ${cmd} [dex], [pokemon], [pokemon]...`);
			const loaded = await Dexes.editable(user, dexName);
			const ids = Dexes.findSpecies(loaded, names.split(','));
			const updated = await Dexes.setSpecies(loaded, ids, cmd === 'add');
			this.sendReply(`${cmd === 'add' ? 'Added' : 'Removed'} ${ids.size} Pokemon. ${updated.row.name} has ${updated.data.species.length} now.`);
		},
		remove: 'add',
		async pokemon(target, room, user) {
			checkEnabled(user);
			const [dexName, input] = args(target, 2, `/dexes pokemon [dex], [JSON]`);
			const { loaded, entry } = await Dexes.putEntry(await Dexes.editable(user, dexName), parseJSON(input));
			this.sendReply(`Saved ${entry.data.name} in ${loaded.row.name}.`);
		},
		async deletepokemon(target, room, user) {
			checkEnabled(user);
			const [dexName, name] = args(target, 2, `/dexes deletepokemon [dex], [pokemon]`);
			const loaded = await Dexes.deleteEntry(await Dexes.editable(user, dexName), name);
			this.sendReply(`Removed ${name} from ${loaded.row.name}'s custom and edited Pokemon.`);
		},
		async move(target, room, user, connection, cmd) {
			checkEnabled(user);
			const [dexName, input] = args(target, 2, `/dexes ${cmd} [dex], [JSON]`);
			const table = toTable(cmd);
			const { loaded, entry } = await Dexes.putEffect(await Dexes.editable(user, dexName), table, parseJSON(input));
			this.sendReply(`Saved the ${EFFECT_NAMES[table]} ${entry.data.name} in ${loaded.row.name}.`);
		},
		ability: 'move',
		item: 'move',
		condition: 'move',
		async deletemove(target, room, user, connection, cmd) {
			checkEnabled(user);
			const [dexName, name] = args(target, 2, `/dexes ${cmd} [dex], [name]`);
			const table = toTable(cmd.slice(6));
			const loaded = await Dexes.deleteEffect(await Dexes.editable(user, dexName), table, name);
			this.sendReply(`Removed ${name} from ${loaded.row.name}'s custom and edited ${EFFECT_PLURALS[table].toLowerCase()}.`);
		},
		deleteability: 'deletemove',
		deleteitem: 'deletemove',
		deletecondition: 'deletemove',
		code(target, room, user) {
			this.runBroadcast();
			const [dexName, kind, name] = args(target, 3, `/dexes code [dex], [move|ability|item|condition], [name]`);
			const editor = Dexes.effectEditor(Dexes.getDex(dexName), toTable(kind), name);
			let buf = Utils.html`<strong>${editor.name}</strong>`;
			if (editor.base && !editor.official) buf += Utils.html` (from ${editor.base})`;
			for (const handler of editor.handlers) {
				buf += Utils.html`<br /><br /><code>${handler.path}</code>`;
				if (handler.event !== handler.path.split('.').pop()) buf += Utils.html` works as <code>${handler.event}</code>`;
				if (handler.events.length) {
					buf += ` (can work on another stat: ${handler.events.map(event => Utils.html`<code>${event}</code>`).join(', ')})`;
				}
				if (!handler.editable) {
					buf += ` uses code from outside itself, so its values can't be changed.`;
					continue;
				}
				if (!handler.slots.length) buf += ` has nothing to change.`;
				for (const slot of handler.slots) {
					const end = slot.column + slot.length;
					buf += Utils.html`<br /><code>${handler.path}:${slot.index}</code> ${slot.kind} <strong>${JSON.stringify(slot.value)}</strong>`;
					if (slot.value !== slot.original) buf += Utils.html` (was ${JSON.stringify(slot.original)})`;
					buf += Utils.html`: <code>${slot.line.slice(0, slot.column)}<strong>${slot.line.slice(slot.column, end)}</strong>`;
					buf += Utils.html`${slot.line.slice(end)}</code>`;
				}
			}
			if (editor.lost?.engine.length) {
				buf += Utils.html`<br /><br />The battle engine treats ${editor.base} specially in `;
				buf += editor.lost.engine.map(entry => Utils.html`${entry.file} (${entry.count})`).join(', ');
				buf += `. A copy doesn't get that.`;
			}
			if (editor.lost?.references.length) {
				buf += Utils.html`<br /><br />These check for ${editor.base} by name, and won't affect the copy: `;
				buf += editor.lost.references.map(entry => Utils.html`${entry.effect}`).join(', ');
			}
			return this.sendReplyBox(buf);
		},
		async sprite(target, room, user) {
			checkEnabled(user);
			const [dexName, name, kind, image] = args(target, 4, `/dexes sprite [dex], [pokemon or item], [kind], [base64 PNG]`);
			const loaded = await Dexes.setSprite(user, await Dexes.editable(user, dexName), name, toKind(kind), image);
			const entry = toKind(kind) === 'item' ? Dexes.getEffect(loaded, 'Items', name) : Dexes.getEntry(loaded, name);
			this.sendReplyBox(Utils.html`Set the ${toKind(kind)} sprite of ${name}: ` + spriteHTML(loaded, entry.sprites));
		},
		async clearsprite(target, room, user) {
			checkEnabled(user);
			const [dexName, name, kind] = args(target, 3, `/dexes clearsprite [dex], [pokemon or item], [kind]`);
			await Dexes.setSprite(user, await Dexes.editable(user, dexName), name, toKind(kind), null);
			this.sendReply(`Removed the ${toKind(kind)} sprite of ${name}.`);
		},
		async deletesprite(target, room, user) {
			checkEnabled(user);
			const [dexName, name, kind] = args(target, 3, `/dexes deletesprite [dex], [pokemon or item], [kind]`);
			const loaded = Dexes.getDex(dexName);
			const entry = toKind(kind) === 'item' ? Dexes.getEffect(loaded, 'Items', name) : Dexes.getEntry(loaded, name);
			if (!entry.sprites[toKind(kind)]) throw new Chat.ErrorMessage(`${entry.data.name} has no ${toKind(kind)} sprite.`);
			const { image, uses } = await Dexes.deleteSprite(user, entry.sprites[toKind(kind)]);
			this.sendReply(`Deleted ${image.uploadername}'s ${image.kind} sprite from everywhere it was used (${uses}).`);
		},
		async format(target, room, user) {
			checkEnabled(user);
			const [dexName, input] = args(target, 2, `/dexes format [dex], [JSON]`);
			const { formatid } = await Dexes.putFormat(await Dexes.editable(user, dexName), parseJSON(input));
			this.sendReply(`Saved ${Dex.formats.get(formatid).name} (${formatid}). Challenge someone in it with /challenge [user], ${formatid}`);
		},
		async deleteformat(target, room, user) {
			checkEnabled(user);
			const [dexName, name] = args(target, 2, `/dexes deleteformat [dex], [format]`);
			const loaded = await Dexes.deleteFormat(await Dexes.editable(user, dexName), name);
			this.sendReply(`Deleted that format from ${loaded.row.name}.`);
		},
		async rebuildfiles(target, room, user) {
			this.checkCan('bypassall');
			const { snapshots, written, sprites } = await Dexes.rebuildFiles();
			this.sendReply(
				`Rewrote ${written} of ${snapshots} dex snapshots and ${sprites.written} of ${sprites.total} sprites; the rest were already there.`
			);
		},
	},
	dexeshelp: [
		`/dexes list [page] - Lists public dexes, and your private ones.`,
		`/dexes search [text] - Finds public dexes with that text in their names.`,
		`/dexes user [username] - Lists a user's public dexes, including ones they help edit.`,
		`/dexes info [dex] - Shows a dex's custom Pokemon and formats.`,
		`/dexes visibility [dex], [public|private] - Private dexes aren't listed or searchable, but anyone with the exact name can still see, challenge in and import them.`,
		`/dexes import [your dex], [from dex], [pokemon|move|ability|item|condition], [name], [overwrite] - Copies something from another dex, with the custom things it needs. Copies follow changes to the original until you edit them. "overwrite" replaces your own versions.`,
		`/dexes importdex [new dex name], [from dex] - Makes your own copy of a whole dex.`,
		`/dexes detach [dex], [pokemon|move|ability|item|condition], [name] - Stops an imported copy following the original.`,
		`/dexes create [name], [base mod] - Makes a dex with every Pokemon in a mod, like gen9 or gen8.`,
		`/dexes delete [dex] - Deletes a dex you own.`,
		`/dexes add [dex], [pokemon], ... - Puts Pokemon from the base mod into a dex, with their formes.`,
		`/dexes remove [dex], [pokemon], ... - Takes Pokemon out of a dex, with their formes.`,
		`/dexes pokemon [dex], [JSON] - Makes or edits a Pokemon. Using an existing Pokemon's name edits it for this dex. Fields: name, inheritsFrom, types, baseStats, abilities, eggGroups, weightkg, heightm, color, gender, genderRatio, prevo, evos, evoType, evoLevel, evoItem, evoMove, evoCondition, tier, doublesTier, natDexTier, tags, learnset. null clears a field.`,
		`/dexes deletepokemon [dex], [pokemon] - Deletes a custom Pokemon, or undoes edits to an existing one.`,
		`/dexes move [dex], [JSON] - Makes or edits a move. Using an existing move's name edits it for this dex; "inheritsFrom" copies another move, code and all. Set any attribute, like "basePower" or "secondary"; null clears it. "slots" changes values in the code, like {"onHit:0": "Fire"}, numbered as in /dexes code. "replace" changes every matching value, like [["Water", "Fire"]]. "events" moves a stat handler to another stat, like {"onModifySpe": "atk"}.`,
		`/dexes ability [dex], [JSON] - Makes or edits an ability, like /dexes move.`,
		`/dexes item [dex], [JSON] - Makes or edits an item, like /dexes move. "spriteFrom" uses another item's icon.`,
		`/dexes condition [dex], [JSON] - Makes or edits a condition, like a status or weather, like /dexes move.`,
		`/dexes deletemove [dex], [name] - Deletes a custom move, or undoes edits to an existing one. Also: deleteability, deleteitem, deletecondition.`,
		`/dexes code [dex], [move|ability|item|condition], [name] - Shows the values in its code you can change, and what a copy loses.`,
		`/dexes sprite [dex], [pokemon or item], [kind], [base64 PNG] - Sets a sprite. Kinds: front, back, front-shiny, back-shiny (96x96), icon (40x30), item (24x24, items only).`,
		`/dexes clearsprite [dex], [pokemon or item], [kind] - Stops using a sprite here.`,
		`/dexes deletesprite [dex], [pokemon or item], [kind] - Deletes a sprite you uploaded, everywhere it was copied to.`,
		`/dexes format [dex], [JSON] - Makes or edits a format. Fields: name, gameType, ruleset, banlist, unbanlist, restricted, bestOfDefault, teraPreviewDefault.`,
		`/dexes deleteformat [dex], [format] - Deletes a format.`,
		`/dexes rebuildfiles - Rewrites missing snapshot and sprite files from the database. Requires: ~`,
	],
};

export const crqHandlers: { [k: string]: Chat.CRQHandler } = {
	async dexes(target, user) {
		const account = await viewer(user);
		const list = toID(target) ? Dexes.search(target, account) :
			[...Dexes.dexes.values()].filter(loaded => Dexes.listed(loaded, account));
		return list.map(summary);
	},
	async dexesof(target, user) {
		return (await Dexes.dexesOf(target, await viewer(user))).map(summary);
	},
	dex(target) {
		const loaded = Dexes.dexes.get(toID(target));
		if (!loaded) return null;
		return { ...summary(loaded), ...Dexes.clientData(loaded) };
	},
	dexeffect(target) {
		const [dexid, kind, name] = Utils.splitFirst(target, ',', 2).map(part => part.trim());
		const loaded = Dexes.dexes.get(toID(dexid));
		const table = EFFECT_TABLES[toID(kind)];
		if (!loaded || !table) return null;
		try {
			return Dexes.effectEditor(loaded, table, name);
		} catch (e) {
			if (e instanceof Chat.ErrorMessage) return null;
			throw e;
		}
	},
};

export const handlers: Chat.Handlers = {
	onBattleCreate(battle) {
		void Dexes.saveSnapshot(battle.format).catch(err => Monitor.crashlog(err, 'A dex snapshot'));
	},
};
