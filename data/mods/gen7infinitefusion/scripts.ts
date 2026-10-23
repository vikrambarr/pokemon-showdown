import { Abilities } from '../gen9infinitefusion/abilities';
import { Items } from '../gen9infinitefusion/items';
import { Moves } from '../gen9infinitefusion/moves';
import { Scripts as Parent } from '../gen9infinitefusion/scripts';

export const Scripts: ModdedBattleScriptsData = {
	inherit: 'gen7',
	gen: 7,
	init() {
		Parent.init!.call(this);
		const tables: { [table: string]: AnyObject } = { Moves, Abilities, Items };
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
};
