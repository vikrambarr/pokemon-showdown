import { Abilities } from '../champions/abilities';
import { Conditions } from '../champions/conditions';
import { Items } from '../champions/items';
import { Moves } from '../champions/moves';
import { Scripts as Champions } from '../champions/scripts';

export const Scripts: ModdedBattleScriptsData = {
	...Champions,
	inherit: 'gen9mariomon',
	init() {
		const tables: { [table: string]: AnyObject } = { Moves, Abilities, Items, Conditions };
		const text = (value: unknown) => JSON.stringify(value, (key, part) => (typeof part === 'function' ? `${part}` : part));
		const changed = (entry: AnyObject, official: AnyObject = {}) => Object.fromEntries(
			Object.entries(entry).filter(([key, value]) => key !== 'isNonstandard' && text(value) !== text(official[key]))
		);
		for (const table in this.currentMod === 'championsmariomon' ? tables : {}) {
			const data: AnyObject = this.data[table as 'Moves'];
			const champions: AnyObject = this.mod('champions').data[table as 'Moves'];
			const official: AnyObject = this.mod('gen9').data[table as 'Moves'];
			for (const id in tables[table]) {
				const entry = changed(champions[id], official[id]);
				const condition = official[id]?.condition;
				if (entry.condition && condition && Object.keys(condition).every(key => key in entry.condition)) {
					entry.condition = { ...data[id].condition, ...changed(entry.condition, condition) };
				}
				data[id] = { ...data[id], ...entry };
			}
		}
		Champions.init!.call(this);
		for (const id in this.data.Pokedex) {
			let prevo = this.data.Pokedex[id].prevo;
			if (!prevo || !this.data.Learnsets[id]?.learnset) continue;
			const learnset = this.modData('Learnsets', id).learnset;
			while (prevo) {
				const prevoid = this.toID(prevo);
				for (const [moveid, sources] of Object.entries(this.data.Learnsets[prevoid]?.learnset || {})) {
					learnset[moveid] ||= sources;
				}
				prevo = this.data.Pokedex[prevoid]?.prevo;
			}
		}
	},
	pokemon: {
		...Champions.pokemon,
		inherit: true,
	},
	actions: {
		...Champions.actions,
		inherit: true,
	},
};
