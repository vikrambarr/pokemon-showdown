export const Abilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {
	disguise: {
		onSwitchOut(pokemon) {
			if (this.effectState.busted) {
				this.effectState.busted = false;
				const speciesid = pokemon.species.id === 'mimikyubustedtotem' ? 'Mimikyu-Totem' : 'Mimikyu';
				pokemon.formeChange(speciesid, this.effect, true);
			}
		},
		onDamagePriority: 1,
		onDamage(damage, target, source, effect) {
			if (effect?.effectType === 'Move') {
				if (
					['mimikyu', 'mimikyutotem'].includes(target.species.id) && !target.transformed
				) {
					this.add('-activate', target, 'ability: Disguise');
					this.effectState.busted = true;
					return 0;
				}
			}
		},
		onCriticalHit(target, source, move) {
			if (!target) return;
			if (!['mimikyu', 'mimikyutotem'].includes(target.species.id) ||
				target.transformed) {
				return;
			}
			const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
			if (hitSub) return;

			if (!target.runImmunity(move.type)) return;
			return false;
		},
		onEffectiveness(typeMod, target, type, move) {
			if (!target || move.category === 'Status') return;
			if (!['mimikyu', 'mimikyutotem'].includes(target.species.id) ||
				target.transformed) {
				return;
			}
			const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
			if (hitSub) return;

			if (!target.runImmunity(move.type)) return;
			return 0;
		},
		onUpdate(pokemon) {
			if (['mimikyu', 'mimikyutotem'].includes(pokemon.species.id) && this.effectState.busted) {
				const speciesid = pokemon.species.id === 'mimikyutotem' ? 'Mimikyu-Busted-Totem' : 'Mimikyu-Busted';
				pokemon.formeChange(speciesid, this.effect, true);
				if (this.dex.gen > 7) {
					this.damage(pokemon.baseMaxhp / 8, pokemon, pokemon, this.dex.species.get(speciesid));
				}
			}
		},
		flags: {
			failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1,
			breakable: 1, notransform: 1,
		},
		name: "Disguise",
		rating: 3.5,
		num: 209,
	},
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
			}
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
				}
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
			}
		},
	},
	powerofalchemy: {
		inherit: true,
		onAllyFaint(ally) {
			const pokemon = this.effectState.target;
			if (!pokemon.hp) return;
			let possibleAbilities = [ally.ability];
			const additionalBannedAbilities = [pokemon.ability];
			possibleAbilities = possibleAbilities
				.filter(val => !this.dex.abilities.get(val).flags['noreceiver'] && !additionalBannedAbilities.includes(val));
			if (!possibleAbilities.length) return;
			const ability = this.dex.abilities.get(possibleAbilities[this.random(possibleAbilities.length)]);
			this.add('-ability', pokemon, ability, '[from] ability: Power of Alchemy', `[of] ${ally}`);
			pokemon.setAbility(ability);
		},
	},
	receiver: {
		inherit: true,
		onAllyFaint(ally) {
			const pokemon = this.effectState.target;
			if (!pokemon.hp) return;
			let possibleAbilities = [ally.ability];
			const additionalBannedAbilities = [pokemon.ability];
			possibleAbilities = possibleAbilities
				.filter(val => !this.dex.abilities.get(val).flags['noreceiver'] && !additionalBannedAbilities.includes(val));
			if (!possibleAbilities.length) return;
			const ability = this.dex.abilities.get(possibleAbilities[this.random(possibleAbilities.length)]);
			this.add('-ability', pokemon, ability, '[from] ability: Receiver', `[of] ${ally}`);
			pokemon.setAbility(ability);
		},
	},
	trace: {
		inherit: true,
		onUpdate(pokemon) {
			if (!this.effectState.seek) return;
			const possibleTargets = pokemon.adjacentFoes().filter(
				target => !target.getAbility().flags['notrace'] && target.ability !== 'noability'
			);
			if (!possibleTargets.length) return;

			const target = this.sample(possibleTargets);
			pokemon.setAbility(target.getAbility(), target);
		},
	},
};
