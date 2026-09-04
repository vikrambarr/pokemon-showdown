'use strict';

/**
 * Tests for the protocol the pokebuilder, formatbuilder and teambuilder send
 */

const assert = require('assert').strict;

const { Teams } = require('../../dist/sim/teams');
const { TEAM } = require('../custom-fixtures');
const store = require('../custom-store-fixtures');

const OWNER = 'uitester';
const FORMAT = `custom-${OWNER}-customou`;

/** `CustomDex.create` sends exactly these fields, with a random ability. */
const CREATE = {
	name: 'Testmon', types: ['Normal'], abilities: { 0: 'Levitate' },
	baseStats: { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 80 },
	eggGroups: ['Field'], weightkg: 10,
};

/** What the pokebuilder flushes back after the type and the learnset are edited. */
const EDIT = { types: ['Steel'], learnset: { tackle: ['9M'] } };

describe('Custom Pokemon through the builder protocol', () => {
	let client;

	before(async function () {
		this.timeout(0);
		if (!await store.connect()) this.skip();
		await store.clear(OWNER);
		client = store.makeClient('Uitester');
	});

	after(async () => {
		if (!client) return;
		await store.clear(OWNER);
		client.destroy();
	});

	// Each step continues where the last left off.
	it('should create the species the pokebuilder asks for', async () => {
		const response = await client.cmd(`custompokemon create ${JSON.stringify(CREATE)}`);
		assert.equal(response.name, 'Testmon');
		assert.equal(response.overlay.Pokedex.testmon.name, 'Testmon');
		assert.equal(response.overlay.Pokedex.testmon.isNonstandard, 'Custom');
	});

	it('should keep the edits the pokebuilder flushes', async () => {
		const response = await client.cmd(`custompokemon edit Testmon, ${JSON.stringify(EDIT)}`);
		assert.deepEqual(response.overlay.Pokedex.testmon.types, ['Steel']);
		assert.deepEqual(response.overlay.Learnsets.testmon.learnset.tackle, ['9M']);
	});

	it('should refuse a second Pokemon of the same name', async () => {
		const response = await client.cmd(`custompokemon create ${JSON.stringify(CREATE)}`);
		assert.match(response.actionerror, /already have a custom Pokemon named "Testmon"/);
	});

	it('should create the format the formatbuilder asks for', async () => {
		const create = JSON.stringify({ name: 'Custom OU', base: '[Gen 9] OU' });
		const response = await client.cmd(`customformat create ${create}`);
		assert.equal(response.name, 'Custom OU');
		assert.deepEqual(response.overlay.formats.map(entry => entry.id), [FORMAT]);
		assert.equal(response.overlay.formats[0].base, '[Gen 9] OU');
	});

	it('should leave a new format allowing exactly what its base allows', async function () {
		this.timeout(0);
		const roster = await client.cmd(`customformatlegal ${FORMAT}, default`);
		assert.equal(roster.id, FORMAT);
		assert(!roster.legal.pokemon.includes('testmon'), `legal before the format allowed it`);
		assert(roster.legal.move.includes('tackle'));
		// The base format's own bans are still in force.
		assert(!roster.legal.pokemon.includes('miraidon'));
		assert.deepEqual(roster.legal.pokemon, roster.defaultLegal.pokemon);
	});

	it('should offer the custom species once the picker allows it', async function () {
		this.timeout(0);
		const edit = JSON.stringify({ unbanlist: ['Testmon'] });
		assert.equal((await client.cmd(`customformat edit Custom OU, ${edit}`)).name, 'Custom OU');
		const roster = await client.cmd(`customformatlegal ${FORMAT}`);
		assert(roster.legal.pokemon.includes('testmon'), `not in the roster`);
	});

	it('should accept a team of the custom species in the custom format', async function () {
		this.timeout(0);
		await client.send(`/utm ${Teams.pack(TEAM)}`);
		// The client sends the format the way a team file stores it, which is the id, not the ref.
		assert.match(await client.popup(`/vtm ${toID(FORMAT)}`), /Your team is valid for/);
		// The popup names the format the way its owner wrote it, never by its internal id.
		assert.match(await client.popup(`/vtm ${FORMAT}`), /valid for Custom \(uitester\) Custom OU\./);
	});

	it('should reject that team in the format it was built on', async function () {
		this.timeout(0);
		assert.match(await client.popup(`/vtm gen9ou`), /rejected[\s\S]*"testmon" does not exist/);
	});

	it('should reject the team once the picker removes everything', async function () {
		this.timeout(0);
		const edit = JSON.stringify({ banlist: ['All Pokemon'], unbanlist: [] });
		assert.equal((await client.cmd(`customformat edit Custom OU, ${edit}`)).name, 'Custom OU');
		assert.match(await client.popup(`/vtm ${FORMAT}`), /rejected[\s\S]*Testmon/);
		const roster = await client.cmd(`customformatlegal ${FORMAT}`);
		assert.deepEqual(roster.legal.pokemon, []);
	});

	it('should empty two pickers whatever order their rules come in', async function () {
		this.timeout(0);
		// `-All Moves` ahead of `-All Pokemon` is what emptying the moves picker second writes.
		const edit = JSON.stringify({ banlist: ['All Moves', 'All Pokemon'], unbanlist: ['Tackle'] });
		assert.equal((await client.cmd(`customformat edit Custom OU, ${edit}`)).name, 'Custom OU');
		assert.deepEqual((await store.formatRow(OWNER, 'customou')).banlist, ['All Pokemon', 'All Moves']);
		const roster = await client.cmd(`customformatlegal ${FORMAT}`);
		assert.deepEqual(roster.legal.move, ['tackle']);
	});

	it('should take an unbanned "All Pokemon" whichever list it comes in', async function () {
		this.timeout(0);
		const edit = JSON.stringify({ banlist: ['Miraidon'], unbanlist: ['All Pokemon'] });
		const response = await client.cmd(`customformat edit Custom OU, ${edit}`);
		assert.equal(response.name, 'Custom OU', JSON.stringify(response));
		// The sim only reads it from the ruleset, and drops it there when it frees nothing.
		assert.deepEqual((await store.formatRow(OWNER, 'customou')).unbanlist, []);
		const roster = await client.cmd(`customformatlegal ${FORMAT}`);
		assert(!roster.legal.pokemon.includes('miraidon'), `the ban under it stopped applying`);
	});

	it('should preview an edit the builder is holding without storing it', async function () {
		this.timeout(0);
		const changes = JSON.stringify({ banlist: ['All Pokemon'] });
		const draft = await client.cmd(`customformatdraft Custom OU, default, ${changes}`);
		assert.equal(draft.id, FORMAT);
		assert.deepEqual(draft.legal.pokemon, [], `the preview ignored the edit`);
		assert.deepEqual((await store.formatRow(OWNER, 'customou')).banlist, ['Miraidon'], `the preview saved`);
		const stored = await client.cmd(`customformatlegal ${FORMAT}`);
		assert(stored.legal.pokemon.length, `the stored format changed`);
	});

	it('should answer a preview the rules refuse with the reason', async function () {
		this.timeout(0);
		const changes = JSON.stringify({ ruleset: ['Not A Rule'] });
		const draft = await client.cmd(`customformatdraft Custom OU, , ${changes}`);
		assert(draft.actionerror, JSON.stringify(draft));
	});

	it('should rename a format the builder renames', async () => {
		const response = await client.cmd(`customformat edit Custom OU, ${JSON.stringify({ name: 'Custom UU' })}`);
		assert.equal(response.name, 'Custom UU');
		assert.deepEqual(response.overlay.formats.map(entry => entry.id), [`custom-${OWNER}-customuu`]);
	});
});

const AUTHOR = 'uiauthor';
const VIEWER = 'uiviewer';
const SHARED = `custom-${AUTHOR}-sharedou`;

describe(`Another user's format through the builder protocol`, () => {
	let author, viewer, password;

	before(async function () {
		this.timeout(0);
		if (!await store.connect()) this.skip();
		await store.clear(AUTHOR);
		await store.clear(VIEWER);
		author = store.makeClient('Uiauthor');
		viewer = store.makeClient('Uiviewer');
		await author.cmd(`custompokemon create ${JSON.stringify(CREATE)}`);
		await author.cmd(`custompokemon edit Testmon, ${JSON.stringify(EDIT)}`);
		const create = JSON.stringify({ name: 'Shared OU', base: '[Gen 9] OU', unbanlist: ['Testmon'] });
		assert.equal((await author.cmd(`customformat create ${create}`)).name, 'Shared OU');
	});

	after(async () => {
		if (!author) return;
		await store.clear(AUTHOR);
		await store.clear(VIEWER);
		author.destroy();
		viewer.destroy();
	});

	it('should list a public format on the directory page', async () => {
		const page = await viewer.page(`customformats-search-${AUTHOR}`);
		assert(page.includes('Shared OU'), `not listed: ${page}`);
		assert(page.includes(`customformatbuild ${SHARED}`), `nothing to build a team with: ${page}`);
		assert((await viewer.page('customformats-browse')).includes('Shared OU'), `not browsable`);
	});

	it(`should open a team in the format the directory's button names`, async () => {
		const entry = await viewer.cmd(`customformatbuild ${SHARED}`);
		assert.equal(entry.id, SHARED);
		assert.equal(entry.owner, AUTHOR);
		assert.equal(entry.base, '[Gen 9] OU');
		assert.equal(entry.password, '');
	});

	it(`should send the author's species to whoever browses to the format`, async () => {
		const dex = await viewer.cmd(`customformatdex ${SHARED}`);
		assert.equal(dex.id, SHARED);
		assert.equal(dex.Pokedex.testmon.name, 'Testmon');
		// Without the learnset the builder would offer the species but none of its moves.
		assert.deepEqual(dex.Learnsets.testmon.learnset.tackle, ['9M']);
	});

	it('should offer the roster of a format the viewer does not own', async function () {
		this.timeout(0);
		const roster = await viewer.cmd(`customformatlegal ${SHARED}`);
		assert.equal(roster.id, SHARED);
		assert(roster.legal.pokemon.includes('testmon'), `not in the roster`);
	});

	it(`should accept a team of the author's species from the viewer`, async function () {
		this.timeout(0);
		await viewer.send(`/utm ${Teams.pack(TEAM)}`);
		assert.match(await viewer.popup(`/vtm ${SHARED}`), /valid for Custom \(uiauthor\) Shared OU\./);
	});

	it('should keep a private format out of the directory', async () => {
		await author.send(`/customformat private Shared OU, on`);
		password = (await store.formatRow(AUTHOR, 'sharedou')).private;
		assert(password, `privacy stored no password`);
		assert(!(await viewer.page(`customformats-search-${AUTHOR}`)).includes('Shared OU'), `still listed`);
		assert.match((await viewer.cmd(`customformatdex ${SHARED}`)).actionerror, /doesn't have a custom format/);
	});

	it('should let whoever has the password read a private format', async () => {
		const dex = await viewer.cmd(`customformatdex ${SHARED}, ${password}`);
		assert.equal(dex.Pokedex.testmon.name, 'Testmon');
		const info = await viewer.cmd(`customformatinfo ${SHARED}, ${password}`);
		assert.equal(info.name, 'Shared OU');
		// The link a private format is shared by carries its password, and the page hands it back on.
		const page = await viewer.page(`customformats-view-${AUTHOR}-sharedou-${password}`);
		assert(page.includes(`customformatbuild ${SHARED}, ${password}`), `no way to build one: ${page}`);
		assert.equal((await viewer.cmd(`customformatbuild ${SHARED}, ${password}`)).password, password);
	});

	it('should still play a private format for whoever has the ref', async function () {
		this.timeout(0);
		assert.match(await viewer.popup(`/vtm ${SHARED}`), /valid for Custom \(uiauthor\) Shared OU\./);
	});
});
