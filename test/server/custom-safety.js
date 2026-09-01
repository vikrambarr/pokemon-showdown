'use strict';

const assert = require('assert').strict;

const { toCollection } = require('../../dist/server/custom/dex');
const { normalizeSpeciesData } = require('../../dist/server/custom/species/validator');
const { normalizeFormatData, toFormatData } = require('../../dist/server/custom/formats/validator');

const noNames = { otherNames: new Map(), ownerid: 'tester' };

function findFunctions(value, path = '') {
	if (typeof value === 'function') return [path];
	if (!value || typeof value !== 'object') return [];
	return Object.entries(value).flatMap(([key, entry]) => findFunctions(entry, `${path}.${key}`));
}

const SPECIES = { ...require('../custom-fixtures').species(), learnset: { tackle: ['9M'] } };

describe('Custom data stays data', () => {
	it('should refuse every species field that could hold code', () => {
		for (const field of ['onModifySpecies', 'onBegin', 'init', 'battle', 'scripts']) {
			assert.throws(() => normalizeSpeciesData({ ...SPECIES, [field]: '() => 1' }, noNames), Chat.ErrorMessage);
		}
		assert.throws(() => normalizeSpeciesData({ ...SPECIES, color: () => 'Red' }, noNames), Chat.ErrorMessage);
	});

	it('should refuse every format field that could hold code', () => {
		const fields = ['onBegin', 'onValidateSet', 'onValidateTeam', 'checkCanLearn', 'battle', 'team', 'init'];
		for (const field of fields) {
			assert.throws(
				() => normalizeFormatData({ name: 'X', base: '[Gen 9] OU', [field]: '() => 1' }, noNames),
				Chat.ErrorMessage
			);
		}
		assert.throws(
			() => normalizeFormatData({ name: 'X', base: '[Gen 9] OU', banlist: [() => 1] }, noNames),
			Chat.ErrorMessage
		);
	});

	it('should produce nothing callable', () => {
		const normalized = normalizeSpeciesData(SPECIES, noNames);
		const collection = toCollection([{
			name: normalized.name, num: -100001, inheritsfrom: null,
			species: normalized.species, learnset: normalized.learnset, sprites: {},
		}]);
		assert.deepEqual(findFunctions(collection), []);
		const format = toFormatData(normalizeFormatData({
			name: 'Custom OU', base: '[Gen 9] OU', ruleset: ['Same Type Clause'],
		}, noNames));
		assert.deepEqual(findFunctions(format), []);
		assert.deepEqual(Object.entries(new Dex.Format(format)).filter(([, v]) => typeof v === 'function'), []);
	});
});
