import { copyEngine, EFFECT_TABLES } from '../../../sim/dex-custom';
import { Scripts as Parent } from '../gen9insurgence/scripts';

export const Scripts: ModdedBattleScriptsData = {
	inherit: 'gen6',
	gen: 6,
	formeLinks: Parent.formeLinks,
	init() {
		Parent.init!.call(this);
		copyEngine(this, 'gen9insurgence', EFFECT_TABLES);
	},
};
