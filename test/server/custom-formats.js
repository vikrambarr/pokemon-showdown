'use strict';

const assert = require('assert').strict;

const { buildCustomDex, releaseCustomDex } = require('../../dist/sim/dex-custom');
const { TeamValidator } = require('../../dist/sim/team-validator');
const { mergeCollections, toCollection } = require('../../dist/server/custom/dex');
const { baseSnapshot, normalizeFormatData, toFormatData } = require('../../dist/server/custom/formats/validator');
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
			assert.throws(
				() => normalize({ name: 'X', base: '[Gen 9] OU', onValidateSet: '() => {}' }),
				/comes from the base format/
			);
		});

		it('should reject a name that shadows a real format', () => {
			assert.throws(() => normalize({ name: 'OU', base: '[Gen 9] OU' }), /already the name of a real format/);
		});

		it('should reject a base that is not a format', () => {
			assert.throws(() => normalize({ name: 'X', base: 'Garchomp' }), /isn't a format/);
		});

		it('should reject rules that do not exist or carry their own sign', () => {
			assert.throws(() => normalize({ name: 'X', base: '[Gen 9] OU', banlist: ['Notapokemon'] }), Chat.ErrorMessage);
			assert.throws(() => normalize({ name: 'X', base: '[Gen 9] OU', banlist: ['-Uber'] }), /already means that/);
		});

		it('should drop a rule the format already has rather than refusing it', () => {
			assert.deepEqual(normalize({ name: 'X', base: '[Gen 9] OU', ruleset: ['Standard', 'Standard'] }).ruleset, ['Standard']);
		});
	});

	describe('composition', () => {
		it('should copy the base rules in rather than naming the base', () => {
			const snapshot = baseSnapshot('[Gen 9] OU');
			const format = toFormatData(normalize({ ...snapshot, name: 'X', base: '[Gen 9] OU' }));
			assert(!format.ruleset.includes('[Gen 9] OU'));
			assert.deepEqual(format.ruleset, Dex.formats.get('gen9ou').ruleset);
			assert.deepEqual(format.banlist, Dex.formats.get('gen9ou').banlist);
			assert.equal(format.mod, Dex.formats.get('gen9ou').mod);
		});

		it('should need no rule of its own to allow custom species', () => {
			const format = toFormatData(normalize({ name: 'X', base: '[Gen 9] OU' }));
			const rules = [...format.ruleset, ...format.banlist, ...format.unbanlist];
			assert(!rules.some(rule => toID(rule) === 'tagcustom'));
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
			assert(validator.validateTeam(TEAM).some(problem => problem.includes('Testmon')));
			releaseCustomDex(dex);
		});
	});
});
