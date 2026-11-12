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
}

const CODES: { [multiplier: string]: number } = { 1: 0, 2: 1, 0.5: 2, 0: 3 };

function conditions(dex: ModdedDex) {
	const names = new Set(Object.keys(dex.data.TypeChart).map(typeName));
	return [...new Set(Object.values(dex.data.TypeChart).flatMap(type => Object.keys(type.damageTaken)))]
		.filter(key => !names.has(key));
}

function matchups(input: unknown, field: string, types: Set<string>, dex: ModdedDex, attacking: boolean) {
	if (!isObject(input)) {
		throw new Chat.ErrorMessage(`"${field}" must map types to multipliers, like {"Fire": 0.5}.`);
	}
	const extra = attacking ? [] : conditions(dex);
	const result: AnyObject = {};
	for (const key of Object.keys(input)) {
		const value = input[key];
		const name = types.has(typeName(toID(key))) ? typeName(toID(key)) : extra.find(other => toID(other) === toID(key));
		if (!name) {
			throw new Chat.ErrorMessage(`"${key}" (${field}) isn't a type${extra.length ? ` or one of: ${extra.join(', ')}` : ''}.`);
		}
		const allowed = types.has(name) ? [0, 0.5, 1, 2] : [0, 1];
		if (value !== null && !allowed.includes(value)) {
			throw new Chat.ErrorMessage(`"${field}.${name}" must be one of: ${allowed.join(', ')}, or null to undo it.`);
		}
		result[name] = value;
	}
	return result;
}

export function validateType(input: AnyObject, dex: ModdedDex, entries: Map<ID, TypeEntry>, built = dex) {
	const name = validateName(input.name, 'type');
	const id = toID(name);
	if (name !== typeName(id)) {
		throw new Chat.ErrorMessage(`Type names are one word starting with a capital letter, like "${typeName(id)}".`);
	}
	for (const key in input) {
		if (!['name', 'damageTaken', 'attacks', 'color', 'label', 'removed'].includes(key)) {
			throw new Chat.ErrorMessage(`"${key}" isn't something you can set. You can set: name, damageTaken, attacks, color, label, removed.`);
		}
	}
	const old = entries.get(id);
	const types = new Set([...Object.keys(built.data.TypeChart).map(typeName), name]);
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
	const color = input.color === undefined ? old?.data.color : input.color;
	if (color !== undefined && color !== null) {
		if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) {
			throw new Chat.ErrorMessage(`"color" must be a hex color, like "#7a5cc9".`);
		}
		data.color = color.toLowerCase();
	}
	const label = input.label === undefined ? old?.data.label : input.label;
	if (label !== undefined && label !== null) {
		if (typeof label !== 'string' || !/^[a-z0-9?-]{1,6}$/i.test(label)) {
			throw new Chat.ErrorMessage(`"label" must be 1 to 6 letters, numbers, - or ?, like "COSMIC". It's what the type's icon says.`);
		}
		data.label = label.toUpperCase();
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
		sprites: { ...old?.sprites }, origin: old?.origin || null, trackdex: null, trackid: null,
	} as TypeEntry;
}

export function resolveTypes(dex: ModdedDex, entries: Iterable<TypeEntry>) {
	const TypeChart: { [id: string]: TypeData } = {};
	const get = (id: string) => (TypeChart[id] ||= dex.data.TypeChart[id] ?
		{ ...dex.data.TypeChart[id], damageTaken: { ...dex.data.TypeChart[id].damageTaken } } :
		{ damageTaken: {} } as TypeData);
	const list = [...entries];
	for (const entry of list) get(entry.effectid);
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
		if (entry.data.color) (get(entry.effectid) as AnyObject).color = entry.data.color;
		if (entry.data.label) (get(entry.effectid) as AnyObject).label = entry.data.label;
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
