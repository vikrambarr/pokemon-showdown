import * as crypto from 'crypto';
import { Utils } from '../../lib';

let challengeOnlyWords: string[] | null = null;

export async function discordWhois(userid: string, user: User) {
	const [discord] = await LoginServer.request('discord/names', { userid });
	if (!discord?.discordid) return '';
	const linkedNames = discord.names.map((id: ID) => {
		const p = Punishments.userids.get(id);
		if (!p || !user.can('alts')) return id;
		return p.map(
			cur => `${id} (${Punishments.punishmentTypes.get(cur.type)?.desc || 'punished'}` + `${cur.id !== id ? ` as ${cur.id}` : ``})`
		).join(' | ');
	}).join(", ");
	return Utils.html`<br />Discord: <a href="https://discord.com/users/${discord.discordid}">${discord.discordid}</a>` +
		`<br />Linked names: ${linkedNames}`;
}

export const commands: Chat.ChatCommands = {
	challengeonly(target, room, user, connection) {
		if (!Config.challengeonlysecret) throw new Chat.ErrorMessage(`Challenge-only accounts are disabled on this server.`);
		if (user.named) throw new Chat.ErrorMessage(`You already have a name.`);
		target = target.trim();
		if (!target) return this.parse('/help challengeonly');

		challengeOnlyWords ||= [
			...Dex.species.all(), ...Dex.items.all(), ...Dex.moves.all(), ...Dex.abilities.all(),
		].filter(effect => !effect.isNonstandard && /^[A-Za-z ]{1,15}$/.test(effect.name) && effect.id.length <= 14)
			.map(effect => effect.name);
		for (let attempt = 0; attempt < 10; attempt++) {
			const hash = crypto.createHmac('sha256', Config.challengeonlysecret).update(`${target},${attempt}`).digest();
			const word = challengeOnlyWords[hash.readUInt32BE(0) % challengeOnlyWords.length];
			const name = `${word} ${`${hash.readUInt32BE(4) % 10000}`.padStart(4, '0')}`;
			const userid = toID(name);
			if (Chat.namefilter(name, user) !== name) continue;
			const conflictUser = Users.getExact(userid);
			if (conflictUser && conflictUser !== user && (
				conflictUser.connected || !conflictUser.challengeOnly || conflictUser.latestIp !== user.latestIp
			)) continue;

			if (!user.handleRename(name, userid, false, '1')) return false;
			const renamed = Users.getExact(userid)!;
			renamed.challengeOnly = true;
			void Punishments.checkIp(renamed, connection);
			return;
		}
		user.send(`|nametaken||There are no challenge-only names available right now.`);
		return false;
	},
	challengeonlyhelp: [
		`/challengeonly [seed] - Gives you a challenge-only name generated from [seed].`,
	],
};

export const chatfilter: Chat.ChatFilter = (message, user, room) => {
	if (user.challengeOnly && !room?.battle?.playerTable[user.id]) {
		throw new Chat.ErrorMessage(`Challenge-only accounts can only talk in battles they're playing in.`);
	}
};

export const loginfilter: Chat.LoginFilter = user => {
	user.challengeOnly = false;
};

export const handlers: Chat.Handlers = {
	onRename(user, oldID, newID) {
		if (!user.s1 || newID.startsWith('guest')) return;
		for (const punishment of Punishments.userids.get(user.s1) || []) {
			if (!punishment.id.startsWith('#')) Punishments.userids.add(newID, punishment);
		}
	},
};

export const punishmentfilter: Chat.PunishmentFilter = (user, punishment) => {
	if (punishment.id.startsWith('#')) return;
	const userid = (typeof user === 'object' && user.s1) || toID(user);
	void LoginServer.request('discord/names', { userid }).then(([res]) => {
		const names = (res?.names as ID[] || []).filter(name => (
			(Punishments.userids.getByType(name, punishment.type)?.expireTime || 0) < punishment.expireTime
		));
		if (!names.length) return;
		for (const name of names) Punishments.userids.add(name, punishment);
		Punishments.savePunishments();
		for (const name of names) {
			const targetUser = Users.getExact(name);
			if (targetUser) Punishments.checkName(targetUser, targetUser.id, targetUser.registered);
		}
	});
};
