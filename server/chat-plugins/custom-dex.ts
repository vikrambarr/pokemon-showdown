/** Serves a user's custom species and formats to the teambuilder, and takes its edits back. */
import { Utils } from '../../lib';
import { customBattleSprites, parseCustomFormat, resolveOverlay } from '../custom/dex';
import * as store from '../custom/entries';
import {
	createFormat, editFormat, formatDex, formatBuild, formatDraft, formatInfo, formatRoster, removeFormat,
	resetFormat,
} from './custom-formats';
import { clearSprite, createSpecies, editSpecies, removeSpecies, setSprite } from './custom-species';

/** The write half of the overlay, so the teambuilder room needn't send chat commands. */
async function runAction(user: User, action: string, target: string) {
	switch (toID(action)) {
	case 'create':
		return createSpecies(user, store.parseInput(target, 'species'));
	case 'edit': {
		const [name, json] = store.parts(target);
		if (!json) throw new Chat.ErrorMessage(`Editing needs a name and the fields to change.`);
		return editSpecies(user, name, store.parseInput(json, 'species'));
	}
	case 'delete':
		return removeSpecies(user, target);
	case 'setsprite':
		return (await setSprite(user, target)).row;
	case 'clearsprite':
		return (await clearSprite(user, target)).row;
	}
	throw new Chat.ErrorMessage(`"${action}" isn't something you can do to a custom Pokemon.`);
}

/** The write half for formats, so the formatbuilder needn't send chat commands either. */
async function runFormatAction(user: User, action: string, target: string) {
	switch (toID(action)) {
	case 'create':
		return createFormat(user, store.parseInput(target, 'format'));
	case 'edit': {
		const [name, json] = store.parts(target);
		if (!json) throw new Chat.ErrorMessage(`Editing needs a name and the fields to change.`);
		return editFormat(user, name, store.parseInput(json, 'format'));
	}
	case 'reset':
		return resetFormat(user, target);
	case 'delete':
		return removeFormat(user, target);
	}
	throw new Chat.ErrorMessage(`"${action}" isn't something you can do to a custom format.`);
}

/** A CRQ answer carries the error instead of throwing it, so the room can show it. */
async function attempt(fn: () => Promise<AnyObject>) {
	try {
		return await fn();
	} catch (e: any) {
		if (e.name?.endsWith('ErrorMessage')) return { actionerror: e.message };
		throw e;
	}
}

/** A write, answered with the whole overlay, so the client never has to merge a row in by hand. */
const writeHandler = (
	run: (user: User, action: string, target: string) => Promise<{ name: string }>
): Chat.CRQHandler => (target, user, trustable) => {
	if (!trustable || !user.named) return null;
	const [action, rest] = Utils.splitFirst(target, ' ');
	return attempt(async () => {
		const row = await run(user, action, rest || '');
		return { name: row.name, overlay: await resolveOverlay(user.id) };
	});
};

/** The custom Pokemon a battle is played with: without these an opponent's don't exist. */
async function battleDex(user: User, target: string) {
	const room = Rooms.get(target.trim());
	const payload = room?.battle?.options.customData;
	if (!room?.battle || !payload?.Pokedex) {
		throw new Chat.ErrorMessage(`"${target}" isn't a battle using custom Pokemon.`);
	}
	if (!user.inRooms.has(room.roomid)) {
		throw new Chat.ErrorMessage(`You have to be in a battle to see what it's using.`);
	}
	const ref = parseCustomFormat(room.battle.format);
	const owners = room.battle.players.map(player => player.id).concat(ref ? [ref.ownerid] : []);
	return {
		roomid: room.roomid,
		Pokedex: payload.Pokedex,
		sprites: await customBattleSprites(room.roomid, owners, Object.keys(payload.Pokedex)),
	};
}

export const crqHandlers: { [k: string]: Chat.CRQHandler } = {
	customdex(target, user, trustable) {
		if (!trustable || !user.named) return null;
		return resolveOverlay(user.id);
	},
	/** The species a format allows right now, for the roster list in the formatbuilder. */
	customformatlegal(target, user, trustable) {
		if (!trustable || !user.named) return null;
		return attempt(() => formatRoster(user, target.trim()));
	},
	/** The same, for changes the formatbuilder is holding: a preview of what saving would do. */
	customformatdraft(target, user, trustable) {
		if (!trustable || !user.named) return null;
		return attempt(() => formatDraft(user, target));
	},
	/** What another user's format is called and built on, so a client can offer it. */
	customformatinfo(target, user, trustable) {
		if (!trustable || !user.named) return null;
		return attempt(() => formatInfo(user, target.trim()));
	},
	/** A directory row's button: what the client needs to open a team in someone else's format. */
	customformatbuild(target, user, trustable) {
		if (!trustable || !user.named) return null;
		return attempt(() => formatBuild(user, target.trim()));
	},
	/** The species another user's format is built with: without these a team can't be built for it. */
	customformatdex(target, user, trustable) {
		if (!trustable || !user.named) return null;
		return attempt(() => formatDex(user, target.trim()));
	},
	battledex(target, user, trustable) {
		if (!trustable || !user.named) return null;
		return attempt(() => battleDex(user, target));
	},
	customformat: writeHandler(runFormatAction),
	custompokemon: writeHandler(runAction),
};

export const commands: Chat.ChatCommands = {
	async customdex(target, room, user, connection) {
		if (!user.named) throw new Chat.ErrorMessage(`Choose a username before loading your custom dex.`);
		const overlay = await resolveOverlay(user.id);
		connection.send(`|queryresponse|customdex|${JSON.stringify(overlay)}`);
		return this.sendReply(
			`Sent ${Object.keys(overlay.Pokedex).length} custom Pokemon and ` +
			`${overlay.formats.length} custom formats to your client.`
		);
	},
	customdexhelp: [
		`/customdex - Reloads your custom Pokemon and formats in the teambuilder.`,
	],
};
