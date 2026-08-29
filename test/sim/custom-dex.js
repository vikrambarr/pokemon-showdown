'use strict';

const assert = require('./../assert');
const { Dex } = require('./../../dist/sim/dex');
const { BattleStream } = require('./../../dist/sim/battle-stream');
const { buildCustomDex, releaseCustomDex } = require('./../../dist/sim/dex-custom');

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

function start(customData) {
	const stream = new BattleStream();
	void stream.write(`>start ${JSON.stringify({ formatid: 'gen9customgame', customData })}`);
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
});
