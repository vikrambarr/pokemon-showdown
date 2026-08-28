'use strict';

const assert = require('assert').strict;

const { buildCustomDex, releaseCustomDex } = require('../../dist/sim/dex-custom');
const { mergeCollections, toCollection, MAX_PAYLOAD_BYTES } = require('../../dist/server/custom/dex');

function standalone(name, species = {}) {
	return {
		name, num: -100001, inheritsfrom: null,
		species: {
			name, types: ['Steel'], abilities: { 0: 'Levitate' },
			baseStats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
			eggGroups: ['Undiscovered'], weightkg: 10, ...species,
		},
		learnset: { tackle: ['9M'] },
	};
}

describe('Custom dex payloads', () => {
	it('should key entries by the id of their name', () => {
		const collection = toCollection([standalone('Test Mon')]);
		assert.deepEqual(Object.keys(collection.Pokedex), ['testmon']);
		assert.equal(collection.Pokedex.testmon.name, 'Test Mon');
		assert.equal(collection.Pokedex.testmon.isNonstandard, 'Custom');
		assert.equal(collection.FormatsData.testmon.isNonstandard, 'Custom');
		assert.deepEqual(collection.Learnsets.testmon.learnset.tackle, ['9M']);
	});

	it('should resolve a variant against the species it inherits from', () => {
		const collection = toCollection([{
			name: 'Garchomp-Steel', num: -100002, inheritsfrom: 'garchomp',
			species: { name: 'Garchomp-Steel', types: ['Dragon', 'Steel'] },
			learnset: { recover: ['9M'] },
		}]);
		const species = collection.Pokedex.garchompsteel;
		assert.deepEqual(species.types, ['Dragon', 'Steel']);
		assert.equal(species.baseStats.atk, Dex.species.get('Garchomp').baseStats.atk);
		assert.equal(species.num, -100002);
		const learnset = collection.Learnsets.garchompsteel.learnset;
		assert(learnset.recover);
		assert(learnset.dragonclaw);
	});

	it('should merge collections that do not overlap', () => {
		const merged = mergeCollections([
			toCollection([standalone('Alpha')]), toCollection([standalone('Beta')]),
		]);
		assert.deepEqual(Object.keys(merged.Pokedex).sort(), ['alpha', 'beta']);
	});

	it('should allow both players to bring the same Pokemon', () => {
		// Each owner's copy carries its own row id, which isn't a difference in the species.
		const theirs = { ...standalone('Shared'), num: -100002 };
		const merged = mergeCollections([toCollection([standalone('Shared')]), toCollection([theirs])]);
		assert.deepEqual(Object.keys(merged.Pokedex), ['shared']);
	});

	it('should refuse two same-named Pokemon that differ only in their learnset', () => {
		const theirs = { ...standalone('Shared'), learnset: { recover: ['9M'] } };
		assert.throws(
			() => mergeCollections([toCollection([standalone('Shared')]), toCollection([theirs])]),
			Chat.ErrorMessage
		);
	});

	it('should refuse to merge two different Pokemon with the same name', () => {
		assert.throws(() => mergeCollections([
			toCollection([standalone('Clash')]),
			toCollection([standalone('Clash', { types: ['Fire'] })]),
		]), Chat.ErrorMessage);
	});

	it('should refuse a payload too large for a battle', () => {
		const huge = standalone('Huge', { tags: Array.from({ length: 8000 }, () => 'padding') });
		assert.throws(() => mergeCollections([toCollection([huge])]), Chat.ErrorMessage);
		assert(JSON.stringify(toCollection([huge])).length > MAX_PAYLOAD_BYTES);
	});

	it('should produce a payload a battle dex can use', () => {
		const merged = mergeCollections([toCollection([standalone('Test Mon')])]);
		const dex = buildCustomDex(merged, 'gen9');
		const species = dex.species.get('Test Mon');
		assert(species.exists);
		assert.equal(species.isNonstandard, 'Custom');
		assert.deepEqual(dex.species.getLearnsetData('testmon').learnset.tackle, ['9M']);
		releaseCustomDex(dex);
	});
});

describe('Custom dex reuse', () => {
	it('should hand the same dex to everyone building from the same data', () => {
		const payload = mergeCollections([toCollection([standalone('Shared Mon')])]);
		const first = buildCustomDex(payload, 'gen9');
		// A separate but identical payload, as the two validations of one challenge produce.
		const second = buildCustomDex(mergeCollections([toCollection([standalone('Shared Mon')])]), 'gen9');
		assert.equal(first, second);
		releaseCustomDex(first);
		releaseCustomDex(second);
	});

	it('should build a separate dex per base mod', () => {
		const payload = mergeCollections([toCollection([standalone('Modded Mon')])]);
		const gen9 = buildCustomDex(payload, 'gen9');
		const gen8 = buildCustomDex(payload, 'gen8');
		assert.notEqual(gen9, gen8);
		releaseCustomDex(gen9);
		releaseCustomDex(gen8);
	});

	it('should keep a shared dex alive until the last holder releases it', () => {
		const payload = mergeCollections([toCollection([standalone('Counted Mon')])]);
		const first = buildCustomDex(payload, 'gen9');
		const second = buildCustomDex(payload, 'gen9');
		const mod = first.currentMod;
		releaseCustomDex(first);
		assert.equal(Dex.dexes[mod], first, `released too early`);
		releaseCustomDex(second);
		assert.equal(Dex.dexes[mod], undefined, `not released by the last holder`);
	});

	it('should ignore a release for a dex it never built', () => {
		assert.doesNotThrow(() => releaseCustomDex(Dex.mod('gen9')));
		assert(Dex.dexes['gen9']);
	});
});
