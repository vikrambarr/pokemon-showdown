import { BattleQueue } from '../../../sim/battle-queue';
import { Scripts as Insurgence } from '../gen9insurgence/scripts';
import { Rulesets } from '../../pokeathlon-rulesets';

const ORDERS: { [choice: string]: number } = {
	megaEvo: 101, megaEvoX: 101, megaEvoY: 101, runSwitch: 102, switch: 104,
};

export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',
	init() {
		Object.assign(this.data.Rulesets, Rulesets);
	},
	pokemon: {
		formeChange: Insurgence.pokemon!.formeChange,
	},
	queue: {
		resolveAction(action, midTurn) {
			const actions = BattleQueue.prototype.resolveAction.call(this, action, midTurn);
			for (const entry of actions) {
				if (ORDERS[entry.choice]) (entry as { order: number }).order = ORDERS[entry.choice];
			}
			return actions;
		},
	},
};
