import { Dex, toID, type DexTable, type ModdedDex } from './dex';
import type { Format, FormatData } from './dex-formats';
import type { LearnsetData, SpeciesData, SpeciesFormatsData } from './dex-species';
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

export interface DexData {
	hash: string;
	mod: string;
	species: string[];
	Pokedex: DexTable<SpeciesData>;
	Learnsets: DexTable<LearnsetData>;
	FormatsData: DexTable<SpeciesFormatsData>;
	effects?: { [table in EffectTable]?: DexTable<EffectEdit> };
	format?: FormatData;
}

const NOT_INHERITED = ['num', 'name', 'gen', 'isNonstandard'];
const UNSAFE = ['__proto__', 'constructor', 'prototype'];

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
		} else if (isObject(value) && isObject(target[key])) {
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

function resolveEffects(parent: ModdedDex, effects: NonNullable<DexData['effects']>, data: AnyObject) {
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

const built = new Map<string, { dex: ModdedDex, base: ModdedDex, refs: number }>();

export function buildDex(data: DexData, base = Dex) {
	const id = `dex${data.hash}`;
	const cached = built.get(id);
	if (cached) {
		cached.refs++;
		return cached.dex;
	}
	const parent = base.mod(data.mod);
	const species = new Set(data.species);
	const dex = new base.ModdedDex(id);
	dex.parentMod = parent.currentMod;
	dex.gen = parent.gen;
	dex.dataCache = {
		...parent.data,
		Pokedex: { ...parent.data.Pokedex, ...data.Pokedex },
		Learnsets: { ...parent.data.Learnsets, ...data.Learnsets },
		FormatsData: { ...parent.data.FormatsData, ...data.FormatsData },
		Rulesets: {
			...parent.data.Rulesets,
			dexpokemon: {
				effectType: 'ValidatorRule',
				name: 'Dex Pokemon',
				desc: "Only Pok&eacute;mon in this dex can be used",
				onValidateSet(set) {
					const { outOfBattleSpecies, tierSpecies } = this.getValidationSpecies(set);
					for (const forme of [outOfBattleSpecies, tierSpecies]) {
						if (!species.has(forme.isCosmeticForme ? toID(forme.baseSpecies) : forme.id)) {
							return [`${forme.name} isn't in this dex.`];
						}
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
	base.dexes[id] = dex;
	built.set(id, { dex, base, refs: 1 });
	return dex;
}

export function releaseDex(dex: ModdedDex) {
	const cached = built.get(dex.currentMod);
	if (!cached || --cached.refs > 0) return;
	built.delete(dex.currentMod);
	delete cached.base.dexes[dex.currentMod];
}

export function buildFormat(dex: ModdedDex, formatData: FormatData): Format {
	const ruleset = ['Dex Pokemon', 'Dex Snapshot', ...formatData.ruleset || []];
	return new dex.Format({ ...formatData, effectType: 'Format', mod: dex.currentMod, ruleset, baseRuleset: ruleset });
}
