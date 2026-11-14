import { Rulesets } from '../../pokeathlon-rulesets';
import { Moves as Soulstones } from '../gen9soulstones/moves';

export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',
	formeLinks: { meloettadeltamagician: { battleOnly: 'Meloetta-Delta', requiredMove: 'Relic Song' } },
	init() {
		Object.assign(this.data.Rulesets, Rulesets);
		Object.assign(this.data.Moves, { corrode: { ...Soulstones.corrode, pp: 10 } });
	},
};
