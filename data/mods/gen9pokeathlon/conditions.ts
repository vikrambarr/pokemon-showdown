export const Conditions: import('../../../sim/dex-conditions').ModdedConditionDataTable = {
	preventswitch: {
		name: 'preventswitch',
		onSwitchOutPriority: 100,
		onSwitchOut(pokemon) {
			pokemon.removeVolatile('preventswitch');
			return false;
		},
	},
	tenkibo: {
		name: 'Tenkibo',
		onSwitchIn(pokemon) {
			if (pokemon.species.id !== 'tenkibo') return;
			const moveIndex = pokemon.baseMoves.indexOf('starlightblast' as ID);
			if (moveIndex >= 0) {
				const move = this.dex.moves.get('starlightcalling');
				pokemon.baseMoveSlots[moveIndex] = {
					move: move.name,
					id: move.id,
					pp: pokemon.baseMoveSlots[moveIndex].pp,
					maxpp: move.noPPBoosts ? move.pp : move.pp * 8 / 5,
					target: move.target,
					disabled: false,
					disabledSource: '',
					used: false,
				};
				pokemon.moveSlots = pokemon.baseMoveSlots.slice();
			}
		},
	},
	confusion: {
		inherit: true,
		onBeforeMove(pokemon, target, move) {
			if (move.id === 'ringtrue') return;
			pokemon.volatiles['confusion'].time--;
			if (!pokemon.volatiles['confusion'].time) {
				pokemon.removeVolatile('confusion');
				return;
			}
			this.add('-activate', pokemon, 'confusion');
			if (!this.randomChance(33, 100)) {
				return;
			}
			this.activeTarget = pokemon;
			const damage = this.actions.getConfusionDamage(pokemon, 40);
			if (typeof damage !== 'number') throw new Error("Confusion damage not dealt");
			const activeMove = { id: this.toID('confused'), effectType: 'Move', type: '???' };
			this.damage(damage, pokemon, pokemon, activeMove as ActiveMove);
			return false;
		},
	},
	choicelock: {
		inherit: true,
		onBeforeMove(pokemon, target, move) {
			if (!pokemon.getItem().isChoice) {
				pokemon.removeVolatile('choicelock');
				return;
			}
			if (
				!pokemon.ignoringItem() && !pokemon.volatiles['dynamax'] &&
				move.id !== this.effectState.move && move.id !== 'struggle' && move.id !== 'ringtrue'
			) {
				this.addMove('move', pokemon, move.name);
				this.attrLastMove('[still]');
				this.debug("Disabled by Choice item lock");
				this.add('-fail', pokemon);
				return false;
			}
		},
	},
	scatteredcoins: {
		name: 'Scattered Coins',
		noCopy: true,
		onSideStart(side, source, sourceEffect) {
			this.add('-sidestart', side, 'move: Scattered Coins');
		},
		onSideEnd(side) {
			this.add('-sideend', side, 'move: Scattered Coins');
		},
	},
	luckycharm: {
		name: 'Lucky Charm',
		noCopy: true,
		onSideStart(side, source, sourceEffect) {
			this.add('-sidestart', side, 'ability: Lucky Charm');
		},
		onModifySecondaries(secondaries) {
			this.debug('Lucky Charm prevent secondary');
			return secondaries.filter(effect => !!effect.self);
		},
		onSideEnd(side) {
			this.add('-sideend', side, 'ability: Lucky Charm');
		},
		onCriticalHit: false,
	},
};
