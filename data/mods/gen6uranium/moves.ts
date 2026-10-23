export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	rest: {
		inherit: true,
		onTry(pokemon) {
			if (pokemon.hp < pokemon.maxhp) return;
			this.add('-fail', pokemon);
			return null;
		},
		onHit(target, source, move) {
			if (target.status !== 'slp') {
				if (!target.setStatus('slp', source, move)) return;
			} else {
				this.add('-status', target, 'slp', '[from] move: Rest');
			}
			target.statusState.time = 3;
			target.statusState.startTime = 3;
			target.statusState.source = target;
			this.heal(target.maxhp);
		},
	},
	sleeptalk: {
		inherit: true,
		onTryHit(pokemon) {
			return !pokemon.volatiles['choicelock'] && !pokemon.volatiles['encore'];
		},
		onHit(pokemon) {
			const moves = [];
			for (const moveSlot of pokemon.moveSlots) {
				const moveid = moveSlot.id;
				const move = this.dex.moves.get(moveid);
				if (moveid && !move.flags['nosleeptalk'] && !move.flags['charge']) {
					moves.push(moveid);
				}
			}
			let randomMove = '';
			if (moves.length) randomMove = this.sample(moves);
			if (!randomMove) return false;
			this.actions.useMove(randomMove, pokemon);
		},
	},
};
