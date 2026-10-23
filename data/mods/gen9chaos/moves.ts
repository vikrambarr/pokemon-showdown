export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	darkvoid: {
		inherit: true,
		onTry(source, target, move) {
			if (['Darkrai', 'Antasma'].includes(source.species.name) || move.hasBounced) {
				return;
			}
			this.add('-fail', source, 'move: Dark Void');
			this.hint("Only a Pokemon whose form or fusion is Darkrai can use this move.");
			return null;
		},
	},
	relicsong: {
		inherit: true,
		onAfterMoveSecondarySelf(pokemon) {
			if (pokemon.species.name.includes('Meloetta') && !pokemon.transformed) {
				let forme = '';
				if (pokemon.baseSpecies.baseSpecies === 'Meloetta') {
					forme = pokemon.species.id === 'meloettapirouette' ? '' : '-Pirouette';
				}
				if (pokemon.baseSpecies.baseSpecies === 'Meloetta-Delta') {
					forme = pokemon.species.id === 'meloettadeltamagician' ? '-Delta' : '-Delta-Magician';
				}
				pokemon.formeChange('Meloetta' + forme, this.effect, false, '0', '[msg]');
			}
		},
	},
};
