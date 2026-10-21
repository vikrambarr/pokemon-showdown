import { FS } from '../../lib';
import type { ModdedDex } from '../../sim/dex';
import { baseEffect, effectSlots, type EffectEdit, type EffectTable } from '../../sim/dex-custom';
import { classify, checkSlot, handlersOf, parseHandler, type Slot } from '../../sim/dex-handlers';
import { validateName } from './species';

export interface SlotEdit {
	from: string | number;
	to: string | number;
	nth: number;
}

export interface EffectEntry {
	effecttable: EffectTable;
	effectid: ID;
	num: number;
	inheritsfrom: ID | null;
	data: AnyObject;
	slots: { [path: string]: { [index: string]: SlotEdit } };
	sprites: { [kind: string]: string };
}

export const EFFECT_NAMES: { [table in EffectTable]: string } = {
	Moves: 'move', Abilities: 'ability', Items: 'item', Conditions: 'condition',
};
export const EFFECT_PLURALS: { [table in EffectTable]: string } = {
	Moves: 'Moves', Abilities: 'Abilities', Items: 'Items', Conditions: 'Conditions',
};

type Check = (value: unknown, field: string, data: AnyObject, old: unknown) => unknown;
type Fields = { [field: string]: Check };

const CONTROL = ['name', 'inheritsFrom', 'slots', 'replace'];
const STAT_NAMES: { [stat: string]: string } = {
	hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed',
	accuracy: 'accuracy', evasion: 'evasiveness',
};
const UNSAFE = ['__proto__', 'constructor', 'prototype'];
const MAX_NUMBER = 1e6;
const REQUIRED: { [table in EffectTable]: string[] } = {
	Moves: ['accuracy', 'basePower', 'category', 'flags', 'pp', 'priority', 'target', 'type'],
	Abilities: ['flags'],
	Items: [],
	Conditions: [],
};
const BLANK: { [table in EffectTable]: AnyObject } = {
	Moves: {
		accuracy: 100, basePower: 0, category: 'Status', pp: 10, priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1 }, target: 'normal', type: 'Normal',
	},
	Abilities: { rating: 0, flags: {} },
	Items: { spritenum: 0 },
	Conditions: {},
};

const isObject = (value: unknown): value is AnyObject => !!value && typeof value === 'object' && !Array.isArray(value);
const used = (table: EffectTable, get: (entry: AnyObject) => unknown) => [...new Set(
	Object.values(Dex.data[table] as AnyObject).flatMap(entry => {
		const value = get(entry);
		return Array.isArray(value) ? value : value === undefined ? [] : [value];
	})
)] as string[];

function fail(field: string, message: string): never {
	throw new Chat.ErrorMessage(`"${field}": ${message}`);
}

const bool: Check = (value, field) => {
	if (typeof value !== 'boolean') fail(field, `must be true or false.`);
	return value;
};
const int = (min: number, max: number): Check => (value, field) => {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
		fail(field, `must be a whole number from ${min} to ${max}.`);
	}
	return value;
};
const num = (min: number, max: number): Check => (value, field) => {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
		fail(field, `must be a number from ${min} to ${max}.`);
	}
	return value;
};
const oneOf = (...options: unknown[]): Check => (value, field) => {
	if (!options.includes(value)) {
		fail(field, `must be one of: ${options.map(option => JSON.stringify(option)).join(', ')}.`);
	}
	return value;
};
const text = (max: number): Check => (value, field) => {
	if (typeof value !== 'string' || !value.trim() || value.length > max) {
		fail(field, `must be text, at most ${max} characters.`);
	}
	return value.trim();
};
const slot = (kind: Slot['kind'], extra: Partial<Slot> = {}): Check => (value, field, data) => {
	try {
		return checkSlot({ start: 0, end: 0, kind, value: '', ...extra }, value, data);
	} catch (e: any) {
		fail(field, e.message);
	}
};
const either = (...checks: Check[]): Check => (value, field, data, old) => {
	let error;
	for (const check of checks) {
		try {
			return check(value, field, data, old);
		} catch (e) {
			error = e;
		}
	}
	throw error;
};
const list = (check: Check, max: number): Check => (value, field, data) => {
	if (!Array.isArray(value) || !value.length || value.length > max) fail(field, `must be a list of 1 to ${max} entries.`);
	return value.map((entry, i) => check(entry, `${field}.${i}`, data, undefined));
};
const record = (key: Check, check: Check): Check => (value, field, data) => {
	if (!isObject(value)) fail(field, `must be an object.`);
	const result: AnyObject = {};
	for (const name of Object.keys(value)) {
		const id = key(name, `${field} key`, data, undefined) as string;
		result[id] = value[name] === null ? null : check(value[name], `${field}.${id}`, data, undefined);
	}
	return result;
};
const object = (fields: Fields): Check => (value, field, data, old) => {
	if (!isObject(value)) fail(field, `must be an object.`);
	return checkFields(value, isObject(old) ? old : undefined, fields, `${field}.`, data);
};

const type = slot('type');
const category = slot('category');
const stat = slot('stat', { value: 'atk' });
const status = slot('status');
const condition = slot('ref', { tables: ['Conditions', 'Moves', 'Abilities', 'Items'], form: 'id' });
const move = slot('ref', { tables: ['Moves'], form: 'name' });
const species = slot('ref', { tables: ['Pokedex'], form: 'name' });
const boosts = record(slot('stat', { value: 'atk', key: true }), int(-6, 6));
const fraction = list(int(1, 100), 2);
const desc = { desc: text(1000), shortDesc: text(300) };
const nonstandard = oneOf(...used('Moves', entry => entry.isNonstandard), 'Custom');
const secondaryFields: Fields = {
	chance: int(1, 100), boosts, status, volatileStatus: condition, sideCondition: condition, pseudoWeather: condition,
};
const secondary = object({ ...secondaryFields, self: object(secondaryFields) });
const MOVE_BOOLEANS = [
	'breaksProtect', 'callsMove', 'forceSwitch', 'hasCrashDamage', 'hasSheerForceBoost', 'ignoreAbility', 'ignoreDefensive',
	'ignoreEvasion', 'mindBlownRecoil', 'multiaccuracy', 'noPPBoosts', 'sleepUsable', 'smartTarget', 'stallingMove',
	'stealsBoosts', 'struggleRecoil', 'thawsTarget', 'tracksTarget', 'willCrit',
];
const ITEM_BOOLEANS = ['ignoreKlutz', 'isBerry', 'isChoice', 'isGem', 'isPokeball', 'isPrimalOrb'];

const FIELDS: { [table in EffectTable]: Fields } = {
	Moves: {
		accuracy: either(oneOf(true), int(1, 100)), basePower: int(0, 1000), category, pp: int(1, 64), priority: int(-7, 7),
		type, target: oneOf(...used('Moves', entry => entry.target)), critRatio: int(0, 6),
		flags: record(oneOf(...used('Moves', entry => Object.keys(entry.flags))), oneOf(1)),
		drain: fraction, recoil: fraction, heal: fraction, secondary, secondaries: list(secondary, 5), self: secondary,
		boosts, selfBoost: object({ boosts }), status, volatileStatus: condition, sideCondition: condition,
		slotCondition: condition, pseudoWeather: condition, weather: condition, terrain: condition,
		multihit: either(int(2, 10), list(int(1, 10), 2)), selfSwitch: either(bool, oneOf('copyvolatile', 'shedtail')),
		selfdestruct: oneOf('always', 'ifHit'), ignoreImmunity: either(bool, record(type, bool)),
		overrideOffensiveStat: stat, overrideDefensiveStat: stat,
		overrideOffensivePokemon: oneOf('target', 'source'), overrideDefensivePokemon: oneOf('target', 'source'),
		damage: either(int(1, 1000), oneOf('level')), ohko: either(bool, type),
		zMove: object({
			basePower: int(0, 1000), effect: oneOf(...used('Moves', entry => entry.zMove?.effect)), boost: boosts,
		}),
		maxMove: object({ basePower: int(0, 1000) }),
		contestType: oneOf(...used('Moves', entry => entry.contestType)), isNonstandard: nonstandard,
		...Object.fromEntries(MOVE_BOOLEANS.map(field => [field, bool])), ...desc,
	},
	Abilities: {
		rating: num(-1, 5), suppressWeather: bool, isNonstandard: nonstandard, ...desc,
		flags: record(oneOf(...used('Abilities', entry => Object.keys(entry.flags || {}))), oneOf(1)),
	},
	Items: {
		spritenum: int(0, 9999), fling: object({ basePower: int(0, 250), status, volatileStatus: condition }),
		naturalGift: object({ basePower: int(0, 250), type }), itemUser: list(species, 30), forcedForme: species,
		megaStone: record(species, species), boosts, zMove: either(oneOf(true), move), zMoveFrom: move, zMoveType: type,
		onPlate: type, onMemory: type, onDrive: type, isNonstandard: nonstandard,
		...Object.fromEntries(ITEM_BOOLEANS.map(field => [field, bool])), ...desc,
	},
	Conditions: {
		duration: int(1, 100), counterMax: int(1, 10000), noCopy: bool, affectsFainted: bool, ...desc,
	},
};

function same(old: unknown, value: unknown, field: string, data: AnyObject) {
	if (typeof old === 'boolean') return bool(value, field, data, old);
	if (typeof old === 'number') return num(-MAX_NUMBER, MAX_NUMBER)(value, field, data, old);
	const kind = typeof old === 'string' ? classify(old, field.split('.').pop()!, Dex.data) : null;
	if (!kind) fail(field, `isn't something you can set.`);
	return slot(kind.kind!, { ...kind, value: old as string })(value, field, data, old);
}

function checkFields(
	input: AnyObject, base: AnyObject | undefined, fields: Fields | null, path: string, data: AnyObject
) {
	const result: AnyObject = {};
	for (const key of Object.keys(input)) {
		const field = path + key;
		const value = input[key];
		const old = base?.[key];
		if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(key) || UNSAFE.includes(key)) fail(field, `isn't something you can set.`);
		if (typeof old === 'function') fail(field, `is code; change the values inside it with "slots" or "replace".`);
		if (value === null) {
			result[key] = null;
		} else if (fields?.[key]) {
			result[key] = fields[key](value, field, data, old);
		} else if (isObject(old) && isObject(value)) {
			result[key] = checkFields(value, old, null, `${field}.`, data);
		} else if (old !== undefined && !isObject(old) && !Array.isArray(old)) {
			result[key] = same(old, value, field, data);
		} else {
			fail(field, `isn't something you can set.`);
		}
	}
	return result;
}

function combine(old: AnyObject, input: AnyObject) {
	const result = { ...old };
	for (const key of Object.keys(input)) {
		result[key] = isObject(old[key]) && isObject(input[key]) ? combine(old[key], input[key]) : input[key];
	}
	return result;
}

export function lookupTables(dex: ModdedDex, Pokedex: AnyObject, effects: { [table: string]: Map<ID, EffectEntry> }) {
	const data: AnyObject = { ...dex.data, Pokedex: { ...dex.data.Pokedex, ...Pokedex } };
	for (const table in effects) {
		data[table] = { ...dex.data[table as EffectTable] };
		for (const [id, entry] of effects[table]) data[table][id] = { name: entry.data.name };
	}
	return data;
}

function getPath(effect: AnyObject | undefined, path: string) {
	for (const key of path.split('.')) effect = effect?.[key];
	return effect as unknown;
}

function sameValue(a: unknown, b: unknown) {
	return typeof a === 'string' && typeof b === 'string' ? toID(a) === toID(b) : a === b;
}

export function editOf(entry: EffectEntry, slots: EffectEdit['slots'] = {}): EffectEdit {
	return { ...(entry.inheritsfrom ? { inherit: entry.inheritsfrom } : {}), data: entry.data, slots };
}

export function resolveEdits(dex: ModdedDex, entry: EffectEntry, data: AnyObject, stale: string[]) {
	const { base } = baseEffect(dex, entry.effecttable, entry.effectid, editOf(entry));
	const slots: NonNullable<EffectEdit['slots']> = {};
	for (const path in entry.slots) {
		const fn = getPath(base, path);
		const handler = typeof fn === 'function' ? parseHandler(fn, dex.data) : null;
		for (const index in entry.slots[path]) {
			const { from, to, nth } = entry.slots[path][index];
			let found = handler?.slots[Number(index)]?.value === from ? Number(index) : -1;
			if (found < 0 && handler) {
				found = handler.slots.map((other, i) => other.value === from ? i : -1).filter(i => i >= 0)[nth] ?? -1;
			}
			try {
				if (found < 0) throw new Error(`the code changed`);
				checkSlot(handler!.slots[found], to, data);
				(slots[path] ||= {})[found] = [from, to];
			} catch (e: any) {
				stale.push(`${entry.data.name}: ${path} ${JSON.stringify(from)} to ${JSON.stringify(to)} (${e.message})`);
			}
		}
	}
	return editOf(entry, slots);
}

export function validateEffect(
	input: AnyObject, table: EffectTable, dex: ModdedDex, entries: Map<ID, EffectEntry>, data: AnyObject
) {
	const what = EFFECT_NAMES[table];
	const name = validateName(input.name, what);
	const effectid = toID(name);
	if (UNSAFE.includes(effectid)) throw new Chat.ErrorMessage(`"${name}" can't be used as a name.`);
	const official = dex.data[table][effectid];
	const old = entries.get(effectid);

	let inheritsfrom = old ? old.inheritsfrom : null;
	if (input.inheritsFrom !== undefined) {
		if (official) throw new Chat.ErrorMessage(`${name} already exists, so it can't inherit from anything.`);
		const baseid = input.inheritsFrom === null ? null : toID(input.inheritsFrom);
		if (baseid !== null && !dex.data[table][baseid]) {
			throw new Chat.ErrorMessage(`"${input.inheritsFrom}" isn't a ${what} in ${dex.currentMod}.`);
		}
		inheritsfrom = baseid;
	}
	const base = official || (inheritsfrom ? dex.data[table][inheritsfrom] : undefined);
	const fields: AnyObject = {};
	for (const key in input) {
		if (!CONTROL.includes(key)) fields[key] = input[key];
	}
	for (const field of REQUIRED[table]) {
		if (fields[field] === null) throw new Chat.ErrorMessage(`"${field}" can't be removed.`);
	}
	const keep = old?.inheritsfrom === inheritsfrom;
	const start = keep ? old!.data : !base ? BLANK[table] : {};
	const entry: EffectEntry = {
		effecttable: table, effectid, num: old?.num || 0, inheritsfrom,
		data: { ...combine(start, checkFields(fields, base, FIELDS[table], '', data)), name: official ? official.name : name },
		slots: keep ? JSON.parse(JSON.stringify(old!.slots)) : {}, sprites: old?.sprites || {},
	};

	const catalogue = effectSlots(dex, table, effectid, editOf(entry), entry.data.name, data);
	const setSlot = (path: string, index: number, value: unknown) => {
		const found = catalogue.find(other => other.path === path);
		const target = found?.handler?.slots[index];
		if (!target) throw new Chat.ErrorMessage(`"${path}:${index}" isn't a value you can change. /dexes code shows them.`);
		const edits = entry.slots[path] ||= {};
		const current = found!.values[index];
		if (value === null || sameValue(value, current)) {
			delete edits[index];
			if (!Object.keys(edits).length) delete entry.slots[path];
			return;
		}
		let to;
		try {
			to = checkSlot(target, value, data);
		} catch (e: any) {
			throw new Chat.ErrorMessage(`"${path}:${index}": ${e.message}`);
		}
		const nth = found!.handler!.slots.slice(0, index).filter(other => other.value === target.value).length;
		edits[index] = { from: target.value, to, nth };
	};
	if (input.slots !== undefined) {
		if (!isObject(input.slots)) throw new Chat.ErrorMessage(`"slots" must map "handler:number" to a value.`);
		for (const key in input.slots) {
			const split = key.lastIndexOf(':');
			setSlot(key.slice(0, split), Number(key.slice(split + 1)), input.slots[key]);
		}
	}
	if (input.replace !== undefined) {
		if (!Array.isArray(input.replace) || input.replace.some(pair => !Array.isArray(pair) || pair.length !== 2)) {
			throw new Chat.ErrorMessage(`"replace" must be a list of [old value, new value] pairs.`);
		}
		for (const [from, to] of input.replace) {
			let count = 0;
			for (const { path, handler, values } of catalogue) {
				handler?.slots.forEach((other, index) => {
					if (!sameValue(other.value, from) && !sameValue(values[index], from)) return;
					setSlot(path, index, to);
					count++;
				});
			}
			if (!count) throw new Chat.ErrorMessage(`Nothing in ${entry.data.name}'s code is ${JSON.stringify(from)}.`);
		}
	}
	return entry;
}

const lineOf = (src: string, start: number, end: number) => {
	const from = src.lastIndexOf('\n', start - 1) + 1;
	const to = src.indexOf('\n', end);
	const line = src.slice(from, to < 0 ? undefined : to);
	const indent = line.length - line.trimStart().length;
	return { line: line.trim(), column: start - from - indent };
};

let engine: [string, string][] | null = null;
const references = new WeakMap<AnyObject, Map<string, Map<string, number>>>();

export function engineChecks(id: string) {
	engine ||= [...FS('dist/sim').readdirSync().map(file => `sim/${file}`), 'data/rulesets.js']
		.filter(file => file.endsWith('.js') && !['sim/dex-custom.js', 'sim/dex-handlers.js'].includes(file))
		.map(file => [file, FS(`dist/${file}`).readSync()]);
	const pattern = new RegExp(`["']${id}["']`, 'g');
	return engine.map(([file, src]) => ({ file, count: src.match(pattern)?.length || 0 })).filter(entry => entry.count);
}

export function referencesTo(dex: ModdedDex, id: string) {
	let index = references.get(dex.data);
	if (!index) {
		index = new Map();
		for (const table of ['Moves', 'Abilities', 'Items', 'Conditions'] as const) {
			for (const effectid in dex.data[table]) {
				const effect = dex.data[table][effectid] as AnyObject;
				const add = (value: unknown) => {
					const target = toID(value);
					if (!target || target === effectid) return;
					const counts = index!.get(target) || new Map<string, number>();
					index!.set(target, counts);
					const key = `${EFFECT_NAMES[table]}: ${effect.name || effectid}`;
					counts.set(key, (counts.get(key) || 0) + 1);
				};
				for (const [, fn] of handlersOf(effect)) {
					for (const found of parseHandler(fn, dex.data)?.slots || []) {
						if (found.kind === 'ref') add(found.value);
					}
				}
				const attributes = (value: unknown, key: string) => {
					if (typeof value === 'string' && key !== 'name' && classify(value, key, dex.data)?.kind === 'ref') add(value);
					if (value && typeof value === 'object') {
						for (const [field, entry] of Object.entries(value)) attributes(entry, field);
					}
				};
				attributes(effect, '');
			}
		}
		references.set(dex.data, index);
	}
	return [...index.get(id) || []].map(([effect, count]) => ({ effect, count }));
}

export function describeEffect(
	dex: ModdedDex, table: EffectTable, effectid: ID, entry: EffectEntry | undefined, data: AnyObject
) {
	const edit = entry ? resolveEdits(dex, entry, data, []) : { data: {} };
	const name = entry?.data.name || dex.data[table][effectid]?.name;
	const { official, baseid, base } = baseEffect(dex, table, effectid, edit);
	const handlers = effectSlots(dex, table, effectid, edit, name, data).map(({ path, handler, values }) => ({
		path,
		editable: !!handler,
		code: handler?.src,
		slots: handler?.slots.map((found, index) => ({
			index, kind: found.kind, tables: found.tables, value: values[index], original: found.value,
			edited: !!entry?.slots[path]?.[index], length: found.end - found.start, ...lineOf(handler.src, found.start, found.end),
		})) || [],
	}));
	return {
		table, id: effectid, name, official, base: base ? baseid : null, handlers,
		lost: official || !base ? null : { engine: engineChecks(baseid), references: referencesTo(dex, baseid) },
	};
}

export function describeText(dex: ModdedDex, table: EffectTable, edit: EffectEdit, effect: AnyObject, id: ID) {
	const { official, baseid, base } = baseEffect(dex, table, id, edit);
	if (!base || table === 'Conditions') return {};
	const getter = { Moves: dex.moves, Abilities: dex.abilities, Items: dex.items }[table];
	const descs = dex.text.get(getter.get(baseid) as any) as AnyObject;
	const pairs: [string | number, string | number][] = official ? [] : [[base.name, effect.name]];
	const data: AnyObject = dex.data;
	const display = (value: string | number, found: Slot): string | number => {
		if (found.kind === 'stat') return STAT_NAMES[value];
		if (found.kind !== 'ref') return value;
		return data[found.tables!.find(other => data[other][toID(value)]) || 'Moves'][toID(value)]?.name || value;
	};
	for (const path in edit.slots) {
		const handler = parseHandler(getPath(base, path) as Function, dex.data);
		for (const index in edit.slots[path]) {
			const found = handler?.slots[Number(index)];
			const [from, to] = edit.slots[path][index];
			if (found && found.kind !== 'status') pairs.push([display(from, found), display(to, found)]);
		}
	}
	const numbers = (value: unknown, old: unknown) => {
		if (typeof value === 'number' && typeof old === 'number') pairs.push([old, value]);
		if (isObject(value) && isObject(old)) for (const key in value) numbers(value[key], old[key]);
	};
	numbers(edit.data, base);
	const replace = (description: string | undefined) => {
		if (!description) return description;
		for (const [from, to] of pairs) {
			if (from === to) continue;
			const escaped = String(from).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const pattern = new RegExp(typeof from === 'number' ? `(?<![\\d.])${escaped}(?![\\d.])` : `\\b${escaped}\\b`, 'g');
			if (typeof from === 'number' && description.match(pattern)?.length !== 1) continue;
			description = description.replace(pattern, String(to));
		}
		return description;
	};
	return { desc: edit.data.desc ?? replace(descs.desc), shortDesc: edit.data.shortDesc ?? replace(descs.shortDesc) };
}
