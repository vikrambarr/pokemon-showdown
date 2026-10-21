import { Dex, toID, type DexTable, type ModdedDex } from './dex';
import type { Format, FormatData } from './dex-formats';
import type { LearnsetData, SpeciesData, SpeciesFormatsData } from './dex-species';

export interface DexData {
	hash: string;
	mod: string;
	species: string[];
	Pokedex: DexTable<SpeciesData>;
	Learnsets: DexTable<LearnsetData>;
	FormatsData: DexTable<SpeciesFormatsData>;
	format?: FormatData;
}

const built = new Map<string, { dex: ModdedDex, base: ModdedDex, refs: number }>();

export function buildDex(data: DexData, base = Dex) {
	const id = `dex${data.hash}`;
	const cached = built.get(id);
	if (cached) {
		cached.refs++;
		return cached.dex;
	}
	const parent = base.mod(data.mod);
	const species = new Set(data.species);
	const dex = new base.ModdedDex(id);
	dex.parentMod = parent.currentMod;
	dex.gen = parent.gen;
	dex.dataCache = {
		...parent.data,
		Pokedex: { ...parent.data.Pokedex, ...data.Pokedex },
		Learnsets: { ...parent.data.Learnsets, ...data.Learnsets },
		FormatsData: { ...parent.data.FormatsData, ...data.FormatsData },
		Rulesets: {
			...parent.data.Rulesets,
			dexpokemon: {
				effectType: 'ValidatorRule',
				name: 'Dex Pokemon',
				desc: "Only Pok&eacute;mon in this dex can be used",
				onValidateSet(set) {
					const { outOfBattleSpecies, tierSpecies } = this.getValidationSpecies(set);
					for (const forme of [outOfBattleSpecies, tierSpecies]) {
						if (!species.has(forme.isCosmeticForme ? toID(forme.baseSpecies) : forme.id)) {
							return [`${forme.name} isn't in this dex.`];
						}
					}
				},
			},
			dexsnapshot: {
				effectType: 'Rule',
				name: 'Dex Snapshot',
				onBegin() {
					this.add('dex', data.hash);
				},
			},
		},
	};
	base.dexes[id] = dex;
	built.set(id, { dex, base, refs: 1 });
	return dex;
}

export function releaseDex(dex: ModdedDex) {
	const cached = built.get(dex.currentMod);
	if (!cached || --cached.refs > 0) return;
	built.delete(dex.currentMod);
	delete cached.base.dexes[dex.currentMod];
}

export function buildFormat(dex: ModdedDex, formatData: FormatData): Format {
	const ruleset = ['Dex Pokemon', 'Dex Snapshot', ...formatData.ruleset || []];
	return new dex.Format({ ...formatData, effectType: 'Format', mod: dex.currentMod, ruleset, baseRuleset: ruleset });
}
