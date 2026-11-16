import type { ModdedDex } from '../../sim/dex';
import type { TypeData } from '../../sim/dex-data';
import { isObject } from '../../sim/dex-custom';
import { typeName } from '../../sim/dex-handlers';
import { validateName, type Origin } from './species';

export interface TypeEntry {
	effecttable: 'TypeChart';
	effectid: ID;
	num: number;
	inheritsfrom: null;
	data: AnyObject;
	slots: AnyObject;
	events: AnyObject;
	sprites: { [kind: string]: string };
	origin: Origin | null;
	trackdex: ID | null;
	trackid: ID | null;
	pinned: AnyObject | null;
}

const CODES: { [multiplier: string]: number } = { 1: 0, 2: 1, 0.5: 2, 0: 3 };

function conditions(dex: ModdedDex) {
	const names = new Set(Object.keys(dex.data.TypeChart).map(id => typeName(id, dex.data)));
	return [...new Set(Object.values(dex.data.TypeChart).flatMap(type => Object.keys(type.damageTaken)))]
		.filter(key => !names.has(key));
}

function matchups(input: unknown, field: string, types: Map<string, string>, dex: ModdedDex, attacking: boolean) {
	if (!isObject(input)) {
		throw new Chat.ErrorMessage(`"${field}" must map types to multipliers, like {"Fire": 0.5}.`);
	}
	const extra = attacking ? [] : conditions(dex);
	const result: AnyObject = {};
	for (const key of Object.keys(input)) {
		const value = input[key];
		const name = types.get(toID(key)) || extra.find(other => toID(other) === toID(key));
		if (!name) {
			throw new Chat.ErrorMessage(`"${key}" (${field}) isn't a type${extra.length ? ` or one of: ${extra.join(', ')}` : ''}.`);
		}
		const allowed = types.get(toID(name)) === name ? [0, 0.5, 1, 2] : [0, 1];
		if (value !== null && !allowed.includes(value)) {
			throw new Chat.ErrorMessage(`"${field}.${name}" must be one of: ${allowed.join(', ')}, or null to undo it.`);
		}
		result[name] = value;
	}
	return result;
}

export function validateType(input: AnyObject, dex: ModdedDex, entries: Map<ID, TypeEntry>, built = dex) {
	const typed = validateName(input.name, 'type');
	const id = toID(typed);
	const name = built.data.TypeChart[id] ? typeName(id, built.data) : typed;
	for (const key in input) {
		if (!['name', 'damageTaken', 'attacks', 'removed'].includes(key)) {
			throw new Chat.ErrorMessage(`"${key}" isn't something you can set. You can set: name, damageTaken, attacks, removed.`);
		}
	}
	const old = entries.get(id);
	const types = new Map(Object.keys(built.data.TypeChart).map(key => [key, typeName(key, built.data)]));
	types.set(id, name);
	const data: AnyObject = { name, damageTaken: { ...old?.data.damageTaken }, attacks: { ...old?.data.attacks } };
	for (const field of ['damageTaken', 'attacks']) {
		if (input[field] === undefined) continue;
		for (const [key, value] of Object.entries(matchups(input[field], field, types, dex, field === 'attacks'))) {
			if (value === null) {
				delete data[field][key];
			} else {
				data[field][key] = value;
			}
		}
	}
	const removed = input.removed === undefined ? old?.data.removed : input.removed;
	if (removed !== undefined && removed !== null) {
		if (removed !== true) throw new Chat.ErrorMessage(`"removed" must be true, or null to bring the type back.`);
		if (!dex.data.TypeChart[id]) {
			throw new Chat.ErrorMessage(`Only types from the base dex can be removed. Delete ${name} instead.`);
		}
		data.removed = true;
	}
	return {
		effecttable: 'TypeChart', effectid: id, num: 0, inheritsfrom: null, data, slots: {}, events: {},
		sprites: { ...old?.sprites }, origin: old?.origin || null, trackdex: old?.trackdex || null, trackid: old?.trackid || null,
		pinned: old?.pinned || null,
	} as TypeEntry;
}

export function composeType(original: TypeEntry, own: TypeEntry): TypeEntry {
	const data: AnyObject = {
		...original.data, ...own.data,
		damageTaken: { ...original.data.damageTaken, ...own.data.damageTaken },
		attacks: { ...original.data.attacks, ...own.data.attacks },
	};
	if (own.data.removed === undefined && original.data.removed) data.removed = true;
	return { ...own, data, sprites: { ...original.sprites, ...own.sprites } };
}

export function resolveTypes(dex: ModdedDex, entries: Iterable<TypeEntry>) {
	const TypeChart: { [id: string]: TypeData } = {};
	const get = (id: string) => (TypeChart[id] ||= dex.data.TypeChart[id] ?
		{ ...dex.data.TypeChart[id], damageTaken: { ...dex.data.TypeChart[id].damageTaken } } :
		{ damageTaken: {} } as TypeData);
	const list = [...entries];
	for (const entry of list) {
		const type = get(entry.effectid) as AnyObject;
		if (!dex.data.TypeChart[entry.effectid]) type.name = entry.data.name;
	}
	for (const entry of list) {
		for (const [target, multiplier] of Object.entries(entry.data.attacks as AnyObject)) {
			if (dex.data.TypeChart[toID(target)] || TypeChart[toID(target)]) {
				(get(toID(target)).damageTaken as AnyObject)[entry.data.name] = CODES[multiplier];
			}
		}
	}
	for (const entry of list) {
		for (const [source, multiplier] of Object.entries(entry.data.damageTaken as AnyObject)) {
			(get(entry.effectid).damageTaken as AnyObject)[source] = CODES[multiplier];
		}
	}
	const isType = (key: string) => !!(dex.data.TypeChart[toID(key)] || TypeChart[toID(key)]);
	for (const entry of list.filter(type => type.data.removed)) {
		for (const id of new Set([...Object.keys(dex.data.TypeChart), ...Object.keys(TypeChart)])) {
			if (entry.data.name in (TypeChart[id] || dex.data.TypeChart[id]).damageTaken) {
				delete (get(id).damageTaken as AnyObject)[entry.data.name];
			}
		}
		const removed = get(entry.effectid);
		removed.damageTaken = Object.fromEntries(Object.entries(removed.damageTaken).filter(([key]) => !isType(key)));
		(removed as AnyObject).isNonstandard = 'Past';
	}
	return TypeChart;
}
