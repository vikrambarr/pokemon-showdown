import { Rulesets } from '../../pokeathlon-rulesets';

export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',
	engineRules: ['Frostbite Mod', 'Soulstones Mod'],
	init() {
		Object.assign(this.data.Rulesets, Rulesets);
	},
};
