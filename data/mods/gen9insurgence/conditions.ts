export const Conditions: import('../../../sim/dex-conditions').ModdedConditionDataTable = {
	wish: {
		name: 'Wish',
		duration: 2,
		onStart(pokemon, source) {
			this.effectState.hp = source.maxhp / 2;
		},
		onResidualOrder: 4,
		onEnd(target) {
			if (target && !target.fainted) {
				const damage = this.heal(this.effectState.hp, target, target);
				if (damage) {
					this.add('-heal', target, target.getHealth, '[from] move: Wish', '[wisher] ' + this.effectState.source.name);
				}
			}
		},
	},
	orbitalwish: {
		name: 'Orbital Wish',
		duration: 4,
		onStart(pokemon, source) {
			this.effectState.hp = source.maxhp / 2;
		},
		onResidualOrder: 4,
		onEnd(target) {
			if (target && !target.fainted) {
				const damage = this.heal(this.effectState.hp, target, target, this.dex.getActiveMove('Wish'));
				if (damage) {
					this.add('-heal', target, target.getHealth, '[from] move: Wish', '[wisher] ' + this.effectState.source.name);
				}
			}
		},
	},
	orbitalfuturemove: {
		name: 'orbitalfuturemove',
		duration: 5,
		onResidualOrder: 3,
		onEnd(target) {
			const data = this.effectState;
			const move = this.dex.moves.get(data.move);
			if (target.fainted || target === data.source) {
				this.hint(`${move.name} did not hit because the target is ${(target.fainted ? 'fainted' : 'the user')}.`);
				return;
			}

			this.add('-end', target, 'move: ' + move.name);
			target.removeVolatile('Protect');
			target.removeVolatile('Endure');

			if (data.source.hasAbility('infiltrator') && this.gen >= 6) {
				data.moveData.infiltrates = true;
			}
			if (data.source.hasAbility('normalize') && this.gen >= 6) {
				data.moveData.type = 'Normal';
			}
			const hitMove = new this.dex.Move(data.moveData) as ActiveMove;

			this.actions.trySpreadMoveHit([target], data.source, hitMove, true);
			if (data.source.isActive && data.source.hasItem('lifeorb') && this.gen >= 5) {
				this.singleEvent('AfterMoveSecondarySelf', data.source.getItem(), data.source.itemState, data.source, target, data.source.getItem());
			}
			this.activeMove = null;

			this.checkWin();
		},
	},
	hail: {
		inherit: true,
		onWeather(target) {
			let sleet = false;
			for (const pokemon of this.getAllActive()) if (pokemon.hasAbility('Sleet')) sleet = true;
			this.damage(target.baseMaxhp / (sleet ? 5 : 16));
		},
	},
	arceus: {
		inherit: true,
		onType(types, pokemon) {
			if (pokemon.transformed || pokemon.ability !== 'multitype') return types;
			let type: string | undefined = 'Normal';
			if (pokemon.ability === 'multitype') {
				type = pokemon.getItem().onPlate;
				if (!type) {
					type = 'Normal';
				}
			}
			return [type];
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
				this.add('-weather', 'NewMoon', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'NewMoon');
			}
		},
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'NewMoon', '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-weather', 'none');
		},
	},
};
