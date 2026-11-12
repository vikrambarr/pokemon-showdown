import * as crypto from 'crypto';
import * as http from 'http';
import { Utils } from '../../lib';
import * as Dexes from '../dexes';
import { engineChecks } from '../dexes/effects';
import type { EffectTable } from '../../sim/dex-custom';
import { STATUSES, handlersOf, parseHandler } from '../../sim/dex-handlers';
import { MAX_SPRITE_BYTES, checkKind, toKind, toSettings } from '../dexes/sprites';

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

const toList = (value: unknown) => (Array.isArray(value) ? value : [value]).map(String);

function args(target: string, count: number, usage: string) {
	const parts = Utils.splitFirst(target, ',', count - 1).map(part => part.trim());
	if (parts.some(part => !part)) throw new Chat.ErrorMessage(`Usage: ${usage}`);
	return parts;
}

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

const COUNTED: [Dexes.Table, string][] = [
	['Pokedex', 'Pok&eacute;mon'], ...Object.values(EFFECT_TABLES).map(table => [table, table] as [EffectTable, string]), ['TypeChart', 'Types'],
];

const GETTERS = { Moves: 'moves', Abilities: 'abilities', Items: 'items', Conditions: 'conditions', TypeChart: 'types' } as const;

function shownIds(loaded: Dexes.LoadedDex, table: keyof typeof GETTERS, layers = Dexes.ancestorsOf(loaded)) {
	const removed = new Set(loaded.data.lists?.[table as Dexes.ListTable]?.removed || []);
	return Object.keys(loaded.dex.data[table]).filter(id => !removed.has(id) &&
		(!(loaded.dex[GETTERS[table]].get(id) as AnyObject).isNonstandard || layers.some(layer => Dexes.entriesOf(layer, table).has(id as ID))));
}

const ALWAYS_NEEDED = ['brn', 'par', 'slp', 'frz', 'psn', 'tox', 'confusion', 'flinch', 'trapped', 'partiallytrapped'];

function neededConditions(loaded: Dexes.LoadedDex, entries: AnyObject) {
	const data = loaded.dex.data;
	const conditions = new Set<string>(entries.Conditions);
	const needed = new Set<string>([...ALWAYS_NEEDED, ...entries.Conditions.filter((id: ID) => engineChecks(id).length)]
		.filter(id => conditions.has(id)));
	for (const id of loaded.data.species) {
		if (conditions.has(id)) needed.add(id);
	}
	const queue: AnyObject[] = [data.Scripts, ...(['Moves', 'Abilities', 'Items'] as const).flatMap(table => entries[table].map((id: ID) => data[table][id]))];
	for (const id of needed) queue.push(data.Conditions[id]);
	for (const entry of queue) {
		for (const match of serialize(entry).matchAll(/(['"`])([^'"`\n]{1,40})\1/g)) {
			const id = toID(match[2]);
			if (!conditions.has(id) || needed.has(id)) continue;
			needed.add(id);
			queue.push(data.Conditions[id]);
		}
	}
	return entries.Conditions.filter((id: ID) => needed.has(id));
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
	entries.world = Dexes.worldSpecies(loaded);
	entries.needed = neededConditions(loaded, entries);
	entries.types = Object.fromEntries([...loaded.effects.TypeChart.keys()].map(id => [id, base.TypeChart[id] ? 'edited' : 'custom']));
	entries.own = Object.fromEntries((['Moves', 'Abilities', 'Items', 'Conditions'] as const).map(table => [table,
		Object.fromEntries([...loaded.effects[table].keys()].map(id => [id, base[table][id] ? 'edited' : 'custom'])),
	]));
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
		counts: countsOf(loaded),
		formats: [...loaded.formats.keys()].map(formatid => ({ id: formatid, name: Dex.formats.get(formatid).name })),
	};
}

const UPLOAD_TIME = 5 * 60 * 1000;
const MAX_UPLOADS = 20;
const uploads = new Map<string, {
	userid: ID, dex: string, name: string, kind: string, settings: AnyObject, official: boolean, expires: number,
}>();

async function uploadURL(user: User, target: string) {
	checkEnabled(user);
	const [dexName, name, rest] = args(target, 3, `/crq dexupload [dex], [pokemon, item or type], [kind], [settings JSON]`);
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
	const usage = `/crq dexfork [your dex], [from dex], [pokemon|move|ability|item|condition|type], [name], [overwrite]`;
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
	const [dexName, sourceName, rest] = args(target, 3, `/crq dexforkline [your dex], [from dex], [pokemon], [overwrite]`);
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
		return reply(404, { error: `That upload link is wrong or has run out. Try again.` });
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
		async official(target, room, user) {
			this.checkCan('bypassall');
			const [dexName, value] = args(target, 2, `/dexes official [dex], [on|off]`);
			const loaded = await Dexes.setOfficial(Dexes.getDex(dexName), toID(value) === 'on');
			this.sendReply(`${loaded.row.name} is ${loaded.row.official ? 'now' : 'no longer'} official.`);
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
		async rebuildfiles(target, room, user) {
			this.checkCan('bypassall');
			const { snapshots, written, sprites } = await Dexes.rebuildFiles();
			this.sendReply(
				`Rewrote ${written} of ${snapshots} dex snapshots and ${sprites.written} of ${sprites.total} sprites; the rest were already there.`
			);
		},
	},
	dexeshelp: [
		`/dexes official [dex], [on|off] - Official dexes, like a fangame's, have no limits: on their size, formats, editors, description or sprites. Requires: ~`,
		`/dexes deletesprite [dex], [pokemon, item or type], [kind] - Deletes a sprite you uploaded, everywhere it was forked to.`,
		`/dexes rebuildfiles - Rewrites missing snapshot and sprite files from the database. Requires: ~`,
	],
};

const sentSummaries = new WeakMap<Connection, Map<ID, string>>();

export const crqHandlers: { [k: string]: Chat.CRQHandler } = {
	async dexes(target, user) {
		const account = await viewer(user);
		const list = toID(target) ? Dexes.search(target, account) :
			[...Dexes.dexes.values()].filter(loaded => Dexes.listed(loaded, account));
		const sent = sentSummaries.get(this.connection);
		const digests = new Map<ID, string>();
		sentSummaries.set(this.connection, digests);
		return list.map(loaded => {
			const data = summary(loaded);
			const digest = crypto.createHash('sha1').update(JSON.stringify(data)).digest('base64');
			digests.set(data.id, digest);
			return sent?.get(data.id) === digest ? { id: data.id } : data;
		});
	},
	async dexstorage(target, user) {
		const account = await viewer(user);
		return {
			data: account ? Dexes.dataUsed(account) : 0, dataLimit: Dexes.MAX_DATA_STORAGE,
			sprites: account ? Dexes.spritesUsed(account) : 0, spriteLimit: Dexes.MAX_SPRITE_STORAGE,
		};
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
		const skipped: string[] = [];
		if (edit.addpokemon) {
			const added = await Dexes.addPokemon(loaded, `${edit.addpokemon.from || ''}`, toList(edit.addpokemon.names));
			loaded = added.loaded;
			skipped.push(...added.skipped);
		}
		if (edit.pokemon) ({ loaded } = await Dexes.putEntry(loaded, edit.pokemon));
		if (edit.tiers) loaded = await Dexes.setTiers(loaded, edit.tiers);
		if (edit.deletepokemon) loaded = await Dexes.deletePokemon(loaded, toList(edit.deletepokemon));
		for (const name of edit.resetpokemon ? toList(edit.resetpokemon) : []) loaded = await Dexes.deleteEntry(loaded, name);
		for (const kind in EFFECT_TABLES) {
			const table = EFFECT_TABLES[kind];
			if (edit[kind]) ({ loaded } = await Dexes.putEffect(loaded, table, edit[kind]));
			const add = edit[`add${kind}`];
			if (add) {
				if (!Dexes.LIST_TABLES.includes(table as Dexes.ListTable)) throw new Chat.ErrorMessage(`Conditions come with what needs them.`);
				const added = await Dexes.addEffects(loaded, table as Dexes.ListTable, `${add.from || ''}`, toList(add.names));
				loaded = added.loaded;
				skipped.push(...added.skipped);
			}
			if (edit[`delete${kind}`]) loaded = await Dexes.deleteEffects(loaded, table, toList(edit[`delete${kind}`]));
			for (const name of edit[`reset${kind}`] ? toList(edit[`reset${kind}`]) : []) loaded = await Dexes.deleteEffect(loaded, table, name);
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
		return {
			id: loaded.row.dexid, ...(stale.length ? { stale } : {}), ...(formatid ? { formatid } : {}), ...(skipped.length ? { skipped } : {}),
		};
	},
	async dexformat(target, user) {
		const [formatid, draft] = Utils.splitFirst(target, ',').map(part => part.trim());
		if (!draft) return Dexes.formatDetails(formatid);
		const details = Dexes.formatDetails(formatid);
		if (details) await Dexes.editable(user, details.dexid);
		return Dexes.formatDetails(formatid, parseJSON(draft));
	},
	dexrules(target) {
		return Dexes.formatRules(target);
	},
	dexsource(target) {
		const [dexid, from, kind] = Utils.splitFirst(target, ',', 2).map(part => part.trim());
		const loaded = Dexes.findDex(dexid);
		if (!loaded) return null;
		const table = toID(kind) && toID(kind) !== 'pokemon' ? toTable(kind) : 'Pokedex';
		if (table !== 'Pokedex' && !Dexes.LIST_TABLES.includes(table as Dexes.ListTable)) return null;
		return { species: Dexes.sourceIds(loaded, table as 'Pokedex' | Dexes.ListTable, from) };
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
