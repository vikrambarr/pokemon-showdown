import { parse } from 'acorn';
import * as vm from 'vm';
import { toID } from './dex-data';

export type SlotKind = 'number' | 'type' | 'category' | 'stat' | 'status' | 'ref';

export interface Slot {
	start: number;
	end: number;
	kind: SlotKind;
	value: string | number;
	key?: boolean;
	tables?: string[];
	form?: 'id' | 'name';
}

export interface Handler {
	src: string;
	name: string | null;
	slots: Slot[];
	messages: { start: number, end: number, value: string }[];
}

export const REF_TABLES = ['Moves', 'Abilities', 'Items', 'Conditions', 'Pokedex'];
export const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
export const BOOSTS = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'];
export const STATUSES = ['brn', 'par', 'slp', 'frz', 'psn', 'tox'];
export const CATEGORIES = ['Physical', 'Special', 'Status'];
export const MESSAGE = /^(?:\[(?:from|of)\] )?(?:move|ability|item): /;

const PROTOCOL = ['add', 'addMove', 'addSplit', 'attrLastMove', 'debug', 'hint', 'retargetLastMove'];
const parsed = new WeakMap<AnyObject, WeakMap<Function, Handler | null>>();

const typeName = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

function walk(node: AnyObject, stack: AnyObject[], visit: (node: AnyObject, stack: AnyObject[]) => boolean | void) {
	if (visit(node, stack) === false) return;
	stack.push(node);
	for (const key in node) {
		const child = node[key];
		if (Array.isArray(child)) {
			for (const entry of child) {
				if (entry && typeof entry.type === 'string') walk(entry, stack, visit);
			}
		} else if (child && typeof child.type === 'string') {
			walk(child, stack, visit);
		}
	}
	stack.pop();
}

function bindings(pattern: AnyObject | null, names: Set<string>) {
	if (!pattern) return;
	if (pattern.type === 'Identifier') {
		names.add(pattern.name);
	} else if (pattern.type === 'ObjectPattern') {
		for (const property of pattern.properties) {
			bindings(property.type === 'RestElement' ? property.argument : property.value, names);
		}
	} else if (pattern.type === 'ArrayPattern') {
		for (const element of pattern.elements) bindings(element, names);
	} else if (pattern.type === 'RestElement') {
		bindings(pattern.argument, names);
	} else if (pattern.type === 'AssignmentPattern') {
		bindings(pattern.left, names);
	}
}

function isReference(node: AnyObject, parent: AnyObject) {
	switch (parent.type) {
	case 'MemberExpression':
		return parent.object === node || parent.computed;
	case 'Property':
		return parent.value === node || parent.computed;
	case 'MethodDefinition':
	case 'PropertyDefinition':
		return parent.computed;
	case 'LabeledStatement':
	case 'BreakStatement':
	case 'ContinueStatement':
		return false;
	}
	return true;
}

function comparedWith(node: AnyObject, stack: AnyObject[]) {
	const parent = stack[stack.length - 1];
	let other;
	if (parent.type === 'BinaryExpression') other = parent.left === node ? parent.right : parent.left;
	if (parent.type === 'AssignmentExpression') other = parent.left;
	if (parent.type === 'SwitchCase') other = stack[stack.length - 2].discriminant;
	return other?.type === 'MemberExpression' && !other.computed ? other.property.name as string : '';
}

export function classify(value: string, comparedTo: string, data: AnyObject): Partial<Slot> | null {
	if (STATUSES.includes(value)) return { kind: 'status' };
	if (STATS.includes(value) || BOOSTS.includes(value)) return { kind: 'stat' };
	if (['Physical', 'Special'].includes(value) || (value === 'Status' && comparedTo === 'category')) {
		return { kind: 'category' };
	}
	const id = toID(value);
	if (id && data.TypeChart[id] && value === typeName(id)) return { kind: 'type' };
	const tables = REF_TABLES.filter(table => {
		const entry = data[table][id];
		return entry && (value === id || value === entry.name);
	});
	if (!id || !tables.length) return null;
	return { kind: 'ref', tables, form: value === id ? 'id' : 'name' };
}

function find(src: string, data: AnyObject): Handler | null {
	let ast: AnyObject;
	let offset = 2;
	try {
		ast = parse(`({${src}})`, { ecmaVersion: 'latest' });
	} catch {
		offset = 1;
		try {
			ast = parse(`(${src})`, { ecmaVersion: 'latest' });
		} catch {
			return null;
		}
	}
	const expression = ast.body[0].expression;
	const name = offset === 2 ? (expression.properties[0].key.name ?? `${expression.properties[0].key.value}`) : null;
	const slots: Slot[] = [];
	const messages: Handler['messages'] = [];
	const references = new Set<string>();
	const declared = new Set<string>();
	walk(ast, [], (node, stack) => {
		const parent = stack[stack.length - 1];
		if (node.type === 'Identifier' && parent && isReference(node, parent)) references.add(node.name);
		if (node.type === 'VariableDeclarator') bindings(node.id, declared);
		if (node.type === 'CatchClause') bindings(node.param, declared);
		if (/Function/.test(node.type)) {
			for (const param of node.params) bindings(param, declared);
			if (node.id) declared.add(node.id.name);
		}
		if (node.type === 'ObjectExpression' && node.properties.length && node.properties.every((property: AnyObject) => (
			property.type === 'Property' && property.kind === 'init' && !property.computed && !property.shorthand &&
			!property.method && property.key.type === 'Identifier' && BOOSTS.includes(property.key.name)
		))) {
			for (const { key } of node.properties) {
				slots.push({ start: key.start - offset, end: key.end - offset, kind: 'stat', value: key.name, key: true });
			}
		}
		if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal' &&
			typeof node.argument.value === 'number') {
			slots.push({ start: node.start - offset, end: node.end - offset, kind: 'number', value: -node.argument.value });
			return false;
		}
		if (node.type !== 'Literal') return;
		const index = parent.type === 'MemberExpression' && parent.computed && parent.property === node;
		if (typeof node.value === 'number') {
			if (!index) slots.push({ start: node.start - offset, end: node.end - offset, kind: 'number', value: node.value });
			return;
		}
		if (typeof node.value !== 'string') return;
		if (parent.type === 'CallExpression' && parent.arguments[0] === node &&
			parent.callee.type === 'MemberExpression' && PROTOCOL.includes(parent.callee.property.name)) {
			return;
		}
		if (MESSAGE.test(node.value)) {
			messages.push({ start: node.start - offset, end: node.end - offset, value: node.value });
			return;
		}
		const comparedTo = comparedWith(node, stack);
		if (comparedTo === 'effectType') return;
		const kind = classify(node.value, comparedTo, data);
		if (kind) slots.push({ start: node.start - offset, end: node.end - offset, value: node.value, ...kind } as Slot);
	});
	for (const reference of references) {
		if (!declared.has(reference) && !(reference in globalThis)) return null;
	}
	return { src, name, slots: slots.sort((a, b) => a.start - b.start), messages };
}

export function parseHandler(fn: Function, data: AnyObject) {
	let cache = parsed.get(data);
	if (!cache) parsed.set(data, cache = new WeakMap());
	let handler = cache.get(fn);
	if (handler === undefined) cache.set(fn, handler = find(fn.toString(), data));
	return handler;
}

export function handlersOf(effect: AnyObject, path = '', found: [string, Function][] = []) {
	for (const key of Object.keys(effect)) {
		const value = effect[key];
		if (typeof value === 'function') {
			found.push([path + key, value]);
		} else if (value && typeof value === 'object') {
			handlersOf(value, `${path}${key}.`, found);
		}
	}
	return found;
}

export function checkSlot(slot: Slot, value: unknown, data: AnyObject): string | number {
	if (slot.kind === 'number') {
		if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1e9) {
			throw new Error(`${JSON.stringify(value)} isn't a number.`);
		}
		return value;
	}
	const id = toID(value);
	if (typeof value !== 'string' || !id) throw new Error(`${JSON.stringify(value)} isn't a name.`);
	if (slot.kind === 'type') {
		if (!data.TypeChart[id]) throw new Error(`"${value}" isn't a type.`);
		return typeName(id);
	}
	if (slot.kind === 'category') {
		const category = CATEGORIES.find(entry => toID(entry) === id);
		if (!category) throw new Error(`"${value}" isn't a category: use ${CATEGORIES.join(', ')}.`);
		return category;
	}
	if (slot.kind === 'stat') {
		const allowed = slot.value === 'hp' ? STATS : slot.key || ['accuracy', 'evasion'].includes(slot.value as string) ?
			BOOSTS : STATS.slice(1);
		if (!allowed.includes(id)) throw new Error(`"${value}" can't go there: use ${allowed.join(', ')}.`);
		return id;
	}
	if (slot.kind === 'status') {
		if (!STATUSES.includes(id)) throw new Error(`"${value}" isn't a status: use ${STATUSES.join(', ')}.`);
		return id;
	}
	const table = slot.tables!.find(name => data[name][id]);
	if (!table) {
		const what = slot.tables!.map(name => name === 'Pokedex' ? 'Pokemon' : name.toLowerCase().slice(0, -1)).join(' or ');
		throw new Error(`"${value}" isn't a ${what.replace('abilitie', 'ability')}.`);
	}
	return slot.form === 'id' ? id : data[table][id].name || id;
}

export function render(slot: Slot, value: string | number) {
	if (slot.key) return value as string;
	if (typeof value === 'number' && (value < 0 || Object.is(value, -0))) return `(${value})`;
	return JSON.stringify(value);
}

export function compileHandler(handler: Handler, replacements: { start: number, end: number, text: string }[]) {
	let src = handler.src;
	for (const { start, end, text } of [...replacements].sort((a, b) => b.start - a.start)) {
		src = src.slice(0, start) + text + src.slice(end);
	}
	if (handler.name === null) return vm.runInThisContext(`'use strict'; (${src});`) as Function;
	return vm.runInThisContext(`'use strict'; ({${src}});`)[handler.name] as Function;
}
