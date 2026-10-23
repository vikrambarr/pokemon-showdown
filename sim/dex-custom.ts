import * as fs from 'fs';
import { Dex, toID, type DexTable, type ModdedDex } from './dex';
import type { TypeData } from './dex-data';
import type { Format, FormatData } from './dex-formats';
import type { LearnsetData, SpeciesData, SpeciesFormatsData } from './dex-species';
import { Rulesets as PokeathlonRulesets } from '../data/pokeathlon-rulesets';
import {
	checkSlot, compileHandler, eventTargets, EVENT_SUFFIXES, handlersOf, parseHandler, render,
} from './dex-handlers';

export const EFFECT_TABLES = ['Moves', 'Abilities', 'Items', 'Conditions'] as const;
export type EffectTable = typeof EFFECT_TABLES[number];

export interface EffectEdit {
	inherit?: string;
	data: AnyObject;
	slots?: { [path: string]: { [index: string]: [string | number, string | number] } };
	events?: { [path: string]: string };
}

export interface DexLayer {
	hash: string;
	mod: string;
	parent?: string;
	parents?: string[];
	species: string[];
	Pokedex: DexTable<SpeciesData>;
	Learnsets: DexTable<LearnsetData>;
	FormatsData: DexTable<SpeciesFormatsData>;
	TypeChart?: DexTable<TypeData>;
	effects?: { [table in EffectTable]?: DexTable<EffectEdit> };
	format?: FormatData;
}

export type DexData = DexLayer | { hash: string, format?: FormatData };

const NOT_INHERITED = ['num', 'name', 'gen', 'isNonstandard'];
const MERGED_TABLES = ['Pokedex', 'Learnsets', 'FormatsData', 'TypeChart', ...EFFECT_TABLES] as const;
const UNSAFE = ['__proto__', 'constructor', 'prototype'];
export const REPLACED = ['megaStone', 'boosts', 'boost'];

const isObject = (value: unknown): value is AnyObject => !!value && typeof value === 'object' && !Array.isArray(value);

function clone(value: any): any {
	if (Array.isArray(value)) return value.map(clone);
	return isObject(value) ? merge({}, value) : value;
}

function merge(target: AnyObject, source: AnyObject) {
	for (const key of Object.keys(source)) {
		const value = source[key];
		if (UNSAFE.includes(key) || typeof target[key] === 'function' || (/^on[A-Z]/.test(key) && isObject(value))) continue;
		if (value === null) {
			delete target[key];
		} else if (isObject(value) && isObject(target[key]) && !REPLACED.includes(key)) {
			merge(target[key], value);
		} else {
			target[key] = clone(value);
		}
	}
	return target;
}

function renameSelf(value: any, from: string, id: string, name: string): any {
	if (typeof value === 'string') return toID(value) === from ? (value === from ? id : name) : value;
	if (Array.isArray(value)) return value.map(entry => renameSelf(entry, from, id, name));
	if (!isObject(value)) return value;
	for (const key of Object.keys(value)) {
		if (key !== 'name') value[key] = renameSelf(value[key], from, id, name);
	}
	return value;
}

export function baseEffect(parent: ModdedDex, table: EffectTable, id: string, edit: EffectEdit) {
	const official = parent.data[table][id];
	const baseid = official ? id : toID(edit.inherit);
	const base: AnyObject | undefined = official || (baseid ? parent.data[table][baseid] : undefined);
	const renames = !official && !!base && (table === 'Conditions' || !parent.data.Conditions[baseid]);
	return { official: !!official, baseid, base, renames };
}

export function effectSlots(
	parent: ModdedDex, table: EffectTable, id: string, edit: EffectEdit, name: string, data: AnyObject
) {
	const { baseid, base, renames } = baseEffect(parent, table, id, edit);
	if (!base) return [];
	return handlersOf(base).map(([path, fn]) => {
		const handler = parseHandler(fn, parent.data);
		const changes = Object.hasOwn(edit.slots || {}, path) ? edit.slots![path] : {};
		const values = handler ? handler.slots.map((slot, index) => {
			const change = changes[index];
			if (Array.isArray(change) && change[0] === slot.value) return checkSlot(slot, change[1], data);
			if (renames && slot.kind === 'ref' && toID(slot.value) === baseid && slot.tables!.includes(table)) {
				return slot.form === 'id' ? id : name;
			}
			return slot.value;
		}) : [];
		return { path, fn, handler, values };
	});
}

function replaceAt(effect: AnyObject, path: string, fn: Function, compiled: Function) {
	const keys = path.split('.');
	const last = keys.pop()!;
	for (const key of keys) {
		effect = effect?.[key];
	}
	if (effect?.[last] === fn) effect[last] = compiled;
}

export function moveEvents(effect: AnyObject, base: AnyObject, events: { [path: string]: string }) {
	const moves = new Map<AnyObject, [string, string][]>();
	for (const path of Object.keys(events)) {
		const keys = path.split('.');
		const key = keys.pop()!;
		let owner: AnyObject | undefined = effect;
		let original: AnyObject | undefined = base;
		for (const segment of keys) {
			owner = owner?.[segment];
			original = original?.[segment];
		}
		const fn = original?.[key];
		if (!owner || typeof fn !== 'function' || typeof owner[key] !== 'function') continue;
		if (!eventTargets(key, fn).includes(events[path])) {
			throw new Error(`${path} can't become ${events[path]}: it can be ${eventTargets(key, fn).join(', ') || 'nothing else'}.`);
		}
		if (!moves.has(owner)) moves.set(owner, []);
		moves.get(owner)!.push([key, events[path]]);
	}
	for (const [owner, pairs] of moves) {
		const moved: AnyObject = {};
		for (const [from, to] of pairs) {
			for (const suffix of ['', ...EVENT_SUFFIXES]) {
				if (owner[from + suffix] !== undefined) moved[to + suffix] = owner[from + suffix];
				delete owner[from + suffix];
			}
		}
		for (const [, to] of pairs) {
			if (typeof owner[to] === 'function') throw new Error(`${to} already has its own handler.`);
		}
		for (const key of Object.keys(moved)) owner[key] = moved[key];
	}
}

function resolveEffects(parent: ModdedDex, effects: NonNullable<DexLayer['effects']>, data: AnyObject) {
	const resolved: [EffectTable, string, AnyObject, EffectEdit][] = [];
	for (const table of EFFECT_TABLES) {
		const edits = effects[table];
		if (!isObject(edits)) continue;
		data[table] = { ...data[table] };
		for (const id of Object.keys(edits)) {
			const edit = edits[id];
			if (!/^[a-z0-9]+$/.test(id) || UNSAFE.includes(id) || !isObject(edit?.data)) continue;
			const { official, baseid, base, renames } = baseEffect(parent, table, id, edit);
			let effect = base ? clone(base) : {};
			if (!official) {
				for (const field of NOT_INHERITED) delete effect[field];
				if (renames) effect = renameSelf(effect, baseid, id, `${edit.data.name}`);
			}
			merge(effect, edit.data);
			if (!official) {
				effect.name ||= id;
				effect.gen = parent.gen;
			}
			data[table][id] = effect;
			resolved.push([table, id, effect, edit]);
		}
	}
	for (const [table, id, effect, edit] of resolved) {
		const { official, base } = baseEffect(parent, table, id, edit);
		for (const { path, fn, handler, values } of effectSlots(parent, table, id, edit, effect.name, data)) {
			if (!handler) continue;
			const replacements = handler.slots.flatMap((slot, index) => (
				values[index] === slot.value ? [] : [{ start: slot.start, end: slot.end, text: render(slot, values[index]) }]
			));
			if (!official && base!.name && base!.name !== effect.name) {
				for (const message of handler.messages) {
					if (!message.value.endsWith(`: ${base!.name}`)) continue;
					const text = JSON.stringify(message.value.slice(0, -base!.name.length) + effect.name);
					replacements.push({ start: message.start, end: message.end, text });
				}
			}
			if (replacements.length) replaceAt(effect, path, fn, compileHandler(handler, replacements));
		}
		if (base && isObject(edit.events)) moveEvents(effect, base, edit.events);
	}
}

const built = new Map<string, {
	dex: ModdedDex, base: ModdedDex, refs: number, parents: ModdedDex[], data?: DexLayer,
}>();

export function loadLayer(hash: string): DexLayer {
	if (!/^[0-9a-f]{20}$/.test(hash)) throw new Error(`"${hash}" isn't a dex version.`);
	for (const entry of built.values()) {
		if (entry.data?.hash === hash) return entry.data;
	}
	const path = `${(global as any).Config?.dexdatapath || 'dex-data'}/${hash}.json`;
	return JSON.parse(fs.readFileSync(path, 'utf8'));
}

export function isBuiltDex(mod: string) {
	return built.has(mod);
}

function mergeEntry(
	table: string, target: AnyObject, entry: AnyObject, original: AnyObject | undefined, taken: Set<string>
) {
	for (const key of Object.keys(entry)) {
		const value = entry[key];
		if (original && (value === original[key] ||
			(typeof value !== 'function' && JSON.stringify(value) === JSON.stringify(original[key])))) continue;
		if (table === 'Learnsets' && key === 'learnset') {
			const learnset: AnyObject = target.learnset = { ...target.learnset };
			for (const move of Object.keys(value)) learnset[move] = [...new Set([...learnset[move] || [], ...value[move]])];
		} else if (!taken.has(key)) {
			target[key] = value;
		} else if (table === 'Pokedex' && key === 'abilities') {
			target.abilities = { ...value, ...target.abilities };
		} else if (table === 'Pokedex' && key === 'evos') {
			target.evos = [...new Set([...target.evos, ...value])];
		} else if (table === 'TypeChart' && key === 'damageTaken') {
			target.damageTaken = { ...value, ...target.damageTaken };
		}
		taken.add(key);
	}
}

export function buildBase(
	data: Pick<DexLayer, 'mod' | 'parent' | 'parents'>, base = Dex, engine = data.mod
): ModdedDex {
	const hashes = data.parents || (data.parent ? [data.parent] : []);
	if (!hashes.length) return base.mod(engine);
	if (hashes.length === 1) return buildDex({ hash: hashes[0] }, base, engine);
	const id = `${engine}dex${hashes.join('')}`;
	const cached = built.get(id);
	if (cached) {
		cached.refs++;
		return cached.dex;
	}
	const parents = hashes.map(hash => buildDex({ hash }, base, engine));
	const original = base.mod(engine);
	const dex = new base.ModdedDex(id);
	dex.parentMod = original.currentMod;
	dex.gen = original.gen;
	const dataCache: AnyObject = { ...original.data };
	for (const table of MERGED_TABLES) {
		const merged: AnyObject = { ...original.data[table] };
		const taken = new Map<string, Set<string>>();
		for (const parent of parents) {
			for (const [entryid, entry] of Object.entries(parent.data[table])) {
				const old: AnyObject | undefined = original.data[table][entryid];
				if (entry === old) continue;
				if (!taken.has(entryid)) {
					taken.set(entryid, new Set());
					merged[entryid] = { ...old };
				}
				mergeEntry(table, merged[entryid], entry, old, taken.get(entryid)!);
			}
		}
		dataCache[table] = merged;
	}
	dex.dataCache = dataCache as ModdedDex['dataCache'];
	const own = (alias: ID) => !dataCache.Pokedex[alias]?.isCosmeticForme &&
		['Pokedex', ...EFFECT_TABLES].some(table => dataCache[table][alias]);
	dex.getAlias = alias => (own(alias) ? undefined : parents.map(parent => parent.getAlias(alias)).find(Boolean));
	dex.forGen = gen => (!gen || gen === dex.gen ? dex : base.forGen(gen));
	base.dexes[id] = dex;
	built.set(id, { dex, base, refs: 1, parents });
	return dex;
}

export function buildDex(input: DexData, base = Dex, engine?: string): ModdedDex {
	const data = 'mod' in input ? input : loadLayer(input.hash);
	const id = `${engine || data.mod}dex${input.hash}`;
	const cached = built.get(id);
	if (cached) {
		cached.refs++;
		return cached.dex;
	}
	const parent = buildBase(data, base, engine || data.mod);
	const species = new Set(data.species);
	const dex = new base.ModdedDex(id);
	dex.parentMod = parent.currentMod;
	dex.gen = parent.gen;
	dex.dataCache = {
		...parent.data,
		Pokedex: { ...parent.data.Pokedex, ...data.Pokedex },
		Learnsets: { ...parent.data.Learnsets, ...data.Learnsets },
		FormatsData: { ...parent.data.FormatsData, ...data.FormatsData },
		TypeChart: { ...parent.data.TypeChart, ...data.TypeChart },
		Rulesets: {
			...PokeathlonRulesets,
			...parent.data.Rulesets,
			dexpokemon: {
				effectType: 'ValidatorRule',
				name: 'Dex Pokemon',
				desc: "Only Pok&eacute;mon in this dex can be used",
				onValidateSet(set) {
					const { outOfBattleSpecies, tierSpecies } = this.getValidationSpecies(set);
					const fusion = this.ruleTable.has('infinitefusionmod') && set.fusion ? [this.dex.species.get(set.fusion)] : [];
					for (const forme of [outOfBattleSpecies, tierSpecies, ...fusion]) {
						if (!species.has(forme.isCosmeticForme ? toID(forme.baseSpecies) : forme.id)) {
							return [`${forme.name} isn't in this dex.`];
						}
					}
				},
			},
			officialteratypes: {
				effectType: 'ValidatorRule',
				name: 'Official Tera Types',
				desc: "Pok&eacute;mon can only Terastallize into types from the main games",
				onValidateSet(set) {
					if (set.teraType && !base.data.TypeChart[toID(set.teraType)]) {
						return [`${set.name || set.species}'s Tera Type can't be ${set.teraType}, which isn't from the main games.`];
					}
				},
			},
			dexsnapshot: {
				effectType: 'Rule',
				name: 'Dex Snapshot',
				onBegin() {
					this.add('dex', data.hash);
				},
			},
		},
	};
	if (data.effects) resolveEffects(parent, data.effects, dex.dataCache);
	const cosmetic = new Map(Object.entries(data.Pokedex).flatMap(([speciesid, entry]) => (
		(entry.cosmeticFormes || []).map(forme => [toID(forme), speciesid as ID] as const)
	)));
	const own = (alias: ID) => !dex.dataCache!.Pokedex[alias]?.isCosmeticForme &&
		['Pokedex', ...EFFECT_TABLES].some(table => dex.dataCache![table as 'Moves'][alias]);
	dex.getAlias = alias => cosmetic.get(alias) || (own(alias) ? undefined : parent.getAlias(alias));
	dex.forGen = gen => (!gen || gen === dex.gen ? dex : base.forGen(gen));
	base.dexes[id] = dex;
	built.set(id, { dex, base, refs: 1, parents: [parent], data });
	return dex;
}

export function releaseDex(dex: ModdedDex) {
	const cached = built.get(dex.currentMod);
	if (!cached || --cached.refs > 0) return;
	built.delete(dex.currentMod);
	delete cached.base.dexes[dex.currentMod];
	for (const parent of cached.parents) releaseDex(parent);
}

export function buildFormat(dex: ModdedDex, formatData: FormatData): Format {
	const ruleset = ['Dex Pokemon', 'Dex Snapshot', ...formatData.ruleset || []];
	const battle = formatData.debug ? { trunc: Math.trunc } : undefined;
	return new dex.Format({
		...formatData, battle, effectType: 'Format', mod: dex.currentMod, ruleset, baseRuleset: ruleset,
	});
}
