export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	darkvoid: {
		inherit: true,
		onTry(source, target, move) {
			if ([source.species.name, source.m.fusion].some(name => ['Darkrai', 'Antasma'].includes(name)) || move.hasBounced) {
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
			if ([pokemon.species.name, pokemon.m.fusion].some(name => name?.includes('Meloetta')) && !pokemon.transformed) {
				if (pokemon.species.baseSpecies.includes('Meloetta')) {
					let forme = '';
					if (pokemon.baseSpecies.baseSpecies === 'Meloetta') {
						forme = pokemon.species.id === 'meloettapirouette' ? '' : '-Pirouette';
					}
					if (pokemon.baseSpecies.baseSpecies === 'Meloetta-Delta') {
						forme = pokemon.species.id === 'meloettadeltamagician' ? '-Delta' : '-Delta-Magician';
					}
					pokemon.formeChange('Meloetta' + forme, this.effect, false, '0', '[msg]');
				} if (pokemon.m.fusion?.includes('Meloetta')) {
					let forme = '';
					if (this.dex.species.get(pokemon.m.fusion).baseSpecies === 'Meloetta') {
						forme = this.dex.species.get(pokemon.m.fusion).id === 'meloettapirouette' ? '' : '-Pirouette';
					}
					if (this.dex.species.get(pokemon.m.fusion).baseSpecies === 'Meloetta-Delta') {
						forme = this.dex.species.get(pokemon.m.fusion).id === 'meloettadeltamagician' ? '-Delta' : '-Delta-Magician';
					}
					pokemon.fusionChange('Meloetta' + forme, this.effect);
				}
			}
		},
	},
};
