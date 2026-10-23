export const Abilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {
	darkswarm: {
		onSwitchInPriority: -1,
		onStart(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Wishiwashi-Orion' || pokemon.level < 20 || pokemon.transformed) return;
			if (pokemon.hp > pokemon.maxhp / 4) {
				if (pokemon.species.id === 'wishiwashiorion') {
					pokemon.formeChange('Wishiwashi-Orion-Swarm');
				}
			} else {
				if (pokemon.species.id === 'wishiwashiorion') {
					pokemon.formeChange('Wishiwashi-Orion');
				}
			}
		},
		onResidualOrder: 29,
		onResidual(pokemon) {
			if (
				pokemon.baseSpecies.baseSpecies !== 'Wishiwashi-Orion' || pokemon.level < 20 ||
				pokemon.transformed || !pokemon.hp
			) return;
			if (pokemon.hp > pokemon.maxhp / 4) {
				if (pokemon.species.id === 'wishiwashiorion') {
					pokemon.formeChange('Wishiwashi-Orion-Swarm');
				}
			} else {
				if (pokemon.species.id === 'wishiwashiorionswarm') {
					pokemon.formeChange('Wishiwashi-Orion');
				}
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "Dark Swarm",
		rating: 3,
		num: 0,
		shortDesc: "If user is Wishiwashi-Orion, changes to Symphny Form if it has > 1/4 max HP.",
	},
	symphony: {
		onSwitchInPriority: -1,
		onStart(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Unown-Orion' || pokemon.level < 20 || pokemon.transformed) return;
			if (pokemon.hp > pokemon.maxhp / 4) {
				if (pokemon.species.id === 'unownorion') {
					pokemon.formeChange('Unown-Orion-Symphony');
				}
			} else {
				if (pokemon.species.id === 'unownorionsymphony') {
					pokemon.formeChange('Unown-Orion');
				}
			}
		},
		onResidualOrder: 29,
		onResidual(pokemon) {
			if (
				pokemon.baseSpecies.baseSpecies !== 'Unown-Orion' || pokemon.level < 20 ||
				pokemon.transformed || !pokemon.hp
			) return;
			if (pokemon.hp > pokemon.maxhp / 4) {
				if (pokemon.species.id === 'unownorion') {
					pokemon.formeChange('Unown-Orion-Symphony');
				}
			} else {
				if (pokemon.species.id === 'unownorionsymphony') {
					pokemon.formeChange('Unown-Orion');
				}
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "Symphony",
		rating: 3,
		num: 0,
		shortDesc: "If user is Unown-Orion, changes to Symphony Form if it has > 1/4 max HP.",
	},
	lightaura: {
		onStart(pokemon) {
			if (this.suppressingAbility(pokemon)) return;
			this.add('-ability', pokemon, 'Light Aura');
		},
		onAnyBasePowerPriority: 20,
		onAnyBasePower(basePower, source, target, move) {
			if (target === source || move.category === 'Status' || move.type !== 'Light') return;
			if (!move.auraBooster?.hasAbility('Light Aura')) move.auraBooster = this.effectState.target;
			if (move.auraBooster !== this.effectState.target) return;
			return this.chainModify([move.hasAuraBreak ? 3072 : 5448, 4096]);
		},
		flags: {},
		name: "Light Aura",
		rating: 3,
		num: 0,
		shortDesc: "While this Pokemon is active, a Light move used by any Pokemon has 1.33x power.",
	},
	soulsymphony: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			if (move.flags['sound'] && !pokemon.volatiles['dynamax']) {
				move.type = 'Ghost';
			}
		},
		flags: {},
		name: "Soul Symphony",
		rating: 1.5,
		num: 0,
		shortDesc: "This Pokemon's sound-based moves become Ghost type.",
	},
};
