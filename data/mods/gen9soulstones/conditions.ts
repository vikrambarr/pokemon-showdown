export const Conditions: import('../../../sim/dex-conditions').ModdedConditionDataTable = {
	frb: {
		name: 'frb',
		effectType: 'Status',
		onStart(target, source, sourceEffect) {
			if (sourceEffect?.effectType === 'Ability') {
				this.add('-status', target, 'frb', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
			} else {
				this.add('-status', target, 'frb');
			}
		},
		onModifyStatusDamage(damage, pokemon, target, move) {
			if (move.category !== 'Special' || pokemon.hasAbility('attunement')) return;
			if (this.gen < 6 || !this.dex.countsAs('Moves', move.id, 'facade')) return this.modify(damage, 0.5);
		},
		onResidualOrder: 10,
		onResidual(pokemon) {
			this.damage(pokemon.baseMaxhp / 16);
		},
	},
	gem: {
		inherit: true,
		onBasePower(basePower, user, target, move) {
			this.debug('Gem Boost');
			return this.chainModify(1.4);
		},
	},
	hail: {
		inherit: true,
		onModifyDefPriority: 10,
		onModifyDef(def, pokemon) {
			if (pokemon.hasType('Ice') && this.field.isWeather('hail')) {
				return this.modify(def, 1.5);
			}
		},
	},
};
