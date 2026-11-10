import * as crypto from 'crypto';
import * as http from 'http';
import { Utils } from '../../lib';
import * as Dexes from '../dexes';
import { EFFECT_NAMES, EFFECT_PLURALS } from '../dexes/effects';
import type { Origin } from '../dexes/species';
import type { EffectTable } from '../../sim/dex-custom';
import { STATUSES, handlersOf, parseHandler } from '../../sim/dex-handlers';
import { MAX_SPRITE_BYTES, SPRITE_KINDS, checkKind, spriteURL, toKind, toSettings } from '../dexes/sprites';

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
	if (toID(input) === 'type') return 'TypeChart';
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

function originHTML(entry: { origin: Origin | null, trackdex: ID | null, locked: boolean }) {
	if (!entry.origin) return entry.locked ? ' (locked)' : '';
	const { name, dex, owner } = entry.origin;
	const notes = `${entry.trackdex ? `, following its changes` : ''}${entry.locked ? ', locked' : ''}`;
	return Utils.html` (forked from ${name} in ${dex} by ${owner}${notes})`;
}

function dexTable(list: Dexes.LoadedDex[], empty: string) {
	if (!list.length) return empty;
	let buf = `<table><tr><th>Dex</th><th>World</th><th>Owner</th><th>Pok&eacute;mon</th><th>Formats</th></tr>`;
	for (const loaded of list) {
		const dex = summary(loaded);
		buf += Utils.html`<tr><td><button class="button" name="send" value="/dexes info ${dex.id}">${dex.name}</button>`;
		buf += `${dex.official ? ' (official)' : ''}${dex.visibility === 'private' ? ' (private)' : ''}</td>`;
		buf += Utils.html`<td>${dex.base}</td><td>${dex.owner}</td><td>${dex.species} (${dex.entries} custom or edited)</td>`;
		buf += Utils.html`<td>${dex.formats.map(format => format.name).join(', ') || '(none)'}</td></tr>`;
	}
	return `${buf}</table>`;
}

const COUNTED: [Dexes.Table, string][] = [
	['Pokedex', 'Pok&eacute;mon'], ...Object.entries(EFFECT_PLURALS) as [EffectTable, string][], ['TypeChart', 'Types'],
];

const GETTERS = { Moves: 'moves', Abilities: 'abilities', Items: 'items', Conditions: 'conditions', TypeChart: 'types' } as const;

function shownIds(loaded: Dexes.LoadedDex, table: keyof typeof GETTERS, layers = Dexes.ancestorsOf(loaded)) {
	return Object.keys(loaded.dex.data[table]).filter(id => !(loaded.dex[GETTERS[table]].get(id) as AnyObject).isNonstandard ||
		layers.some(layer => Dexes.entriesOf(layer, table).has(id as ID)));
}

const countsCache = new WeakMap<Dexes.LoadedDex, AnyObject[]>();
const entriesCache = new WeakMap<Dexes.LoadedDex, AnyObject>();

const UNCOMPARED = new Set([
	'gen', 'isNonstandard', 'num', 'rating', 'evos', 'otherFormes', 'cosmeticFormes', 'formeOrder',
]);

function gameOf(loaded: Dexes.LoadedDex) {
	let game = Dex.mod(loaded.row.mod);
	while (!game.isBase && !/^gen\d+$/.test(game.currentMod)) game = Dex.mod(game.parentMod);
	return game;
}

function serialize(value: unknown) {
	return JSON.stringify(value, (key, each) => typeof each === 'function' ? String(each) : each);
}

function changed(entry: AnyObject | undefined, original: AnyObject | undefined) {
	if (!entry || !original) return entry !== original;
	return [...new Set([...Object.keys(entry), ...Object.keys(original)])].some(key =>
		!UNCOMPARED.has(key) && serialize(entry[key]) !== serialize(original[key]));
}

function sortedIds(loaded: Dexes.LoadedDex, table: Dexes.Table, layers: Dexes.LoadedDex[]) {
	const data = loaded.dex.data, game = gameOf(loaded).data;
	const ids = table === 'Pokedex' ? loaded.data.species as ID[] : shownIds(loaded, table, layers);
	const custom = ids.filter(id => !game[table][id]);
	const modified = ids.filter(id => game[table][id] && (changed(data[table][id], game[table][id]) ||
		table === 'Pokedex' && changed(data.Learnsets[id], game.Learnsets[id])));
	return { ids, custom, modified };
}

function countsOf(loaded: Dexes.LoadedDex) {
	let counts = countsCache.get(loaded);
	if (counts) return counts;
	const layers = Dexes.ancestorsOf(loaded);
	counts = COUNTED.map(([table, name]) => {
		const { ids, custom, modified } = sortedIds(loaded, table, layers);
		return { name, table, total: ids.length, custom: custom.length, modified: modified.length };
	});
	countsCache.set(loaded, counts);
	return counts;
}

function dexEntries(loaded: Dexes.LoadedDex) {
	let entries = entriesCache.get(loaded);
	if (entries) return entries;
	const layers = Dexes.ancestorsOf(loaded);
	entries = { id: loaded.row.dexid, custom: {}, modified: {} };
	for (const table of ['Moves', 'Abilities', 'Items', 'Conditions'] as const) {
		const { ids, custom, modified } = sortedIds(loaded, table, layers);
		entries[table] = ids;
		entries.custom[table] = custom;
		entries.modified[table] = modified;
	}
	entries.names = Object.fromEntries(entries.Conditions.map((id: ID) => [id, loaded.dex.data.Conditions[id].name || id]));
	entries.choices = choicesOf(loaded, entries);
	entries.conditions = Object.fromEntries(entries.Conditions.map((id: ID) => {
		const condition: AnyObject = loaded.dex.data.Conditions[id];
		const kind = condition.effectType === 'Status' ? 'status' : CHOICE_FIELDS.find(field => entries.choices[field].includes(id));
		return [id, [kind || '', condition.shortDesc || condition.desc || '']];
	}));
	const shown = new Set(loaded.data.species);
	entries.Pokedex = Object.keys(loaded.dex.data.Pokedex).filter(id => shown.has(id) ||
		shown.has(toID(loaded.dex.data.Pokedex[id].baseSpecies)));
	const base = Dexes.baseOf(loaded.row).data;
	entries.originals = {};
	for (const entry of loaded.entries.values()) {
		const id = base.Pokedex[entry.speciesid] ? entry.speciesid : entry.inheritsfrom;
		entries.originals[entry.speciesid] = id && base.Pokedex[id] ?
			{ ...base.Pokedex[id], learnset: Object.keys(base.Learnsets[id]?.learnset || {}) } : null;
	}
	entries.types = Object.fromEntries([...loaded.effects.TypeChart.keys()].map(id => [id, base.TypeChart[id] ? 'edited' : 'custom']));
	entriesCache.set(loaded, entries);
	return entries;
}

const CHOICE_FIELDS = ['volatileStatus', 'sideCondition', 'slotCondition', 'pseudoWeather', 'weather', 'terrain'];

function choicesOf(loaded: Dexes.LoadedDex, entries: AnyObject) {
	const data = loaded.dex.data;
	const choices: { [field: string]: Set<ID> } = { all: new Set() };
	for (const field of CHOICE_FIELDS) choices[field] = new Set();
	const collect = (value: any) => {
		if (Array.isArray(value)) return value.forEach(collect);
		if (!value || typeof value !== 'object') return;
		for (const key in value) {
			if (CHOICE_FIELDS.includes(key) && typeof value[key] === 'string') choices[key].add(toID(value[key]));
			else if (['secondary', 'secondaries', 'self', 'fling'].includes(key)) collect(value[key]);
		}
	};
	const collectCode = (entry: AnyObject) => {
		for (const [, fn] of handlersOf(entry)) {
			for (const slot of parseHandler(fn, data)?.slots || []) {
				if (slot.condition) choices[slot.condition].add(toID(slot.value));
			}
		}
	};
	for (const table of ['Moves', 'Abilities', 'Items'] as const) {
		for (const id of entries[table]) {
			collect(data[table][id]);
			collectCode(data[table][id]);
			if (data[table][id].condition) choices.all.add(id);
		}
	}
	for (const id of entries.Conditions) {
		collectCode(data.Conditions[id]);
		if (!STATUSES.includes(id) && data.Conditions[id].effectType !== 'Status' && !data.Pokedex[id]) choices.all.add(id);
		if (data.Conditions[id].effectType === 'Weather') choices.weather.add(id);
	}
	for (const field of CHOICE_FIELDS) {
		for (const id of choices[field]) choices.all.delete(id);
	}
	const named = (id: ID) => data.Moves[id]?.name || data.Abilities[id]?.name || data.Items[id]?.name ||
		data.Conditions[id]?.name || id;
	const names: { [id: string]: string } = {};
	const result: AnyObject = { names };
	for (const field in choices) {
		result[field] = [...choices[field]].filter(id => id && (data.Conditions[id] || data.Moves[id] ||
			data.Abilities[id] || data.Items[id]));
		for (const id of result[field]) names[id] = named(id);
		result[field].sort((a: ID, b: ID) => names[a].localeCompare(names[b]));
	}
	return result;
}

function summary(loaded: Dexes.LoadedDex) {
	return {
		id: loaded.row.dexid,
		name: loaded.row.name,
		hash: loaded.data.hash,
		mod: loaded.row.mod,
		base: Dexes.baseName(loaded.row),
		parents: loaded.row.parents,
		official: loaded.row.official,
		owner: loaded.row.ownername,
		editors: [...loaded.editors.values()],
		visibility: loaded.row.visibility,
		description: loaded.row.description,
		created: loaded.row.created,
		updated: loaded.row.updated,
		species: loaded.data.species.length,
		entries: loaded.entries.size,
		size: Dexes.dataSize(loaded),
		counts: countsOf(loaded),
		formats: [...loaded.formats.keys()].map(formatid => ({ id: formatid, name: Dex.formats.get(formatid).name })),
	};
}

function spriteHTML(loaded: Dexes.LoadedDex, images: { [kind: string]: string }) {
	return Object.keys(images).filter(key => loaded.uploads.has(images[key])).map(key => {
		const image = loaded.uploads.get(images[key])!;
		const { width: boxWidth, height: boxHeight } = SPRITE_KINDS[image.kind];
		const scale = Math.min(boxWidth / image.width, boxHeight / image.height);
		const [width, height] = [Math.round(image.width * scale), Math.round(image.height * scale)];
		const title = `${key.replace(':', ' ')}${image.artist ? ` by ${image.artist}` : ''}, uploaded by ${image.uploadername} to ${image.dexname}`;
		return Utils.html`<img src="${spriteURL(image)}" alt="${key}" title="${title}" width="${width}" height="${height}" class="pixelated" />`;
	}).join(' ');
}

const UPLOAD_TIME = 5 * 60 * 1000;
const MAX_UPLOADS = 20;
const uploads = new Map<string, {
	userid: ID, dex: string, name: string, kind: string, settings: AnyObject, official: boolean, expires: number,
}>();

async function uploadURL(user: User, target: string) {
	checkEnabled(user);
	const [dexName, name, rest] = args(target, 3, `/dexes upload [dex], [pokemon, item or type], [kind], [settings JSON]`);
	const [kind, settings] = Utils.splitFirst(rest, ',').map(part => part.trim());
	const loaded = await Dexes.editable(user, dexName);
	const upload = {
		userid: user.id, dex: loaded.row.dexid, name, kind: toKind(kind), settings: settings ? parseJSON(settings) : {},
		official: loaded.row.official, expires: Date.now() + UPLOAD_TIME,
	};
	checkKind(upload.kind, upload.official);
	toSettings(upload.settings, upload.official);
	for (const [token, other] of uploads) {
		if (other.expires < Date.now()) uploads.delete(token);
	}
	if ([...uploads.values()].filter(other => other.userid === user.id).length >= MAX_UPLOADS) {
		throw new Chat.ErrorMessage(`You have too many upload links waiting. Use them or wait a few minutes.`);
	}
	const token = crypto.randomBytes(16).toString('hex');
	uploads.set(token, upload);
	return `https://${Config.routes?.client || 'play.pokemonshowdown.com'}/dexes/upload/${token}`;
}

async function forkHTML(user: User, target: string) {
	checkEnabled(user);
	const usage = `/dexes fork [your dex], [from dex], [pokemon|move|ability|item|condition|type], [name], [overwrite]`;
	const [dexName, sourceName, kind, rest] = args(target, 4, usage);
	const [name, flag] = rest.split(',').map(part => part.trim());
	const source = Dexes.getDex(sourceName);
	const { loaded, copied, warnings, missing } = await Dexes.forkEntry(
		await Dexes.editable(user, dexName), source, toAnyTable(kind), name, toID(flag) === 'overwrite'
	);
	let buf = Utils.html`Forked into ${loaded.row.name}: ${copied.join(', ')}. They follow changes to the originals until you edit them.`;
	if (warnings.length) buf += Utils.html`<br />Some changes don't carry over: ${warnings.join('; ')}`;
	if (missing.length) buf += missingHTML(source, missing);
	return buf;
}

async function forkLineHTML(user: User, target: string) {
	checkEnabled(user);
	const [dexName, sourceName, rest] = args(target, 3, `/dexes forkline [your dex], [from dex], [pokemon], [overwrite]`);
	const [name, flag] = rest.split(',').map(part => part.trim());
	const source = Dexes.getDex(sourceName);
	const { loaded, copied, added, warnings, missing } = await Dexes.forkLine(
		await Dexes.editable(user, dexName), source, name, toID(flag) === 'overwrite'
	);
	let buf = Utils.html`Forked the evolution line of ${name} into ${loaded.row.name}`;
	if (copied.length) buf += Utils.html`: ${copied.join(', ')}. They follow changes to the originals until you edit them`;
	buf += added.length ? Utils.html`. Added ${added.join(', ')}.` : `.`;
	if (warnings.length) buf += Utils.html`<br />Some changes don't carry over: ${warnings.join('; ')}`;
	if (missing.length) buf += missingHTML(source, missing);
	return buf;
}

function missingHTML(source: Dexes.LoadedDex, missing: string[]) {
	return Utils.html`<br />These are built into ${source.row.mod}'s code, so they can't be forked and won't work in your dex: ${missing.join(', ')}`;
}

async function receiveUpload(request: http.IncomingMessage, response: http.ServerResponse) {
	const reply = (status: number, body: AnyObject) => {
		response.writeHead(status, { 'Content-Type': 'application/json' });
		response.end(JSON.stringify(body));
	};
	const token = /^\/dexes\/upload\/([0-9a-f]{32})$/.exec(request.url || '')?.[1];
	const upload = token ? uploads.get(token) : undefined;
	if (request.method !== 'POST' || !upload || upload.expires < Date.now()) {
		return reply(404, { error: `That upload link is wrong or has run out. Get a new one with /dexes upload.` });
	}
	uploads.delete(token!);
	const chunks: Buffer[] = [];
	let size = 0;
	for await (const chunk of request) {
		size += chunk.length;
		if (!upload.official && size > MAX_SPRITE_BYTES) return reply(413, { error: `Sprites can be at most ${MAX_SPRITE_BYTES / 1024}KB.` });
		chunks.push(chunk);
	}
	const user = Users.get(upload.userid);
	if (!user?.connected) return reply(403, { error: `Stay logged in to the server while you upload.` });
	try {
		checkEnabled(user);
		const loaded = await Dexes.setSprite(
			user, await Dexes.editable(user, upload.dex), upload.name, upload.kind,
			Buffer.concat(chunks).toString('base64'), upload.settings
		);
		reply(200, { success: `Set the ${upload.kind} sprite of ${upload.name} in ${loaded.row.name}.` });
	} catch (e: any) {
		if (e instanceof Chat.ErrorMessage) return reply(400, { error: e.message });
		Monitor.crashlog(e, 'A sprite upload');
		reply(500, { error: `Something went wrong saving that sprite.` });
	}
}

const uploadServer = Config.dexuploadport && !Config.lazysockets ? http.createServer((request, response) => {
	void receiveUpload(request, response);
}).on('error', err => Monitor.crashlog(err, 'The dex upload server')).listen(Config.dexuploadport, '127.0.0.1') : null;

export function destroy() {
	uploadServer?.close();
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
				`${loaded.row.name} is private: it isn't listed or searchable, but anyone with its exact name can see, use and fork it.` :
				`${loaded.row.name} is public.`);
		},
		async fork(target, room, user) {
			this.sendReplyBox(await forkHTML(user, target));
		},
		async forkline(target, room, user) {
			this.sendReplyBox(await forkLineHTML(user, target));
		},
		async detach(target, room, user) {
			checkEnabled(user);
			const usage = `/dexes detach [dex], [pokemon|move|ability|item|condition|type], [name]`;
			const [dexName, kind, name] = args(target, 3, usage);
			const loaded = await Dexes.editable(user, dexName);
			const table = toAnyTable(kind);
			const entry = Dexes.entriesOf(loaded, table).get(toID(name));
			if (!entry?.trackdex) throw new Chat.ErrorMessage(`${name} in ${loaded.row.name} isn't following anything.`);
			await Dexes.detach(loaded, table, toID(name));
			this.sendReply(`${entry.data.name} in ${loaded.row.name} no longer follows changes to the original.`);
		},
		async lock(target, room, user, connection, cmd) {
			checkEnabled(user);
			const usage = `/dexes ${cmd} [dex], [pokemon|move|ability|item|condition|type], [name]`;
			const [dexName, kind, name] = args(target, 3, usage);
			const table = toAnyTable(kind);
			const loaded = await Dexes.setLocked(await owned(user, dexName), table, name, cmd === 'lock');
			const entry = Dexes.entriesOf(loaded, table).get(toID(name))!;
			this.sendReply(entry.locked ?
				`${entry.data.name} in ${loaded.row.name} is locked: other users can't fork it, and forks they already made stop following it.` :
				`${entry.data.name} in ${loaded.row.name} is unlocked: anyone can fork it.`);
		},
		unlock: 'lock',
		async editor(target, room, user, connection, cmd) {
			checkEnabled(user);
			const [dexName, name] = args(target, 2, `/dexes ${cmd} [dex], [username]`);
			const add = cmd === 'editor';
			const loaded = Dexes.getDex(dexName);
			if (add || toID(name) !== user.id) await owned(user, dexName);
			const updated = await Dexes.setEditor(loaded, name, add);
			this.sendReply(add ?
				`${name} can now edit ${updated.row.name}. Only you can delete it, change who edits it, or make it private.` :
				`${name} can no longer edit ${updated.row.name}.`);
		},
		removeeditor: 'editor',
		info(target, room, user) {
			this.runBroadcast();
			const loaded = Dexes.getDex(target);
			const dex = summary(loaded);
			let buf = Utils.html`<strong>${dex.name}</strong>${dex.official ? ' (official)' : ''}, set in ${dex.base}, owned by ${dex.owner}`;
			buf += `. ${dex.visibility === 'private' ? 'Private' : 'Public'}.`;
			if (loaded.editors.size) buf += Utils.html` Edited by ${[...loaded.editors.values()].join(', ')}.`;
			buf += `<br /><small>${dex.counts.map(count =>
				`${count.name}: ${count.total} total, ${count.custom} custom, ${count.modified} modified`).join(' &middot; ')}</small>.`;
			buf += ` Version <code>${loaded.data.hash}</code>.`;
			for (const entry of loaded.entries.values()) {
				buf += Utils.html`<br /><strong>${entry.data.name}</strong>${entry.inheritsfrom ? ` (based on ${entry.inheritsfrom})` : ''}`;
				buf += `${originHTML(entry)} ${spriteHTML(loaded, entry.sprites)}`;
			}
			if (loaded.effects.TypeChart.size) {
				buf += `<br />Types: `;
				buf += [...loaded.effects.TypeChart.values()]
					.map(entry => Utils.html`<strong>${entry.data.name}</strong>` + originHTML(entry)).join(', ');
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
			const [name, rest] = args(target, 2, `/dexes create [name], [world], [engine mod]`);
			const [on, engine] = Utils.splitFirst(rest, ',').map(part => part.trim());
			const loaded = await Dexes.createDex(user, name, on, engine || undefined);
			this.sendReply(`Made ${loaded.row.name}, with the ${loaded.data.species.length} Pokemon in ${Dexes.baseName(loaded.row)}.`);
		},
		async rename(target, room, user) {
			checkEnabled(user);
			const [dexName, name] = args(target, 2, `/dexes rename [dex], [new name]`);
			const loaded = await owned(user, dexName);
			const oldName = loaded.row.name;
			const updated = await Dexes.setName(loaded, name);
			this.sendReply(`Renamed ${oldName} to ${updated.row.name}. Its formats, battles and the dexes set in it keep working.`);
		},
		async world(target, room, user) {
			checkEnabled(user);
			const [dexName, rest] = args(target, 2, `/dexes world [dex], [world], [engine mod]`);
			const [on, engine] = Utils.splitFirst(rest, ',').map(part => part.trim());
			const { loaded, stale } = await Dexes.setBase(await owned(user, dexName), on, engine || undefined);
			this.sendReply(`${loaded.row.name} is now set in ${Dexes.baseName(loaded.row)}, with ${loaded.data.species.length} Pokemon.`);
			if (stale.length) this.sendReply(`These changes don't work in the new world and are being skipped: ${stale.join('; ')}`);
		},
		async description(target, room, user) {
			checkEnabled(user);
			const [dexName, description] = Utils.splitFirst(target, ',').map(part => part.trim());
			if (!toID(dexName)) throw new Chat.ErrorMessage(`Usage: /dexes description [dex], [text]`);
			const loaded = await Dexes.setDescription(await Dexes.editable(user, dexName), description);
			this.sendReply(loaded.row.description ? `Saved the description of ${loaded.row.name}.` : `Removed the description of ${loaded.row.name}.`);
		},
		async clear(target, room, user) {
			checkEnabled(user);
			const loaded = await Dexes.clearDex(await owned(user, target));
			this.sendReply(`Cleared ${loaded.row.name}: it has the ${loaded.data.species.length} Pokemon in ${Dexes.baseName(loaded.row)} and no custom or edited entries. Its formats are kept.`);
		},
		async official(target, room, user) {
			this.checkCan('bypassall');
			const [dexName, value] = args(target, 2, `/dexes official [dex], [on|off]`);
			const loaded = await Dexes.setOfficial(Dexes.getDex(dexName), toID(value) === 'on');
			this.sendReply(`${loaded.row.name} is ${loaded.row.official ? 'now' : 'no longer'} official.`);
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
		async bulkpokemon(target, room, user) {
			checkEnabled(user);
			const [dexName, input] = args(target, 2, `/dexes bulkpokemon [dex], [JSON list]`);
			let inputs;
			try {
				inputs = JSON.parse(input);
			} catch {}
			if (!Array.isArray(inputs)) throw new Chat.ErrorMessage(`That needs to be a JSON list, like [{"name": "Pikachu"}].`);
			const { loaded, entries } = await Dexes.putEntries(await Dexes.editable(user, dexName), inputs);
			this.sendReply(`Saved ${Chat.count(entries, 'Pokemon', 'Pokemon')} in ${loaded.row.name}.`);
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
		async type(target, room, user) {
			checkEnabled(user);
			const [dexName, input] = args(target, 2, `/dexes type [dex], [JSON]`);
			const { loaded, entry } = await Dexes.putType(await Dexes.editable(user, dexName), parseJSON(input));
			this.sendReply(`Saved the ${entry.data.name} type in ${loaded.row.name}.`);
		},
		async deletetype(target, room, user) {
			checkEnabled(user);
			const [dexName, name] = args(target, 2, `/dexes deletetype [dex], [type]`);
			const loaded = await Dexes.deleteEffect(await Dexes.editable(user, dexName), 'TypeChart', name);
			this.sendReply(`Removed ${name} from ${loaded.row.name}'s custom and edited types.`);
		},
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
			const [dexName, name, kind, rest] = args(
				target, 4, `/dexes sprite [dex], [pokemon, item or type], [kind], [base64 PNG or GIF], [settings JSON]`
			);
			const [image, settings] = Utils.splitFirst(rest, ',').map(part => part.trim());
			const loaded = await Dexes.setSprite(
				user, await Dexes.editable(user, dexName), name, toKind(kind), image, settings ? parseJSON(settings) : {}
			);
			const slot = Dexes.spriteSlot(loaded, name, toKind(kind));
			const entry = slot.table === 'Pokedex' ? Dexes.getEntry(loaded, slot.name) : Dexes.getEffect(loaded, slot.table, slot.name);
			this.sendReplyBox(Utils.html`Set the ${toKind(kind)} sprite of ${name}: ` +
				spriteHTML(loaded, { [slot.key]: entry.sprites[slot.key] }));
		},
		async upload(target, room, user) {
			const url = await uploadURL(user, target);
			this.sendReplyBox(Utils.html`Send the PNG or GIF to <code>${url}</code> in the next ${UPLOAD_TIME / 60 / 1000} minutes, ` +
				Utils.html`like <code>curl --data-binary @sprite.png ${url}</code>. The link works once.`);
		},
		async clearsprite(target, room, user) {
			checkEnabled(user);
			const [dexName, name, kind] = args(target, 3, `/dexes clearsprite [dex], [pokemon, item or type], [kind]`);
			await Dexes.setSprite(user, await Dexes.editable(user, dexName), name, toKind(kind), null);
			this.sendReply(`Removed the ${toKind(kind)} sprite of ${name}.`);
		},
		async deletesprite(target, room, user) {
			checkEnabled(user);
			const [dexName, name, kind] = args(target, 3, `/dexes deletesprite [dex], [pokemon, item or type], [kind]`);
			const loaded = Dexes.getDex(dexName);
			const slot = Dexes.spriteSlot(loaded, name, toKind(kind));
			const entry = slot.table === 'Pokedex' ? Dexes.getEntry(loaded, slot.name) : Dexes.getEffect(loaded, slot.table, slot.name);
			if (!entry.sprites[slot.key]) throw new Chat.ErrorMessage(`${name} has no ${toKind(kind)} sprite.`);
			const { image, uses } = await Dexes.deleteSprite(user, entry.sprites[slot.key]);
			this.sendReply(`Deleted ${image.uploadername}'s ${image.kind} sprite from everywhere it was used (${uses}).`);
		},
		async format(target, room, user) {
			checkEnabled(user);
			const [dexName, input] = args(target, 2, `/dexes format [dex], [JSON]`);
			const { formatid, lost } = await Dexes.putFormat(await Dexes.editable(user, dexName), parseJSON(input));
			this.sendReply(`Saved ${Dex.formats.get(formatid).name} (${formatid}). Challenge someone in it with /challenge [user], ${formatid}`);
			if (lost.length) this.sendReply(`Code in the original format doesn't carry over: ${lost.join(', ')}.`);
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
		`/dexes editor [dex], [username] - Lets another user edit a dex you own: its Pokemon, moves, abilities, items, conditions, types, sprites and formats. Only the owner can delete the dex, make it private or change its editors. Up to ${Dexes.MAX_EDITORS}. They need to have logged in with Discord.`,
		`/dexes removeeditor [dex], [username] - Stops someone editing a dex you own. Editors can also remove themselves.`,
		`/dexes visibility [dex], [public|private] - Private dexes aren't listed or searchable, but anyone with the exact name can still see, challenge in and fork them.`,
		`/dexes fork [your dex], [from dex], [pokemon|move|ability|item|condition|type], [name], [overwrite] - Copies something from another dex, with the custom things it needs, including ones from that dex's world. Things built into the other world's engine mod can't be copied. Forks follow changes to the original until you edit them. "overwrite" replaces your own versions.`,
		`/dexes forkline [your dex], [from dex], [pokemon], [overwrite] - Forks a Pokemon's whole evolution line, like /dexes fork, and adds the line's unedited Pokemon to your dex.`,
		`/dexes detach [dex], [pokemon|move|ability|item|condition|type], [name] - Stops a fork following the original.`,
		`/dexes lock [dex], [pokemon|move|ability|item|condition|type], [name] - Stops other users forking something you made. Anything forked from someone else can't be locked, even after edits. Also: unlock.`,
		`/dexes create [name], [world], [engine mod] - Makes a dex set in a world. A world is a mod, like gen9, with every Pokemon in it, or another dex. A dex set in another keeps only its own changes, so changes to the other dex reach it, and starts with copies of its formats. Locked things in the other dex can't be edited or copied in it.`,
		`A world can join several dexes, with their names joined by +, like "Insurgence + Uranium". Their Pokemon are all in it; where they change the same thing, the first one listed wins, except that learnsets are combined, evolutions added together, and abilities and type matchups fill in what earlier ones leave empty. The engine mod runs the battles, and is the first dex's mod unless you name one, like championsmariomon, to play a dex with another mod's mechanics.`,
		`/dexes rename [dex], [new name] - Renames a dex you own. Its formats, battles, replays and the dexes set in it keep working.`,
		`/dexes world [dex], [world], [engine mod] - Changes the world of a dex you own, like /dexes create. Its Pokemon go back to the new world's, and custom or edited things that don't work on it are skipped until fixed or cleared.`,
		`/dexes description [dex], [text] - Sets the description shown on a dex's page, up to ${Dexes.MAX_DESCRIPTION} characters. Leave the text out to remove it.`,
		`/dexes clear [dex] - Deletes every custom or edited entry in a dex you own and puts back its world's Pokemon. Its formats are kept.`,
		`/dexes official [dex], [on|off] - Official dexes, like a fangame's, have no limits: on their size, formats, editors, description or sprites. Requires: ~`,
		`/dexes delete [dex] - Deletes a dex you own.`,
		`/dexes add [dex], [pokemon], ... - Puts Pokemon from a dex's world into it, with their formes.`,
		`/dexes remove [dex], [pokemon], ... - Takes Pokemon out of a dex, with their formes.`,
		`/dexes pokemon [dex], [JSON] - Makes or edits a Pokemon. Using an existing Pokemon's name edits it for this dex. Fields: name, inheritsFrom, types, baseStats, abilities, eggGroups, weightkg, heightm, color, gender, genderRatio, prevo, evos, evoType, evoLevel, evoItem, evoMove, evoCondition, baseSpecies, forme, requiredItem, requiredAbility, requiredMove, battleOnly, changesFrom, sameNumberAs, tier, doublesTier, natDexTier, tags, maxHP, learnset. null clears a field. A forme's name is its baseSpecies, a dash and its forme, like Venusaur-Delta, unless forme is set; formes share their base's dex number, and can chain, like Venusaur-Delta-Mega. sameNumberAs shares another Pokemon's dex number without being its forme, so Species Clause counts them as one. A Mega gets its requiredItem from the Mega Stone that points to it.`,
		`/dexes bulkpokemon [dex], [JSON list] - Makes or edits many Pokemon at once, each like /dexes pokemon. Useful for learnsets.`,
		`/dexes deletepokemon [dex], [pokemon] - Deletes a custom Pokemon, or undoes edits to an existing one.`,
		`/dexes move [dex], [JSON] - Makes or edits a move. Using an existing move's name edits it for this dex; "inheritsFrom" copies another move, code and all. Set any attribute, like "basePower" or "secondary"; null clears it. "slots" changes values in the code, like {"onHit:0": "Fire"}, numbered as in /dexes code. "events" moves a stat handler to another stat, like {"onModifySpe": "atk"}.`,
		`/dexes ability [dex], [JSON] - Makes or edits an ability, like /dexes move.`,
		`/dexes item [dex], [JSON] - Makes or edits an item, like /dexes move. "spriteFrom" uses another item's icon.`,
		`/dexes condition [dex], [JSON] - Makes or edits a condition, like a status or weather, like /dexes move.`,
		`/dexes type [dex], [JSON] - Makes or edits a type. "damageTaken" sets what it takes from other types, and "attacks" what it deals to them, as multipliers, like {"name": "Cosmic", "damageTaken": {"Dark": 2}, "attacks": {"Steel": 0.5}}. null undoes one. damageTaken can also make it immune (0) to things like sandstorm or par. If both sides set the same matchup, damageTaken wins. "color" (like "#7a5cc9") and "label" (up to 6 characters, like "COSMIC") set how a type's icon looks. "removed": true takes a type from the main games out of this dex, making its matchups neutral; null brings it back.`,
		`/dexes deletemove [dex], [name] - Deletes a custom move, or undoes edits to an existing one. Also: deleteability, deleteitem, deletecondition, deletetype.`,
		`/dexes code [dex], [move|ability|item|condition], [name] - Shows the values in its code you can change, and what a copy loses.`,
		`/dexes sprite [dex], [pokemon, item or type], [kind], [base64 PNG or GIF], [settings JSON] - Sets a sprite, shown scaled to fit. Kinds: front, back, front-shiny, back-shiny (made at 96x96, up to 192x192), icon (40x30, up to 64x64), item (24x24, up to 64x64, items only), type (32x14, up to 64x64, types only, used instead of the type's drawn icon). A cosmetic forme, like Gastrodon-East, gets its own sprites. Official dexes have no limits, and can also add -f for a female sprite, like front-shiny-f or icon-f, or start with afd- for an April Fools' sprite, like afd-front. Sprites you upload count toward your ${Dexes.megabytes(Dexes.MAX_STORAGE_BYTES)} of storage while any dex uses them, unless you upload them to an official dex.`,
		`Optional settings: {"artist": "who drew it"}. Official dexes can also set "y": -16 (moves it up or down) and "gen": 3 (placed like that generation's sprites). To change them, set the sprite again.`,
		`/dexes upload [dex], [pokemon, item or type], [kind], [settings JSON] - Gives you a link to send a sprite to, for sprites too big for /dexes sprite, up to ${MAX_SPRITE_BYTES / 1024}KB. It works once, for ${UPLOAD_TIME / 60 / 1000} minutes, while you stay logged in.`,
		`/dexes clearsprite [dex], [pokemon, item or type], [kind] - Stops using a sprite here.`,
		`/dexes deletesprite [dex], [pokemon, item or type], [kind] - Deletes a sprite you uploaded, everywhere it was forked to.`,
		`/dexes format [dex], [JSON] - Makes or edits a format. Fields: name, from, gameType, ruleset, banlist, unbanlist, restricted, bestOfDefault, teraPreviewDefault, debug. "debug" makes a Custom Game: debug messages, and stats that can go past 65535. "from" copies the rules and bans of a format on this server, like "gen9ou", before the other fields apply.`,
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
	async dexstorage(target, user) {
		const account = await viewer(user);
		return { used: account ? Dexes.storageUsed(account) : 0, limit: Dexes.MAX_STORAGE_BYTES, data: Dexes.MAX_DATA_BYTES };
	},
	dex(target) {
		const loaded = Dexes.findDex(target);
		if (!loaded) return null;
		return { ...summary(loaded), ...Dexes.clientData(loaded), parentids: loaded.row.parents };
	},
	dexentries(target) {
		const loaded = Dexes.findDex(target);
		if (!loaded) return null;
		return dexEntries(loaded);
	},
	async dexupload(target, user) {
		return { url: await uploadURL(user, target) };
	},
	async dexfork(target, user) {
		return { html: await forkHTML(user, target) };
	},
	async dexforkline(target, user) {
		return { html: await forkLineHTML(user, target) };
	},
	async dexcreate(target, user) {
		checkEnabled(user);
		const input = parseJSON(target);
		let loaded = await Dexes.createDex(user, `${input.name || ''}`, `${input.base || 'gen9'}`);
		if (input.visibility === 'private') loaded = await Dexes.setVisibility(loaded, 'private');
		return { id: loaded.row.dexid };
	},
	async dexedit(target, user) {
		checkEnabled(user);
		const [dexid, input] = Utils.splitFirst(target, ',').map(part => part.trim());
		const edit = parseJSON(input);
		let loaded = await Dexes.editable(user, dexid);
		const owner = ['name', 'visibility', 'base', 'clear', 'delete'].some(key => edit[key] !== undefined) ||
			(edit.editor && (edit.add || toID(edit.editor) !== user.id));
		if (owner) loaded = await owned(user, dexid);
		if (edit.delete) {
			await Dexes.deleteDex(loaded);
			return { id: null };
		}
		if (edit.name !== undefined && edit.name !== loaded.row.name) loaded = await Dexes.setName(loaded, `${edit.name}`);
		if (edit.visibility !== undefined && edit.visibility !== loaded.row.visibility) {
			loaded = await Dexes.setVisibility(loaded, `${edit.visibility}`);
		}
		if (edit.description !== undefined) loaded = await Dexes.setDescription(loaded, `${edit.description}`);
		if (edit.editor) loaded = await Dexes.setEditor(loaded, `${edit.editor}`, !!edit.add);
		if (edit.clear) loaded = await Dexes.clearDex(loaded);
		let stale: string[] = [];
		if (edit.base !== undefined) ({ loaded, stale } = await Dexes.setBase(loaded, `${edit.base}`));
		if (edit.pokemon) ({ loaded } = await Dexes.putEntry(loaded, edit.pokemon));
		if (edit.tiers) loaded = await Dexes.setTiers(loaded, edit.tiers);
		if (edit.deletepokemon) loaded = await Dexes.deleteEntry(loaded, `${edit.deletepokemon}`);
		for (const kind in EFFECT_TABLES) {
			if (edit[kind]) ({ loaded } = await Dexes.putEffect(loaded, EFFECT_TABLES[kind], edit[kind]));
			if (edit[`delete${kind}`]) loaded = await Dexes.deleteEffect(loaded, EFFECT_TABLES[kind], `${edit[`delete${kind}`]}`);
		}
		if (edit.type) ({ loaded } = await Dexes.putType(loaded, edit.type));
		if (edit.deletetype) loaded = await Dexes.deleteEffect(loaded, 'TypeChart', `${edit.deletetype}`);
		if (edit.sprite) {
			const { name, kind, image, settings } = edit.sprite;
			loaded = await Dexes.setSprite(user, loaded, `${name}`, toKind(`${kind}`), image ? `${image}` : null, settings || {});
		}
		let formatid;
		if (edit.format) ({ loaded, formatid } = await Dexes.putFormat(loaded, edit.format));
		if (edit.deleteformat) loaded = await Dexes.deleteFormat(loaded, `${edit.deleteformat}`);
		return { id: loaded.row.dexid, ...(stale.length ? { stale } : {}), ...(formatid ? { formatid } : {}) };
	},
	async dexformat(target, user) {
		const [formatid, draft] = Utils.splitFirst(target, ',').map(part => part.trim());
		if (!draft) return Dexes.formatDetails(formatid);
		const details = Dexes.formatDetails(formatid);
		if (details) await Dexes.editable(user, details.dexid);
		return Dexes.formatDetails(formatid, parseJSON(draft));
	},
	dexeffect(target) {
		const [dexid, kind, name] = Utils.splitFirst(target, ',', 2).map(part => part.trim());
		const loaded = Dexes.findDex(dexid);
		const table = EFFECT_TABLES[toID(kind)];
		if (!loaded || !table) return null;
		return { dexid: loaded.row.dexid, ...Dexes.effectEditor(loaded, table, name) };
	},
};

for (const [name, handler] of Object.entries(crqHandlers)) {
	if (name === 'dexes') continue;
	crqHandlers[name] = async function (target, user, trustable) {
		let data;
		try {
			data = await handler.call(this, target, user, trustable);
		} catch (e: any) {
			if (e instanceof Chat.ErrorMessage) return { query: target, error: e.message };
			Monitor.crashlog(e, `A /crq ${name} request`);
			return { query: target, error: `Something went wrong. Try again.` };
		}
		return data && typeof data === 'object' ? { ...data, query: target } : { query: target, missing: true };
	};
}

export const handlers: Chat.Handlers = {
	onBattleCreate(battle) {
		void Dexes.saveSnapshot(battle.format).catch(err => Monitor.crashlog(err, 'A dex snapshot'));
	},
};
