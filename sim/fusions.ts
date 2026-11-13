import { Dex, type ModdedDex } from './dex';
import type { Species } from './dex-species';
import type { Pokemon } from './pokemon';

export interface FusionHalf {
	species: Species;
	body: boolean;
}

export interface FusionFamily extends FusionHalf {
	base: string;
	formes: Species[];
	inForme: boolean;
}

type FormeKey = 'requiredAbility' | 'requiredMove' | 'requiredItem';
type FormeLink = Partial<Pick<Species, FormeKey | 'battleOnly'>>;

const formeIndexes = new WeakMap<object, Map<string, Species[]>>();

function linkOf(dex: ModdedDex, species: Species): FormeLink {
	const own = dex.data.Scripts.formeLinks?.[species.id];
	if (own) return own;
	if (species.requiredAbility || species.requiredMove || species.requiredItem) return species;
	const official = Dex.species.get(species.id);
	return official.exists && official.name === species.name && official.forme ? official : species;
}

function formesOf(dex: ModdedDex, name: string) {
	let index = formeIndexes.get(dex.data);
	if (!index) {
		formeIndexes.set(dex.data, index = new Map());
		for (const species of dex.species.all()) {
			const link = linkOf(dex, species);
			if (!species.exists || !species.forme) continue;
			if (!link.requiredAbility && !link.requiredMove && !link.requiredItem) continue;
			const bases = link.battleOnly ? [link.battleOnly].flat() : [species.baseSpecies];
			for (const base of bases) {
				if (!index.has(base)) index.set(base, []);
				index.get(base)!.push(species);
			}
		}
	}
	return index.get(name) || [];
}

export function halves(pokemon: Pokemon): FusionHalf[] {
	const list = [{ species: pokemon.species, body: false }];
	if (pokemon.m.fusion) list.push({ species: pokemon.battle.dex.species.get(pokemon.m.fusion), body: true });
	return list;
}

export function family(
	pokemon: Pokemon, key: FormeKey, value: string, test: (half: FusionFamily) => boolean = () => true
) {
	for (const half of halves(pokemon)) {
		const { species } = half;
		const link = linkOf(pokemon.battle.dex, species);
		const inForme = link[key] === value && !!species.forme;
		const base = inForme ? [link.battleOnly || species.baseSpecies].flat()[0] :
			species.isCosmeticForme ? species.baseSpecies : species.name;
		const formes = formesOf(pokemon.battle.dex, base).filter(forme => linkOf(pokemon.battle.dex, forme)[key] === value);
		const found = { ...half, base, formes, inForme };
		if (formes.length && test(found)) return found;
	}
	return null;
}

export function changeHalf(
	pokemon: Pokemon, body: boolean, speciesId: string | Species, source?: Effect | null, isPermanent?: boolean,
	abilitySlot?: string, message?: string
) {
	if (!body) return pokemon.formeChange(speciesId, source, isPermanent, abilitySlot, message);
	if (isPermanent) delete pokemon.m.fusionBase;
	else pokemon.m.fusionBase ||= pokemon.m.fusion;
	pokemon.fusionChange(speciesId, source || pokemon.battle.effect);
	if (isPermanent) pokemon.updateMaxHp();
}

export function speciesHalf(pokemon: Pokemon, test: (species: Species) => boolean) {
	return halves(pokemon).find(half => test(half.species)) || null;
}

export function naturallyHas(pokemon: Pokemon, ability: string) {
	return [pokemon.baseSpecies, ...halves(pokemon).slice(1).map(half => half.species)]
		.some(species => Object.values(species.abilities).includes(ability));
}

export function learnsNaturally(pokemon: Pokemon, move: string) {
	return halves(pokemon).some(({ species }) => {
		const { dex } = pokemon.battle;
		for (let cur: Species | null = species; cur?.exists; cur = cur.changesFrom ? dex.species.get(cur.changesFrom) : null) {
			if (dex.species.getLearnsetData(cur.id).learnset?.[move]) return true;
		}
		return false;
	});
}

const CHECKS: { [event: string]: (result: any, changed: boolean) => boolean } = {
	onTakeItem: result => result === false,
	onModifyCritRatio: result => result !== undefined,
};
const MODIFIERS = ['onModifyAtk', 'onModifyDef', 'onModifySpA', 'onModifySpD', 'onModifySpe', 'onBasePower'];
const wrapped = new WeakSet<Function>();
const checks = new WeakMap<Function, Function>();

export function fusionCheck(event: string, fn: Function) {
	if (wrapped.has(fn) || !(event in CHECKS || MODIFIERS.includes(event)) ||
		!/\b(species|baseSpecies)\b/.test(fn.toString())) return fn;
	if (checks.has(fn)) return checks.get(fn)!;
	const applied = CHECKS[event] || ((result: any, changed: boolean) => result !== undefined || changed);
	const check = function (this: Battle, ...args: any[]) {
		const before = this.event?.modifier;
		const result = fn.apply(this, args);
		if (applied(result, this.event?.modifier !== before)) return result;
		const fused = args.filter(arg => arg?.m?.fusion && arg.species && arg.battle === this) as Pokemon[];
		if (!fused.length) return result;
		const saved = fused.map(pokemon => [pokemon.species, pokemon.baseSpecies] as const);
		for (const pokemon of fused) pokemon.species = pokemon.baseSpecies = this.dex.species.get(pokemon.m.fusion);
		try {
			const bodyResult = fn.apply(this, args);
			return applied(bodyResult, this.event?.modifier !== before) ? bodyResult : result;
		} finally {
			fused.forEach((pokemon, i) => { [pokemon.species, pokemon.baseSpecies] = saved[i]; });
		}
	};
	check.toString = () => fn.toString();
	wrapped.add(check);
	checks.set(fn, check);
	return check;
}
