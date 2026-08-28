'use strict';

/**
 * User-authored data is data. If someone widens a whitelist to a field that can
 * hold code, these fail.
 */

const assert = require('assert').strict;

const { toCollection } = require('../../dist/server/custom/dex');
const { normalizeSpeciesData } = require('../../dist/server/custom/species/validator');
const {
	normalizeFormatData, toFormatData,
} = require('../../dist/server/custom/formats/validator');

const noNames = { otherNames: new Map(), ownerid: 'tester' };

function findFunctions(value, path = '') {
	if (typeof value === 'function') return [path];
	if (!value || typeof value !== 'object') return [];
	return Object.entries(value).flatMap(([key, entry]) => findFunctions(entry, `${path}.${key}`));
}

const SPECIES = {
	name: 'Testmon', types: ['Steel'], abilities: { 0: 'Levitate' },
	baseStats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
	eggGroups: ['Undiscovered'], weightkg: 10, learnset: { tackle: ['9M'] },
};

describe('Custom data stays data', () => {
	describe('species', () => {
		for (const field of ['onModifySpecies', 'onBegin', 'init', 'battle', 'scripts']) {
			it(`should refuse a "${field}" field`, () => {
				assert.throws(() => normalizeSpeciesData({ ...SPECIES, [field]: '() => 1' }, noNames), Chat.ErrorMessage);
			});
		}

		it('should refuse a function even where a string is allowed', () => {
			assert.throws(() => normalizeSpeciesData({ ...SPECIES, color: () => 'Red' }, noNames), Chat.ErrorMessage);
		});

		it('should produce nothing callable', () => {
			const normalized = normalizeSpeciesData(SPECIES, noNames);
			const collection = toCollection([{
				name: normalized.name, num: -100001, inheritsfrom: null,
				species: normalized.species, learnset: normalized.learnset, sprites: {},
			}]);
			assert.deepEqual(findFunctions(collection), []);
		});
	});

	describe('formats', () => {
		for (const field of ['onBegin', 'onValidateSet', 'onValidateTeam', 'checkCanLearn', 'battle', 'team', 'init']) {
			it(`should refuse a "${field}" field`, () => {
				assert.throws(
					() => normalizeFormatData({ name: 'X', base: '[Gen 9] OU', [field]: '() => 1' }, noNames),
					Chat.ErrorMessage
				);
			});
		}

		it('should refuse a rule that is not a string', () => {
			assert.throws(
				() => normalizeFormatData({ name: 'X', base: '[Gen 9] OU', banlist: [() => 1] }, noNames),
				Chat.ErrorMessage
			);
		});

		it('should produce nothing callable', () => {
			const format = toFormatData(normalizeFormatData({
				name: 'Custom OU', base: '[Gen 9] OU', ruleset: ['Same Type Clause'],
			}, noNames));
			assert.deepEqual(findFunctions(format), []);
		});

		it('should hand the battle a format with no own methods', () => {
			const format = new Dex.Format(toFormatData(normalizeFormatData(
				{ name: 'Custom OU', base: '[Gen 9] OU' }, noNames
			)));
			assert.deepEqual(Object.entries(format).filter(([, value]) => typeof value === 'function'), []);
		});
	});
});
