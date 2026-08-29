'use strict';

const assert = require('assert').strict;

const { BattleStream } = require('../../dist/sim/battle-stream');
const {
	customDataFromInputLog, customFormat, mergeCollections, toCollection,
} = require('../../dist/server/custom/dex');
const { normalizeFormatData, toFormatData } = require('../../dist/server/custom/formats/validator');
const { SPECIES_ROW, TEAM } = require('../custom-fixtures');

function playCustomBattle() {
	const customData = {
		...mergeCollections([toCollection([SPECIES_ROW])]),
		format: toFormatData(normalizeFormatData(
			{ name: 'Custom OU', base: '[Gen 9] OU' }, { otherNames: new Map(), ownerid: 'tester' }
		)),
	};
	const stream = new BattleStream();
	void stream.write(`>start ${JSON.stringify({ formatid: 'custom-someone-customou', customData })}`);
	void stream.write(`>player p1 ${JSON.stringify({ name: 'Player 1', team: TEAM })}`);
	void stream.write(`>player p2 ${JSON.stringify({ name: 'Player 2', team: TEAM })}`);
	const inputLog = stream.battle.inputLog.join('\n');
	stream.battle.destroy();
	return inputLog;
}

describe('Custom battle restore', () => {
	it('should recover the payload a battle was started with', () => {
		const options = { inputLog: playCustomBattle() };
		options.customData = customDataFromInputLog(options.inputLog);
		assert(options.customData.Pokedex.testmon);
		assert.equal(customFormat(options).name, 'Custom OU');
	});

	it('should leave an ordinary battle alone', () => {
		const stream = new BattleStream();
		void stream.write(`>start ${JSON.stringify({ formatid: 'gen9customgame' })}`);
		const inputLog = stream.battle.inputLog.join('\n');
		stream.battle.destroy();
		assert.equal(customDataFromInputLog(inputLog), undefined);
	});

	it('should refuse a payload smuggled into a real format', () => {
		const inputLog = playCustomBattle().replace('custom-someone-customou', 'gen9ou');
		assert.equal(customDataFromInputLog(inputLog), undefined);
	});

	it('should refuse a payload whose format no longer builds', () => {
		const inputLog = playCustomBattle().replace(`"name":"Custom OU"`, `"name":"${'x'.repeat(60)}"`);
		assert.equal(customDataFromInputLog(inputLog), undefined);
	});

	it('should not throw on a malformed input log', () => {
		assert.equal(customDataFromInputLog('>start {"customData":'), undefined);
		assert.equal(customDataFromInputLog(''), undefined);
	});

	it('should replay a custom battle from its restored log', () => {
		const inputLog = playCustomBattle().split('\n').filter(line => !line.startsWith('>version'));
		const stream = new BattleStream();
		void stream.write(inputLog.join('\n'));
		assert.equal(stream.battle.p1.pokemon[0].species.name, 'Testmon');
		assert.equal(stream.battle.format.name, 'Custom OU');
		stream.battle.destroy();
	});
});
