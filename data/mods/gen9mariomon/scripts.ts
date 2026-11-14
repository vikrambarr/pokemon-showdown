import { Rulesets } from '../../pokeathlon-rulesets';

export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',
	engineRules: ['Frostbite Mod'],
	forecastFormes: { boomerangbro: ['raindance', 'primordialsea'] },
	init() {
		Object.assign(this.data.Rulesets, Rulesets);
		this.data.Conditions.frb = this.mod('gen9soulstones').data.Conditions.frb;
		this.data.Rulesets.frostbitemod = this.mod('gen9soulstones').data.Rulesets.frostbitemod;
	},
};
