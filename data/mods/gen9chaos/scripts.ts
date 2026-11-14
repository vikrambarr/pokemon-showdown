import { Scripts as Insurgence } from '../gen9insurgence/scripts';
import { Scripts as Mariomon } from '../gen9mariomon/scripts';
import { Scripts as Pokeathlon } from '../gen9pokeathlon/scripts';

const MODS = ['gen9pokeathlon', 'gen9insurgence', 'gen9uranium', 'gen9infinity', 'gen9mariomon', 'gen9infinitefusion'];
const EXCLUDED: { [mod: string]: { [table: string]: string[] } } = {
	gen9insurgence: { Abilities: ['illusion'] },
	gen9uranium: { Abilities: ['illusion'] },
	gen9infinity: { Moves: ['strength', 'cut', 'wildcharge', 'rocksmash', 'skydrop'] },
	gen9mariomon: { Conditions: ['frz'] },
};

export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',
	fusionMoves: Pokeathlon.fusionMoves,
	forecastFormes: Mariomon.forecastFormes,
	formeLinks: Insurgence.formeLinks,
	init() {
		const base: AnyObject = this.mod('gen9').data;
		const tables = ['Moves', 'Abilities', 'Items', 'Conditions', 'Rulesets'] as const;
		const own = new Set(tables.flatMap(table => Object.keys(this.data[table])
			.filter(id => this.data[table][id] !== base[table][id]).map(id => `${table}:${id}`)));
		const taken = new Map<string, Set<string>>();
		for (const mod of MODS) {
			const data: AnyObject = this.mod(mod).data;
			for (const table of tables) {
				const target: AnyObject = this.data[table];
				for (const id in data[table]) {
					const entry = data[table][id];
					const original = base[table][id];
					const key = `${table}:${id}`;
					if (entry === original || own.has(key) || EXCLUDED[mod]?.[table]?.includes(id)) continue;
					if (mod === 'gen9pokeathlon') {
						target[id] = entry;
						own.add(key);
						continue;
					}
					if (!taken.has(key)) {
						taken.set(key, new Set());
						target[id] = { ...original };
					}
					for (const attr in entry) {
						if (['isNonstandard', 'num', 'gen'].includes(attr) || taken.get(key)!.has(attr) ||
							entry[attr] === original?.[attr]) continue;
						target[id][attr] = entry[attr];
						taken.get(key)!.add(attr);
					}
				}
			}
		}
	},
};
