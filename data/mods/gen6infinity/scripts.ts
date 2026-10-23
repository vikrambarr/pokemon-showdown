import type { MoveData } from '../../../sim/dex-moves';
import { Moves as Base } from '../../moves';
import { Abilities } from '../gen9infinity/abilities';
import { Conditions } from '../gen9infinity/conditions';
import { Items } from '../gen9infinity/items';
import { Moves } from '../gen9infinity/moves';
import { Scripts as Parent } from '../gen9infinity/scripts';

export const Scripts: ModdedBattleScriptsData = {
	inherit: 'gen6',
	gen: 6,
	init() {
		Parent.init!.call(this);
		for (const key in Base) {
			const id = key as keyof typeof Base;
			if (!Moves[id]) this.data.Moves[id] = { ...Base[id], gen: 6, isNonstandard: null } as MoveData;
		}
		const tables: { [table: string]: AnyObject } = { Moves, Abilities, Items, Conditions };
		for (const table in tables) {
			const data: AnyObject = this.data[table as 'Moves'];
			for (const id in tables[table]) {
				const { inherit, ...entry } = tables[table][id];
				data[id] = inherit ? { ...data[id], ...entry } : entry;
			}
		}
	},
	actions: Parent.actions,
	pokemon: Parent.pokemon,
};
