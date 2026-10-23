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
		onResidualOrder: 10,
		onResidual(pokemon) {
			this.damage(pokemon.baseMaxhp / 16);
		},
	},
	raindance: {
		inherit: true,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'RainDance', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'RainDance');
			}
			for (const target of this.getAllPokemon()) {
				for (const move of target.moveSlots) {
					if (['hammerthrow', 'boomerang', 'fireball', 'icetoss'].includes(move.id) && target.species.id === 'hammerbro') {
						move.id = 'boomerang' as ID;
						move.move = 'Boomerang';
					}
				}
			}
		},
		onFieldEnd() {
			for (const target of this.getAllPokemon()) {
				for (const move of target.moveSlots) {
					if (['hammerthrow', 'boomerang', 'fireball', 'icetoss'].includes(move.id) && target.species.id === 'hammerbro') {
						move.id = 'hammerthrow' as ID;
						move.move = 'Hammer Throw';
					}
				}
			}
			this.add('-weather', 'none');
		},
	},
	primordialsea: {
		inherit: true,
		onFieldStart(field, source, effect) {
			this.add('-weather', 'PrimordialSea', '[from] ability: ' + effect.name, `[of] ${source}`);
			for (const target of this.getAllPokemon()) {
				for (const move of target.moveSlots) {
					if (['hammerthrow', 'boomerang', 'fireball', 'icetoss'].includes(move.id) && target.species.id === 'hammerbro') {
						move.id = 'boomerang' as ID;
						move.move = 'Boomerang';
					}
				}
			}
		},
		onFieldEnd() {
			for (const target of this.getAllPokemon()) {
				for (const move of target.moveSlots) {
					if (['hammerthrow', 'boomerang', 'fireball', 'icetoss'].includes(move.id) && target.species.id === 'hammerbro') {
						move.id = 'hammerthrow' as ID;
						move.move = 'Hammer Throw';
					}
				}
			}
			this.add('-weather', 'none');
		},
	},
	sunnyday: {
		inherit: true,
		onFieldStart(battle, source, effect) {
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'SunnyDay', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'SunnyDay');
			}
			for (const target of this.getAllPokemon()) {
				for (const move of target.moveSlots) {
					if (['hammerthrow', 'boomerang', 'fireball', 'icetoss'].includes(move.id) && target.species.id === 'hammerbro') {
						move.id = 'fireball' as ID;
						move.move = 'Fire Ball';
					}
				}
			}
		},
		onFieldEnd() {
			for (const target of this.getAllPokemon()) {
				for (const move of target.moveSlots) {
					if (['hammerthrow', 'boomerang', 'fireball', 'icetoss'].includes(move.id) && target.species.id === 'hammerbro') {
						move.id = 'hammerthrow' as ID;
						move.move = 'Hammer Throw';
					}
				}
			}
			this.add('-weather', 'none');
		},
	},
	desolateland: {
		inherit: true,
		onFieldStart(field, source, effect) {
			this.add('-weather', 'DesolateLand', '[from] ability: ' + effect.name, `[of] ${source}`);
			for (const target of this.getAllPokemon()) {
				for (const move of target.moveSlots) {
					if (['hammerthrow', 'boomerang', 'fireball', 'icetoss'].includes(move.id) && target.species.id === 'hammerbro') {
						move.id = 'fireball' as ID;
						move.move = 'Fire Ball';
					}
				}
			}
		},
		onFieldEnd() {
			for (const target of this.getAllPokemon()) {
				for (const move of target.moveSlots) {
					if (['hammerthrow', 'boomerang', 'fireball', 'icetoss'].includes(move.id) && target.species.id === 'hammerbro') {
						move.id = 'hammerthrow' as ID;
						move.move = 'Hammer Throw';
					}
				}
			}
			this.add('-weather', 'none');
		},
	},
	hail: {
		inherit: true,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'Hail', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'Hail');
			}
			for (const target of this.getAllPokemon()) {
				for (const move of target.moveSlots) {
					if (['hammerthrow', 'boomerang', 'fireball', 'icetoss'].includes(move.id) && target.species.id === 'hammerbro') {
						move.id = 'icetoss' as ID;
						move.move = 'Ice Toss';
					}
				}
			}
		},
		onFieldEnd() {
			for (const target of this.getAllPokemon()) {
				for (const move of target.moveSlots) {
					if (['hammerthrow', 'boomerang', 'fireball', 'icetoss'].includes(move.id) && target.species.id === 'hammerbro') {
						move.id = 'hammerthrow' as ID;
						move.move = 'Hammer Throw';
					}
				}
			}
			this.add('-weather', 'none');
		},
	},
	snowscape: {
		inherit: true,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'Snowscape', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'Snowscape');
			}
			for (const target of this.getAllPokemon()) {
				for (const move of target.moveSlots) {
					if (['hammerthrow', 'boomerang', 'fireball', 'icetoss'].includes(move.id) && target.species.id === 'hammerbro') {
						move.id = 'icetoss' as ID;
						move.move = 'Ice Toss';
					}
				}
			}
		},
		onFieldEnd() {
			for (const target of this.getAllPokemon()) {
				for (const move of target.moveSlots) {
					if (['hammerthrow', 'boomerang', 'fireball', 'icetoss'].includes(move.id) && target.species.id === 'hammerbro') {
						move.id = 'hammerthrow' as ID;
						move.move = 'Hammer Throw';
					}
				}
			}
			this.add('-weather', 'none');
		},
	},
};
