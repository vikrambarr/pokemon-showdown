import { Utils } from '../../lib';
import * as Dexes from '../dexes';
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

function summary(loaded: Dexes.LoadedDex) {
	return {
		id: loaded.row.dexid,
		name: loaded.row.name,
		mod: loaded.row.mod,
		owner: loaded.row.ownername,
		species: loaded.data.species.length,
		entries: loaded.entries.size,
		formats: [...loaded.formats.keys()].map(formatid => ({ id: formatid, name: Dex.formats.get(formatid).name })),
	};
}

function spriteHTML(entry: { sprites: { [kind: string]: string } }) {
	return Object.keys(SPRITE_KINDS).filter(kind => entry.sprites[kind]).map(kind => {
		const { width, height } = SPRITE_KINDS[kind];
		return `<img src="${spriteURL(entry.sprites[kind])}" alt="${kind}" width="${width}" height="${height}" />`;
	}).join(' ');
}

export const commands: Chat.ChatCommands = {
	dexes: {
		''(target, room, user) {
			return this.parse(`/dexes list`);
		},
		list(target, room, user) {
			this.runBroadcast();
			if (!Dexes.dexes.size) return this.sendReplyBox(`There are no dexes yet.`);
			let buf = `<table><tr><th>Dex</th><th>Based on</th><th>Owner</th><th>Pok&eacute;mon</th><th>Formats</th></tr>`;
			for (const loaded of Dexes.dexes.values()) {
				const dex = summary(loaded);
				buf += Utils.html`<tr><td><button class="button" name="send" value="/dexes info ${dex.id}">${dex.name}</button></td>`;
				buf += Utils.html`<td>${dex.mod}</td><td>${dex.owner}</td><td>${dex.species} (${dex.entries} custom or edited)</td>`;
				buf += Utils.html`<td>${dex.formats.map(format => format.name).join(', ') || '(none)'}</td></tr>`;
			}
			return this.sendReplyBox(`${buf}</table>`);
		},
		info(target, room, user) {
			this.runBroadcast();
			const loaded = Dexes.getDex(target);
			const dex = summary(loaded);
			let buf = Utils.html`<strong>${dex.name}</strong>, based on ${dex.mod}, owned by ${dex.owner}.<br />`;
			buf += `${dex.species} Pok&eacute;mon, ${dex.entries} custom or edited. Version <code>${loaded.data.hash}</code>.`;
			for (const entry of loaded.entries.values()) {
				buf += Utils.html`<br /><strong>${entry.data.name}</strong>${entry.inheritsfrom ? ` (from ${entry.inheritsfrom})` : ''} `;
				buf += spriteHTML(entry);
			}
			buf += `<br />Formats: `;
			buf += dex.formats.map(format => Utils.html`<code>${format.name}</code>`).join(', ') || '(none)';
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
		async sprite(target, room, user) {
			checkEnabled(user);
			const [dexName, name, kind, image] = args(target, 4, `/dexes sprite [dex], [pokemon], [kind], [base64 PNG]`);
			const loaded = await Dexes.setSprite(await Dexes.editable(user, dexName), name, toKind(kind), image);
			this.sendReplyBox(Utils.html`Set the ${toKind(kind)} sprite of ${name}: ` + spriteHTML(Dexes.getEntry(loaded, name)));
		},
		async clearsprite(target, room, user) {
			checkEnabled(user);
			const [dexName, name, kind] = args(target, 3, `/dexes clearsprite [dex], [pokemon], [kind]`);
			await Dexes.setSprite(await Dexes.editable(user, dexName), name, toKind(kind), null);
			this.sendReply(`Removed the ${toKind(kind)} sprite of ${name}.`);
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
		`/dexes list - Lists every dex.`,
		`/dexes info [dex] - Shows a dex's custom Pokemon and formats.`,
		`/dexes create [name], [base mod] - Makes a dex with every Pokemon in a mod, like gen9 or gen8.`,
		`/dexes delete [dex] - Deletes a dex you own.`,
		`/dexes add [dex], [pokemon], ... - Puts Pokemon from the base mod into a dex, with their formes.`,
		`/dexes remove [dex], [pokemon], ... - Takes Pokemon out of a dex, with their formes.`,
		`/dexes pokemon [dex], [JSON] - Makes or edits a Pokemon. Using an existing Pokemon's name edits it for this dex. Fields: name, inheritsFrom, types, baseStats, abilities, eggGroups, weightkg, heightm, color, gender, genderRatio, prevo, evos, evoType, evoLevel, evoItem, evoMove, evoCondition, tier, doublesTier, natDexTier, tags, learnset. null clears a field.`,
		`/dexes deletepokemon [dex], [pokemon] - Deletes a custom Pokemon, or undoes edits to an existing one.`,
		`/dexes sprite [dex], [pokemon], [kind], [base64 PNG] - Sets a sprite. Kinds: front, back, front-shiny, back-shiny (96x96), icon (40x30).`,
		`/dexes clearsprite [dex], [pokemon], [kind] - Removes a sprite.`,
		`/dexes format [dex], [JSON] - Makes or edits a format. Fields: name, gameType, ruleset, banlist, unbanlist, restricted, bestOfDefault, teraPreviewDefault.`,
		`/dexes deleteformat [dex], [format] - Deletes a format.`,
		`/dexes rebuildfiles - Rewrites missing snapshot and sprite files from the database. Requires: ~`,
	],
};

export const crqHandlers: { [k: string]: Chat.CRQHandler } = {
	dexes() {
		return [...Dexes.dexes.values()].map(summary);
	},
	dex(target) {
		const loaded = Dexes.dexes.get(toID(target));
		if (!loaded) return null;
		return { ...summary(loaded), ...Dexes.clientData(loaded) };
	},
};

export const handlers: Chat.Handlers = {
	onBattleCreate(battle) {
		void Dexes.saveSnapshot(battle.format).catch(err => Monitor.crashlog(err, 'A dex snapshot'));
	},
};
