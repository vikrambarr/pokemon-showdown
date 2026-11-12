import type { ModdedDex } from './dex';

const TABLES = ['Conditions', 'Moves', 'Abilities', 'Items'] as const;
export type CountsTable = typeof TABLES[number];

interface CountsIndex {
	up: Map<string, string[]>;
	down: Map<string, string[]>;
}

const indexes = new WeakMap<object, Map<CountsTable, CountsIndex | null>>();

function countsIndex(dex: ModdedDex, table: CountsTable) {
	let cache = indexes.get(dex.data);
	if (!cache) indexes.set(dex.data, cache = new Map());
	let index = cache.get(table);
	if (index !== undefined) return index;
	const parents = new Map<string, string>();
	const entries: AnyObject = table === 'Conditions' ? Object.assign({}, ...[...TABLES].reverse().map(other => (
		Object.fromEntries(Object.entries(dex.data[other] || {}).filter(([, entry]) => (
			other === 'Conditions' || (entry as AnyObject).condition
		)))
	))) : dex.data[table];
	for (const id in entries) {
		const parent = entries[id]?.countsAs;
		if (typeof parent === 'string' && parent && parent !== id) parents.set(id, parent);
	}
	if (table === 'Conditions') {
		for (const other of ['Abilities', 'Items'] as const) {
			const prefix = other === 'Abilities' ? 'ability:' : 'item:';
			for (const id in dex.data[other]) {
				const parent = (dex.data[other][id] as AnyObject).countsAs;
				if (typeof parent === 'string' && parent && parent !== id) parents.set(prefix + id, prefix + parent);
			}
		}
	}
	index = null;
	if (parents.size) {
		index = { up: new Map(), down: new Map() };
		for (const id of parents.keys()) {
			const chain: string[] = [];
			for (let parent = parents.get(id); parent && parent !== id && !chain.includes(parent); parent = parents.get(parent)) {
				chain.push(parent);
				const down = index.down.get(parent) || [];
				down.push(id);
				index.down.set(parent, down);
			}
			index.up.set(id, chain);
		}
	}
	cache.set(table, index);
	return index;
}

export function countsAs(dex: ModdedDex, table: CountsTable, actual: string, wanted: string | string[]): boolean {
	if (Array.isArray(wanted)) return wanted.some(id => countsAs(dex, table, actual, id));
	if (actual === wanted) return true;
	return !!countsIndex(dex, table)?.up.get(actual)?.includes(wanted);
}

export function countedBase(dex: ModdedDex, table: CountsTable, actual: string) {
	const chain = countsIndex(dex, table)?.up.get(actual);
	return chain?.length ? chain[chain.length - 1] : actual;
}

export function countedAs(dex: ModdedDex, table: CountsTable, wanted: string) {
	return countsIndex(dex, table)?.down.get(wanted) || [];
}

export function countedKey(dex: ModdedDex, holder: AnyObject, wanted: string) {
	if (Object.hasOwn(holder, wanted)) return wanted;
	return countedAs(dex, 'Conditions', wanted).find(id => Object.hasOwn(holder, id));
}

export function countingHolder<T extends AnyObject>(dex: ModdedDex, holder: T): T {
	if (!countsIndex(dex, 'Conditions')) return holder;
	return new Proxy(holder, {
		get(target, key, receiver) {
			if (typeof key === 'string' && !Object.hasOwn(target, key)) {
				const copy = countedAs(dex, 'Conditions', key).find(id => Object.hasOwn(target, id));
				if (copy) return target[copy];
			}
			return Reflect.get(target, key, receiver);
		},
		has(target, key) {
			if (Reflect.has(target, key)) return true;
			return typeof key === 'string' && countedAs(dex, 'Conditions', key).some(id => Object.hasOwn(target, id));
		},
	});
}

export function countedCondition(dex: ModdedDex, holder: AnyObject, status: string | Effect) {
	const found = dex.conditions.get(status);
	const key = countedKey(dex, holder, found.id);
	return key && key !== found.id ? dex.conditions.getByID(key as ID) : found;
}
