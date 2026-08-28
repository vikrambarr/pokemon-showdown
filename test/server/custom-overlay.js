'use strict';

const assert = require('assert').strict;

const { resolveOverlay, toOverlay } = require('../../dist/server/custom/dex');
const { SPECIES_ROW: FIXTURE_ROW } = require('../custom-fixtures');

const SPECIES_ROW = { ...FIXTURE_ROW, sprites: { front: 'abc123', icon: 'def456' } };
const FORMAT_ROW = {
	ownerid: 'vikram', formatid: 'monotypechomp', name: 'Monotype Chomp', base: 'gen9ou',
	ruleset: ['Same Type Clause'], banlist: [], unbanlist: [],
};

describe('Custom dex overlay', () => {
	// Plugins load lazily, on the first command anyone parses.
	before(() => Chat.loadPlugins());

	it('should carry species in the same shape the data files use', () => {
		const overlay = toOverlay([SPECIES_ROW], []);
		assert.equal(overlay.Pokedex.testmon.name, 'Testmon');
		assert.deepEqual(overlay.Learnsets.testmon.learnset.tackle, ['9M']);
		assert.equal(overlay.FormatsData.testmon.isNonstandard, 'Custom');
	});

	it('should turn sprite hashes into URLs the client can load', () => {
		const overlay = toOverlay([SPECIES_ROW], []);
		assert.deepEqual(Object.keys(overlay.sprites.testmon), ['front', 'icon']);
		assert(overlay.sprites.testmon.front.endsWith('/abc123.png'));
	});

	it('should leave out sprites for species that have none', () => {
		const overlay = toOverlay([{ ...SPECIES_ROW, sprites: {} }], []);
		assert.deepEqual(overlay.sprites, {});
	});

	it('should give each format the reference it can be challenged by', () => {
		const overlay = toOverlay([], [FORMAT_ROW]);
		assert.equal(overlay.formats[0].id, 'custom-vikram-monotypechomp');
		assert.equal(overlay.formats[0].name, 'Monotype Chomp');
		assert.equal(overlay.formats[0].base, '[Gen 9] OU');
	});

	it('should be empty rather than broken when the databases are off', async () => {
		const overlay = await resolveOverlay('someone');
		assert.deepEqual(overlay.Pokedex, {});
		assert.deepEqual(overlay.formats, []);
	});

	it('should be reachable as a client request', () => {
		assert.equal(typeof Chat.crqHandlers.customdex, 'function');
		assert.equal(Chat.crqHandlers.customdex('', { named: true, id: 'someone' }, false), null);
	});
});
