import { copyEngine, EFFECT_TABLES } from '../../../sim/dex-custom';
import { Scripts as Parent } from '../gen9infinity/scripts';

export const Scripts: ModdedBattleScriptsData = {
	inherit: 'gen6',
	gen: 6,
	init() {
		Parent.init!.call(this);
		const own: AnyObject = this.mod('gen9infinity').data;
		const base: AnyObject = this.mod('gen9').data;
		for (const id in base.Moves) {
			if (own.Moves[id] === base.Moves[id]) this.data.Moves[id] = { ...base.Moves[id], gen: 6, isNonstandard: null };
		}
		copyEngine(this, 'gen9infinity', EFFECT_TABLES);
	},
};
