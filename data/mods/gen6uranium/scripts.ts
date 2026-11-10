import { Scripts as Parent } from '../gen9uranium/scripts';

export const Scripts: ModdedBattleScriptsData = {
	inherit: 'gen6',
	gen: 6,
	init() {
		Parent.init!.call(this);
		const own: AnyObject = this.mod('gen9uranium').data;
		const base: AnyObject = this.mod('gen9').data;
		for (const table of ['Moves', 'Abilities', 'Items', 'Conditions', 'TypeChart'] as const) {
			const data: AnyObject = this.data[table];
			const parent: AnyObject = this.mod(this.parentMod).data[table];
			for (const id in own[table]) {
				const entry = own[table][id];
				const original = base[table][id];
				if (entry === original || data[id] !== parent[id]) continue;
				if (!original || Object.keys(original).some(key => !(key in entry))) {
					data[id] = entry;
					continue;
				}
				data[id] = { ...data[id] };
				for (const key in entry) {
					if (entry[key] !== original[key]) data[id][key] = entry[key];
				}
			}
		}
	},
	pokemon: Parent.pokemon,
	queue: Parent.queue,
};
