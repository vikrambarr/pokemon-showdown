'use strict';

const assert = require('assert').strict;

const { Teams } = require('../../dist/sim/teams');
const { TeamValidatorAsync } = require('../../dist/server/team-validator-async');
const { customFormat, mergeCollections, parseCustomFormat, toCollection } = require('../../dist/server/custom/dex');
const { normalizeFormatData, toFormatData } = require('../../dist/server/custom/formats/validator');
const { SPECIES_ROW, TEAM: TEAM_SETS } = require('../custom-fixtures');

const TEAM = Teams.pack(TEAM_SETS);

function battleData(format) {
	return {
		...mergeCollections([toCollection([SPECIES_ROW])]),
		format: toFormatData(normalizeFormatData(format, { otherNames: new Map(), ownerid: 'tester' })),
	};
}

describe('Custom battles', () => {
	describe('format references', () => {
		it('should parse an owner and a format out of a reference', () => {
			assert.deepEqual(parseCustomFormat('custom-vikram-monotypechomp'), {
				ownerid: 'vikram', formatid: 'monotypechomp', id: 'custom-vikram-monotypechomp',
			});
			assert.equal(parseCustomFormat('custom-vikram-Monotype Chomp').formatid, 'monotypechomp');
			assert.equal(parseCustomFormat('Custom-Vikram-Monotype-Chomp').formatid, 'monotypechomp');
		});

		it('should not claim a real format', () => {
			assert.equal(parseCustomFormat('[Gen 9] OU'), null);
			assert.equal(parseCustomFormat('gen9ou'), null);
			assert.equal(parseCustomFormat('custom-vikram'), null);
		});
	});

	describe('battle options', () => {
		it('should give a battle the custom format rather than a nonexistent one', () => {
			const format = customFormat({ customData: battleData({ name: 'Custom OU', base: '[Gen 9] OU' }) });
			assert.equal(format.name, 'Custom OU');
			assert.equal(format.gameType, 'singles');
			assert.equal(format.playerCount, 2);
			assert.equal(customFormat({}), null);
		});
	});

	describe('team validation', () => {
		it('should accept a custom species in a custom format', async () => {
			const customData = battleData({ name: 'Custom OU', base: '[Gen 9] OU' });
			const result = await TeamValidatorAsync.get('custom-someone-customou').validateTeam(TEAM, { customData });
			assert.equal(result.charAt(0), '1', result.slice(1));
		});

		it('should reject a custom species when the format bans them', async () => {
			const customData = battleData({ name: 'Clean OU', base: '[Gen 9] OU', banlist: ['tag:custom'] });
			const result = await TeamValidatorAsync.get('custom-someone-cleanou').validateTeam(TEAM, { customData });
			assert.equal(result.charAt(0), '0');
			assert(result.includes('Testmon'));
		});

		it('should leave ordinary validation alone', async () => {
			const team = Teams.pack([{
				name: 'Garchomp', species: 'Garchomp', ability: 'Rough Skin', moves: ['earthquake'],
				evs: { hp: 4, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, nature: 'Serious',
			}]);
			const result = await TeamValidatorAsync.get('gen9customgame').validateTeam(team);
			assert.equal(result.charAt(0), '1', result.slice(1));
		});
	});
});
