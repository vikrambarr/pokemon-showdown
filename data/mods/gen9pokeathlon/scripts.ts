import { Rulesets } from '../../pokeathlon-rulesets';
import { fusionMoves } from '../gen9infinitefusion/fusion-moves';
import { PoAfusionMoves } from './fusion-moves';
import { Abilities } from '../gen9insurgence/abilities';
import { Moves } from '../gen9insurgence/moves';
import { Moves as Soulstones } from '../gen9soulstones/moves';

export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',
	fusionMoves: { ...fusionMoves, ...PoAfusionMoves },
	init() {
		Object.assign(this.data.Rulesets, Rulesets);
		Object.assign(this.data.Abilities, {
			etherealshroud: Abilities.etherealshroud, icecleats: Abilities.icecleats, phototroph: Abilities.phototroph,
			vampiric: Abilities.vampiric, vaporization: Abilities.vaporization,
		});
		Object.assign(this.data.Moves, {
			achillesheel: Moves.achillesheel, corrode: { ...Soulstones.corrode, pp: 10 }, dragonify: Moves.dragonify,
			jetstream: Moves.jetstream, lunarcannon: Moves.lunarcannon, medusaray: Moves.medusaray,
			permafrost: Moves.permafrost, wildfire: Moves.wildfire,
		});
	},
};
