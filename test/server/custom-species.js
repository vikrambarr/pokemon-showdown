'use strict';

/**
 * The species validator is the trust boundary: everything here is something a
 * user could hand `/custompokemon create` that must not reach the database.
 */

const assert = require('assert').strict;

const { bst, normalizeSpeciesData, resolveSpecies } = require('../../dist/server/custom/species/validator');

const noNames = { otherNames: new Map() };

const SPECIES = {
	name: 'Testmon', types: ['Steel'], abilities: { 0: 'Levitate' },
	baseStats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
	eggGroups: ['Undiscovered'], weightkg: 10,
};

describe('Custom species validation', () => {
	it('should hold a standalone entry to the base stat total limit', () => {
		const baseStats = { ...SPECIES.baseStats, hp: 255, atk: 255 };
		assert.throws(() => normalizeSpeciesData({ ...SPECIES, baseStats }, noNames), Chat.ErrorMessage);
	});

	it('should hold an inherited entry to the same limit', () => {
		// Nothing is overridden, so the only stats to check are the ones Eternamax brings.
		assert.throws(
			() => normalizeSpeciesData({ name: 'Doomchomp', inheritsFrom: 'Eternatus-Eternamax' }, noNames),
			Chat.ErrorMessage
		);
		assert.equal(normalizeSpeciesData({ name: 'Chompmax', inheritsFrom: 'Garchomp' }, noNames).name, 'Chompmax');
	});

	it('should let an over-budget base be overridden down to a legal total', () => {
		const normalized = normalizeSpeciesData(
			{ name: 'Doomchomp', inheritsFrom: 'Eternatus-Eternamax', baseStats: SPECIES.baseStats }, noNames
		);
		assert.equal(normalized.inheritsFrom, 'eternatuseternamax');
	});

	it('should refuse a baseSpecies that is not a real species', () => {
		// `Dex.species.get` reads tags and tiers off the base entry without checking it exists.
		assert.throws(() => normalizeSpeciesData({ ...SPECIES, baseSpecies: 'Nope' }, noNames), Chat.ErrorMessage);
		const normalized = normalizeSpeciesData({ ...SPECIES, baseSpecies: 'Charizard' }, noNames);
		assert.equal(normalized.species.baseSpecies, 'Charizard');
	});
});

describe('Custom species inheritance', () => {
	const variant = (species = {}, inheritsfrom = 'garchomp') => resolveSpecies({
		num: -100001, inheritsfrom, learnset: {}, species: { name: 'Chompy', ...species },
	});

	it('should carry over every field of the base it does not override', () => {
		const resolved = variant({ types: ['Dragon', 'Steel'] });
		const base = Dex.data.Pokedex.garchomp;
		assert.deepEqual(resolved.types, ['Dragon', 'Steel']);
		assert.deepEqual(resolved.baseStats, base.baseStats);
		assert.deepEqual(resolved.abilities, base.abilities);
		assert.equal(resolved.color, base.color);
		assert.equal(resolved.heightm, base.heightm);
		// Fields the old hand-written inherit list dropped on the floor.
		assert.deepEqual(resolved.genderRatio, base.genderRatio);
		assert.equal(resolved.evoLevel, base.evoLevel);
		assert.equal(resolved.prevo, base.prevo);
	});

	it('should keep its own identity rather than the base entry`s', () => {
		const resolved = variant();
		assert.equal(resolved.name, 'Chompy');
		assert.equal(resolved.num, -100001);
	});

	it('should not inherit a place in the official forme graph', () => {
		const resolved = variant({}, 'garchompmega');
		const base = Dex.data.Pokedex.garchompmega;
		// The base really does carry these, so the test would pass vacuously without them.
		assert.equal(base.baseSpecies, 'Garchomp');
		assert(base.requiredItem);
		assert.equal(resolved.baseSpecies, undefined);
		assert.equal(resolved.forme, undefined);
		assert.equal(resolved.requiredItem, undefined);
		assert.equal(resolved.changesFrom, undefined);
		// Its stats still come from the forme it was built on.
		assert.deepEqual(resolved.baseStats, base.baseStats);
	});

	it('should still let an override set a forme field explicitly', () => {
		assert.equal(variant({ baseSpecies: 'Charizard' }).baseSpecies, 'Charizard');
	});

	it('should compute base stat totals the way the dex does', () => {
		assert.equal(bst(variant()), Dex.species.get('Garchomp').bst);
		assert.equal(bst({ name: 'Statless' }), 0);
	});
});
