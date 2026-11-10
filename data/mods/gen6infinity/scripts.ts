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
		for (const table of ['Moves', 'Abilities', 'Items', 'Conditions'] as const) {
			const data: AnyObject = this.data[table];
			for (const id in own[table]) {
				const entry = own[table][id];
				const original = base[table][id];
				if (entry === original) continue;
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
	actions: Parent.actions,
	pokemon: Parent.pokemon,
};
