/**
 * Custom Dex
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * A battle using user-authored data gets its own dex, built from a payload
 * carried by the battle itself rather than from files, so the simulator never
 * has to look anything up outside the battle it's running.
 *
 * @license MIT
 */

import { Dex, type DexTable, ModdedDex } from './dex';
import type { Format, FormatData } from './dex-formats';
import type { LearnsetData, SpeciesData, SpeciesFormatsData } from './dex-species';

const MOD_PREFIX = 'custom-';

export interface CustomDexPayload {
	Pokedex?: DexTable<SpeciesData>;
	Learnsets?: DexTable<LearnsetData>;
	FormatsData?: DexTable<SpeciesFormatsData>;
	format?: FormatData;
}

let customDexCount = 0;

/**
 * Built dexes, by the data they were built from. Copying the parent's tables costs
 * a few hundred KB and runs on every `>start` *and* every team validation, so the
 * two validations and the battle that make up one challenge share a single dex, as
 * do the games of a best-of series and any rematch on the same data.
 */
const dexCache = new Map<string, { dex: ModdedDex, refs: number }>();
/** `Battle#destroy` hands back a dex, not the payload it came from. */
const cacheKeys = new Map<string, string>();

export function buildCustomDex(payload: CustomDexPayload, baseMod?: string) {
	// The format rides along in the payload but contributes nothing to the dex.
	const key = `${baseMod || ''}|${JSON.stringify([payload.Pokedex, payload.Learnsets, payload.FormatsData])}`;
	const cached = dexCache.get(key);
	if (cached) {
		cached.refs++;
		return cached.dex;
	}
	const parent = Dex.mod(baseMod);
	const dex = new ModdedDex(`${MOD_PREFIX}${++customDexCount}`);
	dex.parentMod = parent.currentMod;
	dex.gen = parent.gen;
	// Only the tables the payload touches are copied; the rest are shared with the parent.
	dex.dataCache = {
		...parent.data,
		Pokedex: { ...parent.data.Pokedex, ...payload.Pokedex },
		Learnsets: { ...parent.data.Learnsets, ...payload.Learnsets },
		FormatsData: { ...parent.data.FormatsData, ...payload.FormatsData },
	} as ModdedDex['dataCache'];
	Dex.dexes[dex.currentMod] = dex;
	dexCache.set(key, { dex, refs: 1 });
	cacheKeys.set(dex.currentMod, key);
	return dex;
}

/** Called by `Battle#destroy`, and by the validator process once it's done with the dex. */
export function releaseCustomDex(dex: ModdedDex) {
	const key = cacheKeys.get(dex.currentMod);
	if (!key) return;
	const cached = dexCache.get(key);
	if (cached && --cached.refs > 0) return;
	dexCache.delete(key);
	cacheKeys.delete(dex.currentMod);
	delete Dex.dexes[dex.currentMod];
}

/** Points `options.format` at a dex holding the payload's data. Must run before `new Battle`. */
export function attachCustomDex(options: {
	formatid?: string, format?: Format, customData: CustomDexPayload,
}) {
	const base = options.customData.format || options.format || Dex.formats.get(options.formatid, true);
	const dex = buildCustomDex(options.customData, base.mod);
	const format = new Dex.Format({ ...base, effectType: 'Format', mod: dex.currentMod });
	options.format = format;
	return { dex, format };
}
