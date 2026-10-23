'use strict';

const assert = require('./../assert');
const { Battle } = require('../../dist/sim/battle');

let battle;

function createBattle(teams) {
	const format = new Dex.Format({ name: 'Mariomon Test', mod: 'gen9mariomon', effectType: 'Format', ruleset: [] });
	const created = new Battle({ format, seed: [1, 2, 3, 4] });
	created.setPlayer('p1', { team: teams[0] });
	created.setPlayer('p2', { team: teams[1] });
	return created;
}

describe('Mariomon engine', () => {
	afterEach(() => {
		battle.destroy();
	});

	it('should give frostbite instead of freezing, and halve special damage', () => {
		battle = createBattle([[
			{ species: 'Glaceon', moves: ['sleeptalk', 'icebeam'] },
		], [
			{ species: 'Blissey', moves: ['sleeptalk'] },
		]]);
		const blissey = battle.p2.active[0];
		battle.makeChoices('move icebeam', 'move sleeptalk');
		const healthy = blissey.maxhp - blissey.hp;
		blissey.hp = blissey.maxhp;
		battle.p1.active[0].setStatus('frz');
		assert.equal(battle.p1.active[0].status, 'frb');
		battle.makeChoices('move icebeam', 'move sleeptalk');
		assert.bounded(blissey.maxhp - blissey.hp, [Math.floor(healthy * 0.85 / 2) - 1, Math.ceil(healthy / 0.85 / 2) + 1]);
		assert.equal(battle.p1.active[0].hp, battle.p1.active[0].maxhp - Math.floor(battle.p1.active[0].maxhp / 16));
	});

	it('should stop Run Away Pokemon from being trapped', () => {
		battle = createBattle([[
			{ species: 'Rattata', ability: 'runaway', moves: ['sleeptalk'] },
			{ species: 'Raticate', moves: ['sleeptalk'] },
		], [
			{ species: 'Gengar', moves: ['meanlook'] },
		]]);
		battle.makeChoices('move sleeptalk', 'move meanlook');
		assert.false(battle.p1.active[0].trapped);
		battle.makeChoices('switch 2', 'move meanlook');
		assert.species(battle.p1.active[0], 'Raticate');
	});
});
