'use strict';

const assert = require('assert').strict;

const { buildCustomDex, releaseCustomDex } = require('../../dist/sim/dex-custom');
const { TeamValidator } = require('../../dist/sim/team-validator');
const { mergeCollections, toCollection } = require('../../dist/server/custom/dex');
const {
	normalizeFormatData, toFormatData,
} = require('../../dist/server/custom/formats/validator');
const { SPECIES_ROW, TEAM } = require('../custom-fixtures');

const normalize = input => normalizeFormatData(input, { otherNames: new Map(), ownerid: 'tester' });

function validatorFor(format) {
	const dex = buildCustomDex(mergeCollections([toCollection([SPECIES_ROW])]), 'gen9');
	const built = new Dex.Format({ ...format, effectType: 'Format', mod: dex.currentMod });
	return [new TeamValidator(built), dex];
}

describe('Custom formats', () => {
	describe('validation', () => {
		it('should accept a format built out of real rules', () => {
			const normalized = normalize({
				name: 'Monotype Chomp', base: '[Gen 9] OU',
				ruleset: ['Same Type Clause'], banlist: ['Leftovers'],
			});
			assert.equal(normalized.formatid, 'monotypechomp');
			assert.equal(normalized.base, 'gen9ou');
		});

		it('should reject a field that is not a format field', () => {
			assert.throws(() => normalize({ name: 'X', base: '[Gen 9] OU', desc: 'hi' }), Chat.ErrorMessage);
		});

		it('should reject code, not just unknown fields', () => {
			assert.throws(
				() => normalize({ name: 'X', base: '[Gen 9] OU', onValidateSet: '() => {}' }),
				/comes from the base format/
			);
		});

		it('should reject a name that shadows a real format', () => {
			assert.throws(() => normalize({ name: 'OU', base: '[Gen 9] OU' }), /already the name of a real format/);
		});

		it('should reject a rule the base format already has', () => {
			assert.throws(() => normalize({ name: 'X', base: '[Gen 9] OU', banlist: ['Uber'] }), /already exists in/);
		});

		it('should reject a base that is not a format', () => {
			assert.throws(() => normalize({ name: 'X', base: 'Garchomp' }), /isn't a format/);
		});

		it('should reject a rule that does not exist', () => {
			assert.throws(() => normalize({ name: 'X', base: '[Gen 9] OU', banlist: ['Notapokemon'] }), Chat.ErrorMessage);
		});

		it('should reject a sign on a banlist entry', () => {
			assert.throws(() => normalize({ name: 'X', base: '[Gen 9] OU', banlist: ['-Uber'] }), /already means that/);
		});
	});

	describe('composition', () => {
		it('should inherit the base by naming it first in the ruleset', () => {
			const format = toFormatData(normalize({ name: 'X', base: '[Gen 9] OU', ruleset: ['Sleep Clause Mod'] }));
			assert.deepEqual(format.ruleset, ['[Gen 9] OU', 'Sleep Clause Mod']);
			assert.equal(format.mod, Dex.formats.get('gen9ou').mod);
		});

		it('should unban custom species by default', () => {
			const format = toFormatData(normalize({ name: 'X', base: '[Gen 9] OU' }));
			assert(format.unbanlist.includes('tag:custom'));
		});

		it('should not unban custom species when the format bans them itself', () => {
			const format = toFormatData(normalize({ name: 'X', base: '[Gen 9] OU', banlist: ['tag:custom'] }));
			assert(!format.unbanlist.includes('tag:custom'));
		});
	});

	describe('as a battle format', () => {
		it('should let a custom species into a custom format', () => {
			const [validator, dex] = validatorFor(toFormatData(normalize({ name: 'Custom OU', base: '[Gen 9] OU' })));
			assert.equal(validator.validateTeam(TEAM), null);
			releaseCustomDex(dex);
		});

		it('should keep a custom species out when the format bans them', () => {
			const format = toFormatData(normalize({ name: 'Clean OU', base: '[Gen 9] OU', banlist: ['tag:custom'] }));
			const [validator, dex] = validatorFor(format);
			const problems = validator.validateTeam(TEAM);
			assert(problems.some(problem => problem.includes('Testmon')));
			releaseCustomDex(dex);
		});
	});
});
