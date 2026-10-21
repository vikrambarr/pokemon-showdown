'use strict';

const assert = require('assert').strict;
const { BattleStream } = require('../../dist/sim/battle-stream');
const { buildDex, buildFormat, releaseDex } = require('../../dist/sim/dex-custom');
const { TeamValidator } = require('../../dist/sim/team-validator');

const DATA = {
	hash: 'simtest',
	mod: 'gen9',
	species: ['pikachu', 'raichu', 'voltlet'],
	Pokedex: {
		voltlet: {
			num: -10001, gen: 9, name: 'Voltlet', types: ['Electric', 'Steel'], abilities: { 0: 'Static' },
			baseStats: { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 80 }, eggGroups: ['Field'], weightkg: 10,
		},
		raichu: { ...Dex.data.Pokedex.raichu, types: ['Electric', 'Fighting'] },
	},
	Learnsets: { voltlet: { learnset: { thunderbolt: ['9M'], protect: ['9M'] } } },
	FormatsData: { voltlet: { tier: 'OU' } },
	format: { name: '[Sim Test] OU', ruleset: ['Standard'] },
};

const set = species => ({
	species, ability: species === 'Voltlet' ? 'Static' : 'Lightning Rod', moves: ['thunderbolt', 'protect'],
	evs: { hp: 4 }, nature: 'Modest',
});

describe('Custom dexes', () => {
	it('should only allow the Pokemon in the dex', () => {
		const dex = buildDex(DATA);
		const validator = TeamValidator.get(buildFormat(dex, DATA.format));
		assert.equal(validator.validateTeam([set('Voltlet'), set('Raichu')]), null);
		assert(validator.validateTeam([set('Pichu')]).some(problem => problem.includes(`isn't in this dex`)));
		assert.deepEqual(dex.species.get('Raichu').types, ['Electric', 'Fighting']);
		assert.deepEqual(Dex.species.get('Raichu').types, ['Electric']);
		releaseDex(dex);
		assert.equal(Dex.dexes['dexsimtest'], undefined);
	});

	it('should run a battle from the dex in its start options and log which dex it used', async () => {
		const stream = new BattleStream();
		const team = Teams.pack([set('Voltlet')]);
		void stream.write(`>start ${JSON.stringify({ formatid: 'simtestou', dex: DATA })}`);
		void stream.write(`>player p1 ${JSON.stringify({ name: 'A', team })}`);
		void stream.write(`>player p2 ${JSON.stringify({ name: 'B', team })}`);
		let output = '';
		for await (const chunk of stream) {
			output += chunk;
			if (output.includes('|teampreview')) break;
		}
		assert(output.includes('|dex|simtest'));
		assert(output.includes('|poke|p1|Voltlet'));
		const start = stream.battle.inputLog.find(line => line.startsWith('>start '));
		assert.deepEqual(JSON.parse(start.slice(7)).dex, DATA);
		void stream.writeEnd();
		assert.equal(Dex.dexes['dexsimtest'], undefined);
	});
});
