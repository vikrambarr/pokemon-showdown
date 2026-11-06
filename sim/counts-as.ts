import type { ModdedDex } from './dex';

const TABLES = ['Conditions', 'Moves', 'Abilities', 'Items'] as const;

interface CountsIndex {
	up: Map<string, string[]>;
	down: Map<string, string[]>;
}

const indexes = new WeakMap<object, CountsIndex | null>();

function countsIndex(dex: ModdedDex) {
	let index = indexes.get(dex.data);
	if (index !== undefined) return index;
	const parents = new Map<string, string>();
	for (const table of TABLES) {
		const entries: AnyObject = dex.data[table] || {};
		for (const id in entries) {
			const parent = entries[id]?.countsAs;
			if (typeof parent === 'string' && parent && parent !== id && !parents.has(id)) parents.set(id, parent);
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
	indexes.set(dex.data, index);
	return index;
}

export function countsAs(dex: ModdedDex, actual: string, wanted: string | string[]): boolean {
	if (Array.isArray(wanted)) return wanted.some(id => countsAs(dex, actual, id));
	if (actual === wanted) return true;
	return !!countsIndex(dex)?.up.get(actual)?.includes(wanted);
}

export function countedBase(dex: ModdedDex, actual: string) {
	const chain = countsIndex(dex)?.up.get(actual);
	return chain?.length ? chain[chain.length - 1] : actual;
}

export function countedAs(dex: ModdedDex, wanted: string) {
	return countsIndex(dex)?.down.get(wanted) || [];
}

export function countedKey(dex: ModdedDex, holder: AnyObject, wanted: string) {
	if (Object.hasOwn(holder, wanted)) return wanted;
	return countedAs(dex, wanted).find(id => Object.hasOwn(holder, id));
}

export function countingHolder<T extends AnyObject>(dex: ModdedDex, holder: T): T {
	if (!countsIndex(dex)) return holder;
	return new Proxy(holder, {
		get(target, key, receiver) {
			if (typeof key === 'string' && !Object.hasOwn(target, key)) {
				const copy = countedAs(dex, key).find(id => Object.hasOwn(target, id));
				if (copy) return target[copy];
			}
			return Reflect.get(target, key, receiver);
		},
		has(target, key) {
			if (Reflect.has(target, key)) return true;
			return typeof key === 'string' && countedAs(dex, key).some(id => Object.hasOwn(target, id));
		},
	});
}

export function countedCondition(dex: ModdedDex, holder: AnyObject, status: string | Effect) {
	const found = dex.conditions.get(status);
	const key = countedKey(dex, holder, found.id);
	return key && key !== found.id ? dex.conditions.getByID(key as ID) : found;
}
