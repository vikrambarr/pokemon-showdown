import { Rulesets } from '../../pokeathlon-rulesets';

export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',
	init() {
		Object.assign(this.data.Rulesets, Rulesets);
	},
	actions: {
		runMegaEvo(pokemon) {
			const speciesid = pokemon.canMegaEvo || pokemon.canUltraBurst;
			if (!speciesid) return false;

			if (!this.battle.ruleTable.has('mixandmegamod')) pokemon.formeChange(speciesid, pokemon.getItem(), true);

			const wasMega = pokemon.canMegaEvo;
			for (const ally of pokemon.side.pokemon) {
				if (wasMega) {
					ally.canMegaEvo = false;
				} else {
					ally.canUltraBurst = null;
				}
			}

			this.battle.runEvent('AfterMega', pokemon);
			return true;
		},
	},
};
