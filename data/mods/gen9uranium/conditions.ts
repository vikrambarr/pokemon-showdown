export const Conditions: import('../../../sim/dex-conditions').ModdedConditionDataTable = {
	slp: {
		name: 'slp',
		effectType: 'Status',
		onStart(target, source, sourceEffect) {
			if (sourceEffect?.effectType === 'Ability') {
				this.add('-status', target, 'slp', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
			} else if (sourceEffect?.effectType === 'Move') {
				this.add('-status', target, 'slp', '[from] move: ' + sourceEffect.name);
			} else {
				this.add('-status', target, 'slp');
			}
			this.effectState.startTime = this.random(2, 5);
			this.effectState.time = this.effectState.startTime;

			if (target.removeVolatile('nightmare')) {
				this.add('-end', target, 'Nightmare', '[silent]');
			}
		},
		onBeforeMovePriority: 10,
		onBeforeMove(pokemon, target, move) {
			let nightterror = false;
			for (const foe of pokemon.foes()) {
				if (foe.hasAbility('Night Terror')) nightterror = true;
			}

			if (pokemon.hasAbility('earlybird')) {
				pokemon.statusState.time--;
			}
			pokemon.statusState.time--;
			if (pokemon.statusState.time <= 0) {
				pokemon.cureStatus();
				if (nightterror) {
					pokemon.trySetStatus('par', null, this.dex.abilities.get('Night Terror'));
				}
				return;
			}
			this.add('cant', pokemon, 'slp');
			if (move.sleepUsable) {
				return;
			}
			return false;
		},
	},
	gem: {
		duration: 1,
		affectsFainted: true,
		onBasePower(basePower, user, target, move) {
			this.debug('Gem Boost');
			return this.chainModify(1.5);
		},
	},
	thunderstorm: {
		name: 'Thunderstorm',
		effectType: 'Weather',
		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-weather', 'Thunderstorm', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'Thunderstorm');
			}
		},
		onWeatherModifyDamage(damage, attacker, defender, move) {
			if (move.type === 'Electric') {
				this.debug('Thunderstorm electric boost');
				return this.chainModify(1.5);
			}
		},
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Thunderstorm', '[upkeep]');
			if (this.field.isWeather('thunderstorm')) this.eachEvent('Weather');
		},
		onWeather(target) {
			if (this.effectState.duration && this.effectState.duration % 2 === 0) {
				const typeMod = this.clampIntRange(target.runEffectiveness(this.dex.getActiveMove('thunderstorm')), -6, 6);
				if (target.runImmunity('Electric')) this.damage(target.maxhp * 2 ** typeMod / 8);
			}
		},
		onFieldEnd() {
			this.add('-weather', 'none');
		},
	},
	fallout: {
		name: 'Fallout',
		effectType: 'Weather',
		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-weather', 'Fallout', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'Fallout');
			}
		},
		onWeatherModifyDamage(damage, attacker, defender, move) {
			if (defender.getMoveHitData(move).typeMod > 0 && defender.hasType('Nuclear')) {
				return this.chainModify(0.75);
			}
		},
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Fallout', '[upkeep]');
			if (this.field.isWeather('fallout')) this.eachEvent('Weather');
		},
		onWeather(target) {
			if (this.effectState.duration && this.effectState.duration % 2 === 0) {
				const typeMod = this.clampIntRange(target.runEffectiveness(this.dex.getActiveMove('fallout')), -6, 6);
				this.damage(target.maxhp * 2 ** typeMod / 8);
			}
		},
		onFieldEnd() {
			this.add('-weather', 'none');
		},
	},
};
