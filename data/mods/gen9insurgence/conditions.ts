export const Conditions: {[k: string]: ModdedConditionData} = {
	hail: {
		inherit: true,
		onWeather(target) {
			let sleet = false;
			for (const pokemon of this.getAllActive()) if (pokemon.hasAbility('Sleet')) sleet = true;
			this.damage(target.baseMaxhp / (sleet ? 5 : 16));
		},
	},
	newmoon: {
		name: 'NewMoon',
		effectType: 'Weather',
		duration: 5,
		durationCallback(source, effect) {
			if (source?.hasItem('darkrock')) {
				return 8;
			}
			return 5;
		},
		onWeatherModifyDamage(damage, attacker, defender, move) {
			if (move.type === 'Dark' || move.type === 'Ghost') {
				this.debug('New Moon damage boost');
				return this.chainModify(1.35);
			}
			if (move.type === 'Fairy') {
				this.debug('New Moon fairy weaken');
				return this.chainModify(0.75);
			}
		},
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'New Moon', '[from] ability: ' + effect.name, '[of] ' + source);
			} else {
				this.add('-weather', 'New Moon');
			}
		},
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'New Moon', '[upkeep]');
			if (this.field.isWeather('newmoon')) this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-weather', 'none');
		},
	},
};
