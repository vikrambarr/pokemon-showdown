import { Abilities } from '../gen9insurgence/abilities';
import { Conditions } from '../gen9insurgence/conditions';
import { Items } from '../gen9insurgence/items';
import { Moves } from '../gen9insurgence/moves';
import { Scripts as Parent } from '../gen9insurgence/scripts';

export const Scripts: ModdedBattleScriptsData = {
	inherit: 'gen6',
	gen: 6,
	init() {
		Parent.init!.call(this);
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
