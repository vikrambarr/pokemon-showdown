import { toID } from '../../../sim/dex';
import { Field } from '../../../sim/field';
import { Pokemon } from '../../../sim/pokemon';
import { Abilities } from '../gen9infinitefusion/abilities';
import { Conditions } from '../gen9infinitefusion/conditions';
import { Items } from '../gen9infinitefusion/items';
import { Moves } from '../gen9infinitefusion/moves';
import { Scripts as Parent } from '../gen9infinitefusion/scripts';

function removeInnates(pokemon: Pokemon, battle: Battle) {
	for (const innate of pokemon.m.activeInnates || []) {
		if (battle.dex.abilities.get(innate).flags['cantsuppress'] || innate === 'neutralizinggas') continue;
		pokemon.removeVolatile('ability:' + toID(innate));
		battle.add('-endability', pokemon, innate);
	}
	pokemon.m.activeInnates = undefined;
	battle.add('-displayabilities', pokemon, pokemon.ability, [pokemon.baseAbility, ...(pokemon.m.innates || [])].join(','));
}

function removeInnate(pokemon: Pokemon, innate: string, battle: Battle) {
	const index = pokemon.m.activeInnates?.indexOf(innate) ?? -1;
	if (index < 0 || battle.dex.abilities.get(innate).flags['cantsuppress'] || innate === 'neutralizinggas') return;
	pokemon.removeVolatile('ability:' + toID(innate));
	battle.add('-endability', pokemon, innate);
	pokemon.m.activeInnates.splice(index, 1);
	if (!pokemon.m.activeInnates.length) pokemon.m.activeInnates = undefined;
	battle.add('-displayabilities', pokemon, [pokemon.ability, ...(pokemon.m.activeInnates || [])].join(','),
		[pokemon.baseAbility, ...(pokemon.m.innates || [])].join(','));
}

function addActiveInnates(
	pokemon: Pokemon, innates: string[] | undefined, battle: Battle, effect: string, ofPokemon?: string
) {
	for (const innate of innates || []) {
		if (pokemon.m.activeInnates?.includes(innate) || pokemon.ability === toID(innate)) continue;
		if (battle.dex.abilities.get(innate).flags['notrace']) continue;
		pokemon.addVolatile('ability:' + toID(innate));
		pokemon.m.activeInnates = [...(pokemon.m.activeInnates || []), innate];
		if (effect === 'silent') {
			battle.add('-ability', pokemon, innate, '[silent]');
		} else if (ofPokemon) {
			battle.add('-ability', pokemon, innate, `[from] ${effect}`, `[of] ${ofPokemon}`);
		} else {
			battle.add('-ability', pokemon, innate, `[from] ${effect}`);
		}
	}
	battle.add('-displayabilities', pokemon, [pokemon.ability, ...(pokemon.m.activeInnates || [])].join(','),
		[pokemon.baseAbility, ...(pokemon.m.innates || [])].join(','));
}

function swapInnates(source: Pokemon, target: Pokemon, battle: Battle, effect: string) {
	const [sourceInnates, targetInnates] = [source.m.activeInnates, target.m.activeInnates];
	removeInnates(source, battle);
	removeInnates(target, battle);
	addActiveInnates(source, targetInnates, battle, effect);
	addActiveInnates(target, sourceInnates, battle, effect);
}

const InnateAbilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {
	mummy: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			const sourceAbility = source.getAbility();
			const shouldSkipAbility = sourceAbility.flags['cantsuppress'] || sourceAbility.id === 'mummy';
			if (!shouldSkipAbility) {
				if (this.checkMoveMakesContact(move, source, target, !source.isAlly(target))) {
					const oldAbility = source.setAbility('mummy', target);
					if (oldAbility) {
						this.add('-activate', target, 'ability: Mummy', this.dex.abilities.get(oldAbility).name, `[of] ${source}`);
					}
				}
			}
			if (this.format.ruleset?.includes('Double Ability Mod')) removeInnates(source, this);
		},
	},
	neutralizinggas: {
		inherit: true,
		onSwitchIn(pokemon) {
			this.add('-ability', pokemon, 'Neutralizing Gas');
			pokemon.abilityState.ending = false;
			for (const target of this.getAllActive()) {
				if (target.illusion) {
					this.singleEvent('End', this.dex.abilities.get('Illusion'), target.abilityState, target, pokemon, 'neutralizinggas');
				}
				if (target.volatiles['slowstart']) {
					delete target.volatiles['slowstart'];
					this.add('-end', target, 'Slow Start', '[silent]');
				}
				if (this.format.ruleset?.includes('Double Ability Mod')) removeInnates(target, this);
			}
			if (this.format.ruleset?.includes('Double Ability Mod')) removeInnates(pokemon, this);
		},
		onEnd(source) {
			this.add('-end', source, 'ability: Neutralizing Gas');

			if (source.abilityState.ending) return;
			source.abilityState.ending = true;
			const sortedActive = this.getAllActive();
			this.speedSort(sortedActive);
			for (const pokemon of sortedActive) {
				if (pokemon !== source) {
					this.singleEvent('Start', pokemon.getAbility(), pokemon.abilityState, pokemon);
					if (this.format.ruleset?.includes('Double Ability Mod')) addActiveInnates(pokemon, pokemon.m.innates, this, 'silent');
				}
			}
		},
	},
	powerofalchemy: {
		inherit: true,
		onAllyFaint(ally) {
			const pokemon = this.effectState.target;
			if (!pokemon.hp) return;
			const isAbility = pokemon.ability === 'powerofalchemy';
			let possibleAbilities = [ally.ability];
			if (ally.m.innates) possibleAbilities.push(...ally.m.innates);
			const additionalBannedAbilities = [pokemon.ability, ...(pokemon.m.activeInnates || [])];
			possibleAbilities = possibleAbilities
				.filter(val => !this.dex.abilities.get(val).flags['noreceiver'] && !additionalBannedAbilities.includes(val));
			if (!possibleAbilities.length) return;
			const ability = this.dex.abilities.get(possibleAbilities[this.random(possibleAbilities.length)]);
			this.add('-ability', pokemon, ability, '[from] ability: Power of Alchemy', `[of] ${ally}`);
			if (isAbility) {
				pokemon.setAbility(ability);
			} else {
				removeInnate(pokemon, 'Power of Alchemy', this);
				addActiveInnates(pokemon, [ability.name], this, 'ability: Power of Alchemy');
			}
		},
	},
	receiver: {
		inherit: true,
		onAllyFaint(ally) {
			const pokemon = this.effectState.target;
			if (!pokemon.hp) return;
			const isAbility = pokemon.ability === 'receiver';
			let possibleAbilities = [ally.ability];
			if (ally.m.innates) possibleAbilities.push(...ally.m.innates);
			const additionalBannedAbilities = [pokemon.ability, ...(pokemon.m.activeInnates || [])];
			possibleAbilities = possibleAbilities
				.filter(val => !this.dex.abilities.get(val).flags['noreceiver'] && !additionalBannedAbilities.includes(val));
			if (!possibleAbilities.length) return;
			const ability = this.dex.abilities.get(possibleAbilities[this.random(possibleAbilities.length)]);
			this.add('-ability', pokemon, ability, '[from] ability: Receiver', `[of] ${ally}`);
			if (isAbility) {
				pokemon.setAbility(ability);
			} else {
				removeInnate(pokemon, 'Receiver', this);
				addActiveInnates(pokemon, [ability.name], this, 'ability: Receiver');
			}
		},
	},
	trace: {
		inherit: true,
		onUpdate(pokemon) {
			if (!this.effectState.seek) return;
			const isDoubleAbilBattle = this.format.ruleset?.includes('Double Ability Mod');
			const possibleTargets = pokemon.adjacentFoes().filter(
				target =>
					(!target.getAbility().flags['notrace'] && target.ability !== 'noability') ||
					(isDoubleAbilBattle && (target.m.activeInnates || []).some(
						(innate: string) => !this.dex.abilities.get(innate).flags['notrace']
					))
			);
			if (!possibleTargets.length) return;

			const target = this.sample(possibleTargets);
			if (!target.getAbility().flags['notrace'] && target.ability !== 'noability') {
				const isMainAbility = pokemon.ability === 'trace';
				if (isMainAbility) pokemon.setAbility(target.getAbility(), target);
				else {
					removeInnate(pokemon, 'Trace', this);
					addActiveInnates(pokemon, [target.getAbility().name], this, 'ability: Trace', target.fullname);
				}
			}
			if (isDoubleAbilBattle) {
				removeInnate(pokemon, 'Trace', this);
				addActiveInnates(pokemon, target.m.activeInnates, this, 'ability: Trace', target.fullname);
			}
		},
	},
	wanderingspirit: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (!this.checkMoveMakesContact(move, source, target) || target.volatiles['dynamax']) return;
			const shouldSkipAbility = source.getAbility().flags['failskillswap'];
			if (!shouldSkipAbility) {
				const targetCanBeSet = this.runEvent('SetAbility', target, source, this.effect, source.ability);
				if (!targetCanBeSet) return targetCanBeSet;
				const sourceAbility = source.setAbility(target.getAbility(), target);
				if (!sourceAbility) return;
				if (target.isAlly(source)) {
					this.add('-activate', target, 'Skill Swap', '', '', `[of] ${source}`);
				} else {
					this.add('-activate', target, 'ability: Wandering Spirit', this.dex.abilities.get(sourceAbility).name, 'Wandering Spirit', `[of] ${source}`);
				}
				target.setAbility(sourceAbility);
			};
			if (this.format.ruleset?.includes('Double Ability Mod')) swapInnates(source, target, this, 'ability: Wandering Spirit');
		},
	},
};

const InnateMoves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	gastroacid: {
		inherit: true,
		condition: {
			onStart(pokemon) {
				this.add('-endability', pokemon);
				this.singleEvent('End', pokemon.getAbility(), pokemon.abilityState, pokemon, pokemon, 'gastroacid');
				if (this.format.ruleset?.includes('Double Ability Mod')) removeInnates(pokemon, this);
			},
		},
	},
	worryseed: {
		inherit: true,
		onHit(target, source) {
			const oldAbility = target.setAbility('insomnia');
			if (!oldAbility) return oldAbility as false | null;
			if (target.status === 'slp') target.cureStatus();
			if (this.format.ruleset?.includes('Double Ability Mod')) removeInnates(target, this);
		},
	},
	simplebeam: {
		inherit: true,
		onHit(target, source) {
			const oldAbility = target.setAbility('simple');
			if (!oldAbility) return oldAbility as false | null;
			if (this.format.ruleset?.includes('Double Ability Mod')) removeInnates(target, this);
		},
	},
	entrainment: {
		inherit: true,
		onHit(target, source) {
			const oldAbility = target.setAbility(source.ability, source);
			if (!oldAbility) return oldAbility as false | null;
			if (!target.isAlly(source)) target.volatileStaleness = 'external';
			if (this.format.ruleset?.includes('Double Ability Mod')) {
				removeInnates(target, this);
				addActiveInnates(target, source.m.activeInnates, this, 'move: Entrainment');
			}
		},
	},
	roleplay: {
		inherit: true,
		onHit(target, source) {
			const oldAbility = source.setAbility(target.ability, target);
			if (!oldAbility) return oldAbility as false | null;
			if (this.format.ruleset?.includes('Double Ability Mod')) {
				removeInnates(source, this);
				addActiveInnates(source, target.m.activeInnates, this, 'move: Role Play');
			}
		},
	},
	skillswap: {
		inherit: true,
		onHit(target, source, move) {
			const targetAbility = target.getAbility();
			const sourceAbility = source.getAbility();
			if (target.isAlly(source)) {
				this.add('-activate', source, 'move: Skill Swap', '', '', `[of] ${target}`);
			} else {
				this.add('-activate', source, 'move: Skill Swap', targetAbility, sourceAbility, `[of] ${target}`);
			}
			this.singleEvent('End', sourceAbility, source.abilityState, source);
			this.singleEvent('End', targetAbility, target.abilityState, target);
			source.ability = targetAbility.id;
			target.ability = sourceAbility.id;
			source.abilityState = this.initEffectState({ id: this.toID(source.ability), target: source });
			target.abilityState = this.initEffectState({ id: this.toID(target.ability), target });
			source.volatileStaleness = undefined;
			if (!target.isAlly(source)) target.volatileStaleness = 'external';
			this.singleEvent('Start', targetAbility, source.abilityState, source);
			this.singleEvent('Start', sourceAbility, target.abilityState, target);
			if (this.format.ruleset?.includes('Double Ability Mod')) swapInnates(source, target, this, 'move: Skill Swap');
		},
	},
};

export const Scripts: ModdedBattleScriptsData = {
	inherit: 'gen7',
	gen: 7,
	init() {
		Parent.init!.call(this);
		const tables: { [table: string]: AnyObject } = { Moves, Abilities, Items, Conditions };
		for (const table in tables) {
			const data: AnyObject = this.data[table as 'Moves'];
			const parent: AnyObject = this.mod(this.parentMod).data[table as 'Moves'];
			for (const id in tables[table]) {
				if (data[id] !== parent[id]) continue;
				const { inherit, ...entry } = tables[table][id];
				data[id] = inherit ? { ...data[id], ...entry } : entry;
			}
		}
		const innates: { [table: string]: AnyObject } = { Abilities: InnateAbilities, Moves: InnateMoves };
		for (const table in innates) {
			const data: AnyObject = this.data[table as 'Moves'];
			for (const id in innates[table]) {
				const { inherit, ...entry } = innates[table][id];
				data[id] = inherit ? { ...data[id], ...entry } : entry;
			}
		}
	},
	field: {
		suppressingWeather() {
			if (Field.prototype.suppressingWeather.call(this)) return true;
			return this.battle.getAllActive().some(pokemon => !pokemon.fainted && !pokemon.ignoringAbility() &&
				pokemon.m.innates?.some((k: string) => this.battle.dex.abilities.get(k).suppressWeather));
		},
	},
	pokemon: {
		hasAbility(ability) {
			if (this.ignoringAbility()) return false;
			if (Array.isArray(ability)) return ability.some(abil => this.hasAbility(abil));
			ability = this.battle.toID(ability);
			return this.ability === ability || !!this.volatiles['ability:' + ability];
		},
		transformInto(pokemon, effect) {
			if (!Pokemon.prototype.transformInto.call(this, pokemon, effect || undefined)) return false;
			if (this.battle.gen > 2) {
				for (const innate of this.m.innates || []) {
					this.removeVolatile('ability:' + innate);
				}
				for (const innate of pokemon.m.innates || []) {
					this.addVolatile('ability:' + innate, this);
				}
			}
			return true;
		},
		formeChange(
			speciesId: string | Species, source: Effect | null = null,
			isPermanent?: boolean, abilitySlot = '0', message?: string
		) {
			const rawSpecies = this.battle.dex.species.get(speciesId);

			const species = this.setSpecies(rawSpecies, source);
			if (!species) return false;

			if (this.battle.gen <= 2) return true;

			const apparentSpecies =
				this.illusion ? this.illusion.species.name : species.baseSpecies;
			if (isPermanent) {
				this.baseSpecies = rawSpecies;
				this.details = this.getUpdatedDetails();
				let details = (this.illusion || this).details;
				if (this.terastallized) details += `, tera:${this.terastallized}`;
				this.battle.add('detailschange', this, details);
				this.updateMaxHp();
				if (!source) {
					this.formeRegression = true;
				} else if (source.effectType === 'Item') {
					this.canTerastallize = null;
					if (source.zMove) {
						this.battle.add('-burst', this, apparentSpecies, species.requiredItem);
						this.moveThisTurnResult = true;
					} else if (source.isPrimalOrb) {
						if (this.illusion) {
							this.ability = '';
							this.battle.add('-primal', this.illusion, species.requiredItem);
						} else {
							this.battle.add('-primal', this, species.requiredItem);
						}
					} else {
						this.battle.add('-mega', this, apparentSpecies, species.requiredItem);
						this.moveThisTurnResult = true;
					}
					this.formeRegression = true;
				} else if (source.effectType === 'Status') {
					this.battle.add('-formechange', this, species.name, message);
				}
			} else {
				if (source?.effectType === 'Ability') {
					this.battle.add('-formechange', this, species.name, message, `[from] ability: ${source.name}`);
				} else {
					this.battle.add('-formechange', this, this.illusion ? this.illusion.species.name : species.name, message);
				}
			}
			if (
				isPermanent &&
				(!source || !['disguise', 'iceface', 'ability:disguise', 'ability:iceface'].includes(source.id))
			) {
				if (this.illusion && source) {
					this.ability = '';
				}
				const ability = species.abilities[abilitySlot] || species.abilities['0'];
				if (source || !this.getAbility().flags['cantsuppress']) this.setAbility(ability, null, null, true);
				this.baseAbility = toID(ability);
			}
			if (this.terastallized) {
				this.knownType = true;
				this.apparentType = this.terastallized;
			}
			return true;
		},
	},
};
