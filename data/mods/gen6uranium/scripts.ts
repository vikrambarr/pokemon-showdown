import { copyEngine, EFFECT_TABLES } from '../../../sim/dex-custom';
import { Scripts as Parent } from '../gen9uranium/scripts';

export const Scripts: ModdedBattleScriptsData = {
	inherit: 'gen6',
	gen: 6,
	init() {
		Parent.init!.call(this);
		copyEngine(this, 'gen9uranium', EFFECT_TABLES);
	},
	queue: Parent.queue,
};
