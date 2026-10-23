export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	destinybond: {
		inherit: true,
		onPrepareHit(pokemon) {
			pokemon.removeVolatile('destinybond');
		},
	},
	photongeyser: {
		inherit: true,
		onPrepareHit(target, source, move) {
			if (source.hasItem('Necrozium')) {
				if (source.species.name === 'Necrozma' || (source.m.fusion && source.m.fusion === 'Necrozma')) {
					const abil = source.getAbility();
					if (source.species.name === 'Necrozma') {
						source.formeChange('Necrozma-Ultra', this.effect, true);
					} else {
						source.fusionChange('Necrozma-Ultra', this.effect);
					}
					if (abil && abil.id !== 'prismarmor') {
						source.ability = abil.id;
						source.baseAbility = abil.id;
						source.battle.add('-displayabilities', source, [source.ability, ...(source.m.activeInnates || [])].join(','), [source.baseAbility, ...(source.m.innates || [])].join(','));
					}
				}
			}
		},
	},
};
