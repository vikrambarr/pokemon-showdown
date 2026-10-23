import { Abilities } from '../gen9uranium/abilities';
import { Conditions } from '../gen9uranium/conditions';
import { Items } from '../gen9uranium/items';
import { Moves } from '../gen9uranium/moves';
import { Scripts as Parent } from '../gen9uranium/scripts';
import { TypeChart } from '../gen9uranium/typechart';

export const Scripts: ModdedBattleScriptsData = {
	inherit: 'gen6',
	gen: 6,
	init() {
		Parent.init!.call(this);
		const tables: { [table: string]: AnyObject } = { Moves, Abilities, Items, Conditions, TypeChart };
		for (const table in tables) {
			const data: AnyObject = this.data[table as 'Moves'];
			const parent: AnyObject = this.mod(this.parentMod).data[table as 'Moves'];
			for (const id in tables[table]) {
				if (data[id] !== parent[id]) continue;
				const { inherit, ...entry } = tables[table][id];
				data[id] = inherit ? { ...data[id], ...entry } : entry;
			}
		}
	},
	pokemon: Parent.pokemon,
	queue: Parent.queue,
};
