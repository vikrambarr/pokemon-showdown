/**
 * Serves a user's custom species and formats to the teambuilder via `/crq customdex`,
 * in the same shapes the data files use, and takes its edits back through
 * `/crq custompokemon`.
 */
import { Utils } from '../../lib';
import { resolveOverlay } from '../custom/dex';
import * as store from '../custom/entries';
import { createSpecies, editSpecies, removeSpecies, setSprite } from './custom-species';

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
	}
	throw new Chat.ErrorMessage(`"${action}" isn't something you can do to a custom Pokemon.`);
}

export const crqHandlers: { [k: string]: Chat.CRQHandler } = {
	customdex(target, user, trustable) {
		if (!trustable || !user.named) return null;
		return resolveOverlay(user.id);
	},
	async custompokemon(target, user, trustable) {
		if (!trustable || !user.named) return null;
		const [action, rest] = Utils.splitFirst(target, ' ');
		try {
			const row = await runAction(user, action, rest || '');
			// The whole overlay, so the client never has to merge a row in by hand.
			return { name: row.name, overlay: await resolveOverlay(user.id) };
		} catch (e: any) {
			if (e.name?.endsWith('ErrorMessage')) return { actionerror: e.message };
			throw e;
		}
	},
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
