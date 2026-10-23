import type { ModdedDex } from '../../sim/dex';
import type { TypeData } from '../../sim/dex-data';
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
	locked: boolean;
}

export const MAX_TYPES = 40;

const CODES: { [multiplier: string]: number } = { 1: 0, 2: 1, 0.5: 2, 0: 3 };

const isObject = (value: unknown): value is AnyObject => !!value && typeof value === 'object' && !Array.isArray(value);
const typeName = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

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
		if (!['name', 'damageTaken', 'attacks'].includes(key)) {
			throw new Chat.ErrorMessage(`"${key}" isn't something you can set. You can set: name, damageTaken, attacks.`);
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
	return {
		effecttable: 'TypeChart', effectid: id, num: 0, inheritsfrom: null, data, slots: {}, events: {}, sprites: {},
		origin: old?.origin || null, trackdex: null, trackid: null, locked: old?.locked || false,
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
	}
	return TypeChart;
}
