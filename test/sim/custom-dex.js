'use strict';

const assert = require('./../assert');
const { Dex } = require('./../../dist/sim/dex');
const { BattleStream } = require('./../../dist/sim/battle-stream');
const { buildCustomDex, releaseCustomDex } = require('./../../dist/sim/dex-custom');
const { TeamValidator } = require('./../../dist/sim/team-validator');

function payload(spe = 100) {
	return {
		Pokedex: {
			testmon: {
				name: 'Testmon', num: -100001, types: ['Steel'], abilities: { 0: 'Levitate' },
				baseStats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe },
				eggGroups: ['Undiscovered'], weightkg: 10, isNonstandard: 'Custom',
			},
		},
		Learnsets: { testmon: { learnset: { tackle: ['9M'], recover: ['9M'] } } },
		FormatsData: { testmon: { isNonstandard: 'Custom' } },
		format: { name: 'Custom Test', mod: 'gen9', ruleset: ['Standard'], unbanlist: ['tag:custom'] },
	};
}

const TEAM = [{
	name: 'Testmon', species: 'Testmon', ability: 'Levitate', moves: ['tackle'],
	evs: { hp: 4, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, nature: 'Serious',
}];

function start(customData, teams) {
	const stream = new BattleStream();
	void stream.write(`>start ${JSON.stringify({ formatid: 'gen9customgame', customData })}`);
	if (teams) {
		void stream.write(`>player p1 ${JSON.stringify({ name: 'Player 1', team: teams[0] })}`);
		void stream.write(`>player p2 ${JSON.stringify({ name: 'Player 2', team: teams[1] })}`);
	}
	return stream.battle;
}

describe('Custom dex', () => {
	it('should only exist inside its own battle', () => {
		const battle = start(payload());
		assert(battle.dex.species.get('Testmon').exists);
		assert.false(Dex.species.get('Testmon').exists);
		battle.destroy();
	});

	it('should keep concurrent battles isolated', () => {
		const fast = start(payload(200));
		const slow = start(payload(50));
		assert.equal(fast.dex.species.get('Testmon').baseStats.spe, 200);
		assert.equal(slow.dex.species.get('Testmon').baseStats.spe, 50);
		fast.destroy();
		slow.destroy();
	});

	it('should be released when the battle is destroyed', () => {
		const battle = start(payload());
		const mod = battle.dex.currentMod;
		assert(Dex.dexes[mod]);
		battle.destroy();
		assert.false(!!Dex.dexes[mod]);
	});

	it('should share unmodified data with the parent mod', () => {
		const dex = buildCustomDex(payload(), 'gen9');
		assert.equal(dex.data.Moves, Dex.mod('gen9').data.Moves);
		assert.notEqual(dex.data.Pokedex, Dex.mod('gen9').data.Pokedex);
		assert.equal(dex.species.get('Pikachu').baseStats.spe, Dex.species.get('Pikachu').baseStats.spe);
		releaseCustomDex(dex);
	});

	it('should record itself in the input log', () => {
		const battle = start(payload());
		const startLine = battle.inputLog.find(line => line.startsWith('>start '));
		assert(JSON.parse(startLine.slice(7)).customData.Pokedex.testmon);
		battle.destroy();
	});

	it('should replay from its own input log', () => {
		const original = start(payload(), [TEAM, TEAM]);
		const inputLog = original.inputLog.filter(line => !line.startsWith('>version'));
		original.destroy();

		const stream = new BattleStream();
		void stream.write(inputLog.join('\n'));
		assert.equal(stream.battle.p1.pokemon[0].species.baseStats.spe, 100);
		stream.battle.destroy();
	});

	it('should let a format unban custom species with +tag:custom', () => {
		const dex = buildCustomDex(payload(), 'gen9');
		const format = new Dex.Format({ ...payload().format, effectType: 'Format', mod: dex.currentMod });
		assert.equal(new TeamValidator(format).validateTeam(TEAM), null);
		releaseCustomDex(dex);
	});

	it('should keep custom species out of a format that does not unban them', () => {
		const dex = buildCustomDex(payload(), 'gen9');
		const format = new Dex.Format({
			...payload().format, unbanlist: [], effectType: 'Format', mod: dex.currentMod,
		});
		const problems = new TeamValidator(format).validateTeam(TEAM);
		assert(problems.some(problem => problem.includes('Testmon does not exist')));
		releaseCustomDex(dex);
	});
});
