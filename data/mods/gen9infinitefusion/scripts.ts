import { Rulesets } from '../../pokeathlon-rulesets';
import { fusionMoves, mysteryGiftMoves } from './fusion-moves';

export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',
	fusionMoves,
	mysteryGiftMoves,
	init() {
		Object.assign(this.data.Rulesets, Rulesets);
	},
};
