export const Abilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {
	angerpoint: {
		inherit: true,
		onHit(target, source, move) {
			if (!target.hp) return;
			if (move?.effectType === 'Move' && target.getMoveHitData(move).crit) {
				if (target.species.id === 'wiggler') target.formeChange('Wiggler-Angry');
				this.boost({ atk: 12 }, target, target);
			}
		},
	},
	defeatist: {
		inherit: true,
		onUpdate(pokemon) {
			if (pokemon.hp <= pokemon.maxhp / 2) {
				if (pokemon.species.id === 'rex') pokemon.formeChange('Rex-Squished', this.effect, true);
			} else {
				if (pokemon.species.id === 'rexsquished') pokemon.formeChange('Rex', this.effect, true);
			}
		},
	},
	chaosemeralds: {
		onDamagePriority: -40,
		onDamage(damage, target, source, effect) {
			if (target.species.id === 'sonic' && !target.transformed && damage >= target.hp && effect?.effectType === 'Move') {
				return target.hp - 1;
			}
		},
		onResidualOrder: 1,
		onResidual(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Sonic' || pokemon.transformed || !pokemon.hp) return;
			if (pokemon.species.id === 'supersonic' || pokemon.hp !== 1) return;
			this.add('-activate', pokemon, 'ability: Chaos Emeralds');
			if (pokemon.species.id === 'sonic') pokemon.formeChange('Super Sonic', this.effect, true);
			this.heal(pokemon.baseMaxhp);
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "Chaos Emeralds",
		shortDesc: "When Sonic reaches 1 HP, fully heal and transform into Super Sonic.",
		rating: 5,
		num: 0,
	},
};
