import { Rulesets } from '../../pokeathlon-rulesets';

export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',
	init() {
		Object.assign(this.data.Rulesets, Rulesets);
	},
};
