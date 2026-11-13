'use strict';

const assert = require('assert').strict;
const { FS } = require('../../dist/lib');
const Dexes = require('../../dist/server/dexes');
const { Monitor } = require('../../dist/server/monitor');
const { TeamValidatorAsync } = require('../../dist/server/team-validator-async');
const { makeUser } = require('../users-utils');

const OWNER = '111111111111111111';
const EDITOR = '222222222222222222';

function png(width, height) {
	const data = Buffer.alloc(33);
	Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).copy(data);
	data.write('IHDR', 12, 'latin1');
	data.writeUInt32BE(width, 16);
	data.writeUInt32BE(height, 20);
	return data.toString('base64');
}

function gif(width, height) {
	const data = Buffer.alloc(13);
	data.write('GIF89a', 0, 'latin1');
	data.writeUInt16LE(width, 6);
	data.writeUInt16LE(height, 8);
	return data.toString('base64');
}

const id = name => Dexes.getDex(name).row.dexid;
const formatOf = (dex, name) => [...Dexes.getDex(dex).formats].find(([, data]) => toID(data.name) === toID(name))[0];
const slotsOf = (loaded, table, name, from, to) => Object.fromEntries(Dexes.effectEditor(loaded, table, name).handlers.flatMap(
	handler => handler.slots.filter(slot => slot.value === from).map(slot => [`${handler.path}:${slot.index}`, to])
));

const team = species => Teams.pack([{
	species, ability: 'Static', moves: ['thunderbolt', 'protect'],
	evs: { hp: 4 }, nature: 'Modest',
}]);

describe('Dexes', () => {
	let owner, editor, usepostgres, request;

	before(async function () {
		if (!Config.usepostgres) return this.skip();
		request = LoginServer.request;
		usepostgres = Config.usepostgres;
		Config.usepostgres = { ...usepostgres, options: '-c search_path=dexes_test' };
		Config.dexes = ' ';
		const { Client } = require('pg');
		const client = new Client(usepostgres);
		await client.connect();
		await client.query(`DROP SCHEMA IF EXISTS dexes_test CASCADE; CREATE SCHEMA dexes_test`);
		await client.query(`SET search_path = dexes_test; ${FS('databases/schemas/dexes.sql').readSync()}`);
		await client.end();
		owner = makeUser('Dex Owner');
		editor = makeUser('Dex Editor');
		owner.registered = editor.registered = true;
		Dexes.setAccount(owner.id, OWNER);
		Dexes.setAccount(editor.id, EDITOR);
	});

	after(() => {
		if (request) LoginServer.request = request;
		if (usepostgres) Config.usepostgres = usepostgres;
		owner?.destroy();
		editor?.destroy();
	});

	async function effectsFixture() {
		let loaded = Dexes.getDex('mochadex');
		for (const [table, input] of [
			['Moves', { name: 'Scorch Soak', inheritsFrom: 'Soak', type: 'Fire' }],
			['Moves', { name: 'Volt Jab', type: 'Electric', category: 'Physical', basePower: 70 }],
			['Moves', { name: 'Shield', inheritsFrom: 'Protect' }],
			['Items', { name: 'Volt Orb', inheritsFrom: 'Light Ball' }],
			['Items', { name: 'Choice Scarf', events: { onModifySpe: 'atk' } }],
		]) ({ loaded } = await Dexes.putEffect(loaded, table, input));
		({ loaded } = await Dexes.putEffect(loaded, 'Moves', {
			name: 'Scorch Soak', slots: slotsOf(loaded, 'Moves', 'Scorch Soak', 'Water', 'Fire'),
		}));
		({ loaded } = await Dexes.putEffect(loaded, 'Abilities', {
			name: 'Intimidate', slots: slotsOf(loaded, 'Abilities', 'Intimidate', -1, -2),
		}));
		await Dexes.putEntry(loaded, { name: 'Voltlet', learnset: { voltjab: ['9L1'], scorchsoak: ['9M'] } });
	}

	async function copiesFixture() {
		const source = Dexes.getDex('mochadex');
		for (const name of ['Copy Dex', 'Whole Copy']) {
			const copy = await Dexes.createDex(editor, name, 'gen9');
			await Dexes.forkEntry(copy, source, 'Pokedex', 'Voltlet');
		}
	}

	async function fixture({ sprites = false, editorAccess = false, effects = false, copies = false, copy = false } = {}) {
		let loaded = await Dexes.createDex(owner, 'Mocha Dex', 'gen9');
		({ loaded } = await Dexes.putEntry(loaded, {
			name: 'Voltlet', inheritsFrom: 'Pikachu', types: ['Electric', 'Steel'], learnset: { protect: ['9M'] },
		}));
		({ loaded } = await Dexes.putFormat(loaded, { name: 'OU', ruleset: ['Standard'] }));
		if (sprites) loaded = await Dexes.setSprite(owner, loaded, 'Voltlet', 'front', png(96, 96));
		if (editorAccess) {
			LoginServer.request = async () => [{ discordid: EDITOR }];
			await Dexes.setEditor(loaded, editor.name, true);
			LoginServer.request = request;
		}
		if (effects) await effectsFixture();
		if (copies) await copiesFixture();
		if (copy) await Dexes.createDex(editor, 'Copy Dex', 'gen9');
	}

	afterEach(async () => {
		LoginServer.request = request;
		while (Dexes.dexes.size) {
			const leaf = [...Dexes.dexes.values()].find(loaded => ![...Dexes.dexes.values()]
				.some(other => other.row.parents.includes(loaded.row.dexid)));
			await Dexes.deleteDex(leaf);
		}
	});


	it('should add, reset and delete many entries in one edit, skipping only the ones that fail', async () => {
		let source = await Dexes.createDex(owner, 'Source Dex', 'gen9');
		for (const name of ['Bulk One', 'Bulk Two']) ({ loaded: source } = await Dexes.putEffect(source, 'Moves', { name, type: 'Fire' }));
		({ loaded: source } = await Dexes.putEntry(source, { name: 'Bulkmon', inheritsFrom: 'Pikachu', learnset: { bulktwo: ['9L1'] } }));
		({ loaded: source } = await Dexes.putEntry(source, { name: 'Okmon', inheritsFrom: 'Pikachu' }));
		source = await Dexes.setOfficial(source, true);
		let target = await Dexes.createDex(owner, 'Target Dex', 'gen9');
		({ loaded: target } = await Dexes.putEffect(target, 'Moves', { name: 'Bulk Two', type: 'Water' }));
		for (const name of ['Tackle', 'Surf']) ({ loaded: target } = await Dexes.putEffect(target, 'Moves', { name, basePower: 77 }));
		const { crqHandlers } = require('../../dist/server/chat-plugins/dexes');
		const edit = input => crqHandlers.dexedit.call({ connection: {} }, `${target.row.dexid}, ${JSON.stringify(input)}`, owner);
		const added = await edit({ addpokemon: { from: source.row.dexid, names: ['Bulkmon', 'Okmon'] } });
		assert.equal(added.skipped.length, 1);
		assert.match(added.skipped[0], /^Bulkmon: .*own version/);
		assert(Dexes.getDex('targetdex').entries.has('okmon') && !Dexes.getDex('targetdex').entries.has('bulkmon'));
		assert.equal((await edit({ addmove: { from: source.row.dexid, names: ['Bulk One', 'Bulk Two'] } })).skipped.length, 1);
		const moves = () => Dexes.getDex('targetdex').effects.Moves;
		assert(moves().has('bulkone'));
		const reset = await edit({ resetmove: ['Tackle', 'Surf'] });
		assert.equal(reset.error, undefined);
		assert(!moves().has('tackle') && !moves().has('surf'));
		assert.equal(reset.hash, Dexes.getDex('targetdex').data.hash);
		assert.equal(reset.dex.hash, reset.hash);
		assert(reset.entries.Moves.includes('bulkone'));
		assert(reset.dexes.some(summary => summary.id === target.row.dexid && summary.hash === reset.hash));
		assert.equal((await edit({ deletemove: ['Bulk One', 'Bulk Two'] })).error, undefined);
		assert.equal(moves().size, 0);
		const before = Dexes.getDex('targetdex');
		const rejected = await edit({ pokemon: [{ name: 'Pikachu', weightkg: 99 }, { name: 'Eevee', types: ['Fire'] }], move: [{ name: 'Tackle', basePower: 60 }, { name: 'Surf', basePower: -5 }] });
		assert.match(rejected.error, /^Surf: /);
		assert.equal(Dexes.getDex('targetdex'), before);
		await Dexes.refresh(before.row.dexid);
		assert.equal(Dexes.getDex('targetdex').dex.species.get('Pikachu').weightkg, 6);
		assert(!Dexes.getDex('targetdex').entries.has('eevee'));
		const saved = await edit({ pokemon: [{ name: 'Pikachu', weightkg: 99 }, { name: 'Eevee', types: ['Fire'] }], move: [{ name: 'Tackle', basePower: 60 }, { name: 'Surf', basePower: 80 }] });
		assert.equal(saved.error, undefined);
		assert.equal(Dexes.getDex('targetdex').dex.species.get('Pikachu').weightkg, 99);
		assert.deepEqual(Dexes.getDex('targetdex').dex.species.get('Eevee').types, ['Fire']);
		assert.equal(Dexes.getDex('targetdex').dex.moves.get('Surf').basePower, 80);
	});

	it('should make a dex with every Pokemon in its base mod', async () => {
		const loaded = await Dexes.createDex(owner, 'Mocha Dex', 'gen9');
		assert.equal(loaded.row.ownerid, OWNER);
		assert(loaded.row.species.includes('pikachu'));
		assert(!loaded.row.species.includes('pikachuworld') || Dex.species.get('Pikachu-World').isNonstandard === null);
		await assert.rejects(Dexes.createDex(owner, 'mocha dex', 'gen9'), /already a dex/);
		await assert.rejects(Dexes.createDex(owner, 'Other', 'nosuchmod'), /isn't a world/);
	});

	it('should let an account own any number of dexes that fit in its data storage', async () => {
		const size = Dexes.dataSize(await Dexes.createDex(owner, 'Dex 0', 'gen9'));
		const fit = Math.floor(Dexes.MAX_DATA_STORAGE / size);
		for (let i = 1; i < fit; i++) await Dexes.createDex(owner, `Dex ${i}`, 'gen9');
		assert.equal(Dexes.dataUsed(OWNER), fit * size);
		await assert.rejects(Dexes.createDex(owner, 'One Too Many', 'gen9'), /dex data storage/);
		assert.equal(Dexes.dexes.size, fit);
		assert.equal(Dexes.dataUsed(EDITOR), 0);
		await Dexes.createDex(editor, 'Editor Dex', 'gen9');
	});

	it('should take Pokemon out of a dex and put them back from its world, with their formes', async () => {
		await fixture();
		const { crqHandlers } = require('../../dist/server/chat-plugins/dexes');
		const mocha = id('Mocha Dex');
		const entries = await crqHandlers.dexentries.call(null, mocha, owner);
		assert(entries.world.includes('rotomwash') && !entries.world.includes('charizardmegax'));
		assert(entries.needed.includes('par') && entries.needed.includes('raindance') && entries.needed.length < entries.Conditions.length);
		const edit = input => crqHandlers.dexedit.call({ connection: {} }, `${mocha}, ${JSON.stringify(input)}`, owner);
		assert.equal((await edit({ deletepokemon: ['Rotom', 'Charizard', 'Pikachu-Alola'] })).error, undefined);
		const removed = Dexes.getDex('mochadex').data.species;
		assert(!removed.includes('rotom') && !removed.includes('rotomwash') && !removed.includes('pikachualola'));
		assert(removed.includes('pikachu'));
		assert.match((await edit({ addpokemon: { names: ['Nosuchmon'] } })).skipped[0], /isn't in/);
		assert.deepEqual((await edit({ addpokemon: { names: ['Rotom', 'Pikachu-Alola', 'Pikachu'] } })).skipped, ['Pikachu is already in Mocha Dex']);
		const added = Dexes.getDex('mochadex').data.species;
		assert(added.includes('rotomwash') && added.includes('pikachualola') && !added.includes('charizard'));
		assert.equal((await edit({ addpokemon: { from: 'gen1', names: ['Charizard'] } })).error, undefined);
		const charizard = Dexes.getDex('mochadex').dex.species.get('Charizard');
		assert.equal(charizard.baseStats.spa, 85);
		assert(Dexes.getDex('mochadex').data.species.includes('charizard') && !Dexes.getDex('mochadex').data.species.includes('charizardmegax'));
		assert.equal((await edit({ resetpokemon: 'Charizard' })).error, undefined);
		assert.equal(Dexes.getDex('mochadex').dex.species.get('Charizard').baseStats.spa, 109);
		assert.match((await edit({ addpokemon: { from: 'mochadex', names: ['Pikachu'] } })).error, /main games and official dexes/);
		assert.match((await edit({ pokemon: { name: 'Pikachu', evos: ['Pikachu'] } })).error, /Pikachu can't evolve into itself/);
		assert.equal((await edit({ deletemove: ['Thunderbolt'], deleteitem: 'Leftovers' })).error, undefined);
		assert.deepEqual(Dexes.getDex('mochadex').data.lists, { Moves: { added: [], removed: ['thunderbolt'] }, Items: { added: [], removed: ['leftovers'] } });
		const listed = await crqHandlers.dexentries.call(null, mocha, owner);
		assert(!listed.Moves.includes('thunderbolt') && listed.Moves.includes('thundershock'));
		assert.match((await edit({ deletecondition: 'par' })).error, /comes with/);
		assert.deepEqual((await edit({ addmove: { names: ['Thunderbolt', 'Hidden Power', 'Tackle'] }, additem: { names: ['Leftovers'] } })).skipped,
			['Tackle is already in Mocha Dex']);
		assert.deepEqual(Dexes.getDex('mochadex').data.lists, { Moves: { added: ['hiddenpower'], removed: [] } });
		assert.equal(Dexes.getDex('mochadex').dex.moves.get('Hidden Power').isNonstandard, null);
		assert.deepEqual((await edit({ addmove: { from: 'gen1', names: ['Bite'] } })).skipped, ['Bite is already in Mocha Dex']);
		assert.equal((await edit({ deletemove: 'Bite' })).error, undefined);
		assert.equal((await edit({ addmove: { from: 'gen1', names: ['Bite'] } })).error, undefined);
		assert.equal(Dexes.getDex('mochadex').dex.moves.get('Bite').type, 'Normal');
		assert.equal((await edit({ resetmove: 'Bite', deletemove: 'Hidden Power' })).error, undefined);
		assert.equal(Dexes.getDex('mochadex').data.lists, undefined);
		assert.deepEqual((await crqHandlers.dexsource.call(null, `${mocha}, gen1, move`, owner)).species.length, 165);
		const uranium = await Dexes.createDex(editor, 'Uranium Test', 'gen9uranium');
		const geiger = await Dexes.forkEntry(Dexes.getDex('mochadex'), uranium, 'Abilities', 'Geiger Sense');
		assert.deepEqual(geiger.copied, ['ability Geiger Sense']);
		const wind = await Dexes.forkEntry(Dexes.getDex('mochadex'), uranium, 'Moves', 'Nuclear Wind');
		assert.deepEqual(wind.copied, ['move Nuclear Wind', 'condition Fallout']);
		const forked = Dexes.getDex('mochadex');
		assert.equal(forked.effects.Abilities.get('geigersense').inheritsfrom, 'gen9uranium:geigersense');
		assert.equal(typeof forked.dex.abilities.get('Geiger Sense').onSwitchIn, 'function');
		assert.equal(forked.dex.conditions.get('fallout').effectType, 'Weather');
		await Dexes.deleteEffects(forked, 'Moves', ['Nuclear Wind']);
		await Dexes.deleteEffects(Dexes.getDex('mochadex'), 'Abilities', ['Geiger Sense']);
		await Dexes.deleteEffects(Dexes.getDex('mochadex'), 'Conditions', ['Fallout']);
		await Dexes.deleteDex(Dexes.getDex('uraniumtest'));
		assert.match((await edit({ pokemon: { name: 'Pichu', prevo: 'Raichu' } })).error, /evolve into each other in a loop/);
		assert.deepEqual((await crqHandlers.dexsource.call(null, `${mocha}, gen1`, owner)).species.length, 151);
		assert.match((await crqHandlers.dexedit.call({ connection: {} }, `${mocha}, ${JSON.stringify({ addpokemon: { names: ['Charizard'] } })}`, editor)).error, /edit/);
	});

	it('should make custom Pokemon, edit existing ones, and play them in its formats', async () => {
		await fixture();
		let loaded = await Dexes.editable(owner, 'mochadex');
		({ loaded } = await Dexes.putEntry(loaded, {
			name: 'Voltlet', inheritsFrom: 'Pikachu', types: ['Electric', 'Steel'],
			learnset: { protect: ['9M'] },
		}));
		({ loaded } = await Dexes.putEntry(loaded, {
			name: 'Pikachu', baseStats: { hp: 255, atk: 255, def: 255, spa: 255, spd: 255, spe: 255 },
		}));
		await assert.rejects(Dexes.putEntry(loaded, {
			name: 'Pikachu', baseStats: { hp: 256, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
		}), /from 0 to 255/);
		await assert.rejects(Dexes.putEntry(loaded, { name: 'Bad', types: ['Electric'] }), /is required/);
		await assert.rejects(Dexes.putEntry(loaded, { name: 'Bad', inheritsFrom: 'Pikachu', speed: 1 }), /isn't something/);

		const voltlet = loaded.entries.get('voltlet');
		assert(voltlet.num <= -10001);
		assert(loaded.data.species.includes('voltlet'));
		assert.equal(loaded.data.Pokedex.voltlet.baseStats.spe, Dex.species.get('Pikachu').baseStats.spe);
		assert.equal(loaded.data.Pokedex.pikachu.num, 25);
		assert(loaded.data.Learnsets.voltlet.learnset.thunderbolt);

		let formatid;
		({ loaded, formatid } = await Dexes.putFormat(loaded, { name: 'OU', ruleset: ['Standard'] }));
		assert.match(formatid, /^f[0-9a-f]{10}$/);
		assert.equal(Dex.formats.get(formatid).name, '[Mocha Dex] OU');
		assert.equal(Dexes.battleData(formatid).format.name, '[Mocha Dex] OU');
		assert.equal(Dexes.battleData('gen9ou'), undefined);
		await assert.rejects(Dexes.putFormat(loaded, { name: 'OU', gameType: 'doubles' }), /can't change/);
		await assert.rejects(Dexes.putFormat(loaded, { name: 'Broken', ruleset: ['No Such Rule'] }), /doesn't work/);

		const validator = TeamValidatorAsync.get(formatid);
		assert.equal((await validator.validateTeam(team('Voltlet'))).charAt(0), '1');
		await Dexes.setSpecies(Dexes.getDex('mochadex'), Dexes.findSpecies(loaded, ['Pikachu']), false);
		const result = await TeamValidatorAsync.get(formatid).validateTeam(team('Pikachu'));
		assert(result.startsWith('0') && result.includes(`isn't in this dex`), result);
		await Dexes.deleteEffects(Dexes.getDex('mochadex'), 'Moves', ['Thunderbolt']);
		const removed = await TeamValidatorAsync.get(formatid).validateTeam(team('Voltlet'));
		assert(removed.startsWith('0') && removed.includes(`Thunderbolt isn't in this dex`), removed);
		await Dexes.addEffects(Dexes.getDex('mochadex'), 'Moves', '', ['Thunderbolt']);
		assert.equal((await TeamValidatorAsync.get(formatid).validateTeam(team('Voltlet'))).charAt(0), '1');
	});

	it('should let only its owner and editors change it', async () => {
		await fixture();
		await assert.rejects(Dexes.editable(editor, 'mochadex'), /can't edit/);
		LoginServer.request = async (action, { userid }) => [userid === 'nobody' ? { names: [] } : { discordid: EDITOR }];
		await assert.rejects(Dexes.setEditor(Dexes.getDex('mochadex'), 'Nobody', true), /hasn't logged in/);
		let loaded = await Dexes.setEditor(Dexes.getDex('mochadex'), 'Dex Editor', true);
		assert.deepEqual([...loaded.editors], [[EDITOR, 'Dex Editor']]);
		assert(await Dexes.editable(editor, 'mochadex'));
		loaded = await Dexes.setEditor(loaded, 'Dex Editor', false);
		await assert.rejects(Dexes.editable(editor, 'mochadex'), /can't edit/);
		await assert.rejects(Dexes.setEditor(loaded, 'Dex Editor', false), /isn't an editor/);
		LoginServer.request = async () => [{ discordid: OWNER }];
		await assert.rejects(Dexes.setEditor(loaded, 'Dex Owner', true), /owns/);
		LoginServer.request = async () => [{ discordid: EDITOR }];
		await Dexes.setEditor(loaded, 'Dex Editor', true);
		assert(await Dexes.editable(editor, 'mochadex'));
		LoginServer.request = request;
	});

	it('should keep sprites by their contents', async () => {
		await fixture({ sprites: true });
		const loaded = await Dexes.setSprite(owner, Dexes.getDex('mochadex'), 'Voltlet', 'front', png(96, 96));
		const image = loaded.uploads.get(loaded.entries.get('voltlet').sprites.front);
		assert.match(image.sha, /^[0-9a-f]{64}$/);
		assert.equal(image.accountid, OWNER);
		assert.equal(image.dexname, 'Mocha Dex');
		const row = await Dexes.database().queryOne(require('../../dist/lib/database').SQL`
			SELECT width FROM dex_sprites WHERE sha = ${image.sha}
		`);
		assert.equal(row.width, 96);
		assert.deepEqual(Dexes.clientData(loaded).sprites.voltlet, { front: image.uploadid });
		assert.equal(Dexes.clientData(loaded).images[image.uploadid].uploader, 'Dex Owner');
		assert.equal(Dexes.clientData(loaded).images[image.uploadid].file, `${image.sha}.png`);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Voltlet', 'icon', png(96, 96)), /at most 40x40/);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Voltlet', 'front', 'bm90IGEgcG5n'), /PNG or GIF/);
		const used = Dexes.spritesUsed(OWNER);
		assert(used >= image.bytes && image.bytes > 0);
		let again = await Dexes.setSprite(owner, loaded, 'Voltlet', 'front-shiny', png(96, 96));
		assert.equal(Dexes.spritesUsed(OWNER), used);
		again = await Dexes.setSprite(owner, again, 'Voltlet', 'back-shiny', png(80, 80));
		assert(Dexes.spritesUsed(OWNER) > used);
		again = await Dexes.setSprite(owner, again, 'Voltlet', 'back-shiny', null);
		await Dexes.setSprite(owner, again, 'Voltlet', 'front-shiny', null);
		assert.equal(Dexes.spritesUsed(OWNER), used);
	});

	it('should keep GIFs of any size up to the limit, with their settings', async () => {
		await fixture();
		const settings = { artist: 'Mocha Artist' };
		const loaded = await Dexes.setSprite(owner, Dexes.getDex('mochadex'), 'Voltlet', 'back', gif(160, 150), settings);
		const uploadid = loaded.entries.get('voltlet').sprites.back;
		const image = Dexes.clientData(loaded).images[uploadid];
		assert.equal(image.file, `${loaded.uploads.get(uploadid).sha}.gif`);
		assert.equal(image.width, 160);
		assert.equal(image.height, 150);
		assert.equal(image.artist, 'Mocha Artist');
		assert(image.pixelated);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Voltlet', 'back', gif(193, 96)), /at most 192x192/);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Voltlet', 'back', gif(96, 96), { y: -16 }), /isn't a sprite setting/);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Voltlet', 'back', gif(96, 96), { flip: true }), /isn't a sprite setting/);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Voltlet', 'back', gif(96, 96), { size: 2 }), /isn't a sprite setting/);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Voltlet', 'back', gif(96, 96), { constructor: 2 }), /isn't a sprite setting/);
		const cleared = await Dexes.setSprite(owner, loaded, 'Voltlet', 'back', null);
		assert.equal(cleared.entries.get('voltlet').sprites.back, undefined);
	});

	it('should edit base Pokemon and items that get sprites', async () => {
		await fixture({ sprites: true });
		let loaded = await Dexes.createDex(owner, 'Sprite Dex', 'gen9');
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Leftovers', 'item', png(24, 24), { gen: 3 }), /isn't a sprite setting/);
		assert(!loaded.effects.Items.has('leftovers'));
		loaded = await Dexes.setSprite(owner, loaded, 'Leftovers', 'item', png(24, 24));
		assert.deepEqual(loaded.effects.Items.get('leftovers').data, { name: 'Leftovers' });
		assert.equal(Dexes.clientData(loaded).itemSprites.leftovers, loaded.effects.Items.get('leftovers').sprites.item);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Leftovers', 'item', png(65, 65)), /at most 64x64/);
		loaded = await Dexes.setSprite(owner, loaded, 'Pikachu', 'icon', png(40, 30));
		assert.deepEqual(loaded.entries.get('pikachu').data, { name: 'Pikachu' });
		assert.equal(loaded.data.Pokedex.pikachu.baseStats.spe, Dex.species.get('Pikachu').baseStats.spe);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Gastrodon-East', 'front-f', png(96, 96)), /Only official dexes/);
		loaded = await Dexes.setOfficial(loaded, true);
		loaded = await Dexes.setSprite(owner, loaded, 'Pikachu', 'front', png(400, 400), { y: -16, gen: 3 });
		const big = Dexes.clientData(loaded).images[loaded.entries.get('pikachu').sprites.front];
		assert.deepEqual([big.width, big.y, big.gen], [400, -16, 3]);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Pikachu', 'front', png(96, 96), { y: 200 }), /"y" must be/);
		loaded = await Dexes.setSprite(owner, loaded, 'Gastrodon-East', 'front-f', png(96, 96));
		assert.deepEqual(Object.keys(loaded.entries.get('gastrodon').sprites), ['gastrodoneast:front-f']);
		assert.deepEqual(Object.keys(Dexes.clientData(loaded).sprites.gastrodoneast), ['front-f']);
		assert.equal(Dexes.clientData(loaded).sprites.gastrodon, undefined);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Gastrodon', 'front-f', null), /has no front-f sprite/);
		loaded = await Dexes.setSprite(owner, loaded, 'Gastrodon-East', 'afd-front', png(96, 96));
		loaded = await Dexes.setSprite(owner, loaded, 'Gastrodon-East', 'front-f', null);
		assert.deepEqual(Object.keys(loaded.entries.get('gastrodon').sprites), ['gastrodoneast:afd-front']);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'No Such Item', 'item', png(24, 24)), /has no item called/);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Raichu', 'front', null), /has no custom or edited/);
		await Dexes.deleteDex(loaded);
	});

	it('should make and edit moves, abilities and items, including values in their code', async () => {
		await fixture();
		let loaded = Dexes.getDex('mochadex');
		({ loaded } = await Dexes.putEffect(loaded, 'Moves', { name: 'Scorch Soak', inheritsFrom: 'Soak', type: 'Fire' }));
		({ loaded } = await Dexes.putEffect(loaded, 'Moves', { name: 'Scorch Soak', slots: slotsOf(loaded, 'Moves', 'Scorch Soak', 'Water', 'Fire') }));
		let editor = Dexes.effectEditor(loaded, 'Moves', 'Scorch Soak');
		const onHit = editor.handlers.find(handler => handler.path === 'onHit');
		assert(onHit.slots.length && onHit.slots.every(slot => slot.value === 'Fire' && slot.original === 'Water' && slot.edited));
		assert.equal(editor.data.shortDesc, `Changes the target's type to Water.`);
		assert.equal(Dexes.clientData(loaded).Moves.scorchsoak.type, 'Fire');

		({ loaded } = await Dexes.putEffect(loaded, 'Items', { name: 'Choice Band', slots: { 'onModifyAtk:1': 3 } }));
		assert(Dexes.effectEditor(loaded, 'Items', 'Choice Band').data.shortDesc.startsWith(`Holder's Attack is 1.5×`));
		({ loaded } = await Dexes.putEffect(loaded, 'Items', { name: 'Volt Orb', inheritsFrom: 'Light Ball' }));
		({ loaded } = await Dexes.putEffect(loaded, 'Items', { name: 'Volt Orb', slots: slotsOf(loaded, 'Items', 'Volt Orb', 'Pikachu', 'Voltlet') }));
		assert.equal(Dexes.effectEditor(loaded, 'Items', 'Volt Orb').data.shortDesc,
			'If held by a Pikachu, its Attack and Sp. Atk are doubled.');
		({ loaded } = await Dexes.putEffect(loaded, 'Moves', {
			name: 'Volt Jab', type: 'Electric', category: 'Physical', basePower: 70, flags: { contact: 1 },
			secondary: { chance: 30, status: 'par' },
		}));
		assert(loaded.effects.Moves.get('voltjab').num <= -10002);
		({ loaded } = await Dexes.putEffect(loaded, 'Moves', { name: 'Shield', inheritsFrom: 'Protect' }));
		editor = Dexes.effectEditor(loaded, 'Moves', 'Shield');
		assert.equal(loaded.dex.moves.get('Shield').volatileStatus, 'shield');
		assert.equal(loaded.dex.moves.get('Shield').countsAs, 'protect');
		assert.equal(loaded.dex.moves.get('Volt Jab').countsAs, undefined);

		await assert.rejects(Dexes.putEffect(loaded, 'Moves', { name: 'Scorch Soak', slots: { 'onHit:0': 'Fyre' } }), /isn't a type/);
		await assert.rejects(Dexes.putEffect(loaded, 'Moves', { name: 'Scorch Soak', onHit: 1 }), /only be changed in official dexes/);
		await assert.rejects(Dexes.putEffect(loaded, 'Moves', { name: 'Scorch Soak', basePower: 'lots' }), /whole number/);
		await assert.rejects(Dexes.putEffect(loaded, 'Moves', { name: 'Scorch Soak', speed: 1 }), /only be changed in official dexes/);
		await assert.rejects(Dexes.putEffect(loaded, 'Moves', { name: 'Scorch Soak', type: null }), /can't be removed/);

		({ loaded } = await Dexes.putEffect(loaded, 'Items', { name: 'Choice Scarf', events: { onModifySpe: 'atk' } }));
		assert.equal(loaded.dex.items.get('Choice Scarf').onModifySpe, undefined);
		assert(Dexes.effectEditor(loaded, 'Items', 'Choice Scarf').data.shortDesc.startsWith(`Holder's Speed is 1.5×`));
		await assert.rejects(Dexes.putEffect(loaded, 'Items', { name: 'Choice Scarf', events: { onModifySpe: 'hp' } }), /can become/);
		({ loaded } = await Dexes.putEffect(loaded, 'Abilities', { name: 'Intimidate', slots: slotsOf(loaded, 'Abilities', 'Intimidate', -1, -2) }));
		assert(loaded.dex.abilities.get('Intimidate').onStart.toString().includes('atk: (-2)'));

		({ loaded } = await Dexes.putEntry(loaded, { name: 'Voltlet', learnset: { voltjab: ['9L1'], scorchsoak: ['9M'] } }));
		const result = await TeamValidatorAsync.get(formatOf('Mocha Dex', 'OU')).validateTeam(Teams.pack([{
			species: 'Voltlet', ability: 'Static', item: 'Volt Orb', moves: ['voltjab', 'scorchsoak'], evs: { hp: 4 }, nature: 'Adamant',
		}]));
		assert.equal(result.charAt(0), '1', result);

		loaded = await Dexes.deleteEffect(loaded, 'Items', ['Choice Band']);
		assert(Dex.mod(loaded.data.mod).items.get('choiceband').exists);
		assert.equal(loaded.data.effects.Items.choiceband, undefined);
	});

	it("should count sprites toward the storage of the dex's owner, whoever uploads them", async () => {
		await fixture({ editorAccess: true });
		const loaded = await Dexes.setSprite(editor, Dexes.getDex('mochadex'), 'Voltlet', 'front', png(96, 96));
		const image = loaded.uploads.get(loaded.entries.get('voltlet').sprites.front);
		assert.equal(image.accountid, EDITOR);
		assert.equal(Dexes.spritesUsed(OWNER), image.bytes);
		assert.equal(Dexes.spritesUsed(EDITOR), 0);
	});

	it('should hide private dexes from lists and searches, but not from their exact names', async () => {
		await fixture({ editorAccess: true });
		let loaded = Dexes.getDex('mochadex');
		assert.deepEqual(Dexes.search('mocha', null).map(dex => dex.row.dexid), [id('Mocha Dex')]);
		loaded = await Dexes.setVisibility(loaded, 'private');
		assert.deepEqual(Dexes.search('mocha', null), []);
		assert.deepEqual(Dexes.search('mocha', EDITOR).map(dex => dex.row.dexid), [id('Mocha Dex')]);
		assert.equal(Dexes.getDex('Mocha Dex').row.visibility, 'private');
		await assert.rejects(Dexes.setVisibility(loaded, 'locked'), /public or private/);
		await Dexes.setVisibility(loaded, 'public');
	});

	it('should fork entries with what they need, and keep them up to date until they are edited', async () => {
		await fixture({ sprites: true, effects: true });
		let source = Dexes.getDex('mochadex');
		let copy = await Dexes.createDex(editor, 'Copy Dex', 'gen9');
		let result = await Dexes.forkEntry(copy, source, 'Pokedex', 'Voltlet');
		copy = result.loaded;
		assert(result.copied.includes('Pokemon Voltlet'));
		assert(result.copied.includes('move Volt Jab'));
		assert(result.copied.includes('move Scorch Soak'));
		const voltlet = copy.entries.get('voltlet');
		assert.equal(voltlet.trackdex, id('Mocha Dex'));
		assert.deepEqual([voltlet.origin.dex, voltlet.origin.owner], ['Mocha Dex', 'Dex Owner']);
		assert.equal(voltlet.sprites.front, source.entries.get('voltlet').sprites.front);
		assert(copy.dex.moves.get('Volt Jab').exists);

		({ loaded: source } = await Dexes.putEntry(source, { name: 'Voltlet', types: ['Electric', 'Fairy'] }));
		copy = Dexes.getDex('copydex');
		assert.deepEqual(copy.data.Pokedex.voltlet.types, ['Electric', 'Fairy']);
		({ loaded: copy } = await Dexes.putEntry(copy, { name: 'Voltlet', types: ['Electric'] }));
		assert.equal(copy.entries.get('voltlet').trackdex, null);
		assert.equal(copy.entries.get('voltlet').origin.dex, 'Mocha Dex');
		await Dexes.putEntry(source, { name: 'Voltlet', types: ['Electric', 'Dragon'] });
		assert.deepEqual(Dexes.getDex('copydex').data.Pokedex.voltlet.types, ['Electric']);

		await assert.rejects(Dexes.forkEntry(Dexes.getDex('copydex'), Dexes.getDex('mochadex'), 'Pokedex', 'Voltlet'), /overwrite/);
		await assert.rejects(Dexes.forkEntry(Dexes.getDex('mochadex'), Dexes.getDex('copydex'), 'Moves', 'Volt Jab', true),
			/comes from Mocha Dex already/);

		const whole = await Dexes.createDex(editor, 'Whole Copy', 'gen9');
		result = await Dexes.forkEntry(whole, Dexes.getDex('mochadex'), 'Pokedex', 'Voltlet');
		result = await Dexes.forkEntry(result.loaded, Dexes.getDex('mochadex'), 'Items', 'Volt Orb');
		assert.equal(result.loaded.entries.get('voltlet').trackdex, id('Mocha Dex'));
		assert.deepEqual(result.loaded.data.Pokedex.voltlet.types, ['Electric', 'Dragon']);

		({ loaded: source } = await Dexes.putEffect(Dexes.getDex('mochadex'), 'Items', { name: 'Volt Orb', spriteFrom: 'Leftovers' }));
		assert.equal(source.dex.items.get('Volt Orb').spritenum, Dex.items.get('Leftovers').spritenum);
		assert.equal(Dexes.getDex('wholecopy').dex.items.get('Volt Orb').spritenum, Dex.items.get('Leftovers').spritenum);
	});

	it('should delete a sprite everywhere it was forked, but only for its uploader', async () => {
		await fixture({ sprites: true, effects: true, copies: true });
		const uploadid = Dexes.getDex('mochadex').entries.get('voltlet').sprites.front;
		await assert.rejects(Dexes.deleteSprite(editor, uploadid), /Only Dex Owner/);
		const { uses } = await Dexes.deleteSprite(owner, uploadid);
		assert.equal(uses, 3);
		for (const dexid of ['mochadex', 'copydex', 'wholecopy']) {
			assert.equal(Dexes.getDex(dexid).entries.get('voltlet').sprites.front, undefined);
		}
		const loaded = await Dexes.setSprite(owner, Dexes.getDex('mochadex'), 'Voltlet', 'front', png(96, 96));
		assert(Dexes.getDex('wholecopy').entries.get('voltlet').sprites.front);
		assert(loaded.entries.get('voltlet').sprites.front !== uploadid);
	});

	it('should list a dex\'s custom and modified entries, count them, and answer every request about it', async () => {
		await fixture({ sprites: true, effects: true });
		const { crqHandlers } = require('../../dist/server/chat-plugins/dexes');
		const mocha = id('Mocha Dex');
		const entries = await crqHandlers.dexentries.call(null, mocha, owner);
		assert.equal(entries.query, mocha);
		assert.deepEqual(entries.custom.Moves.sort(), ['scorchsoak', 'shield', 'voltjab']);
		assert.deepEqual(entries.modified.Moves, []);
		assert.deepEqual(entries.modified.Abilities, ['intimidate']);
		assert.deepEqual(entries.custom.Items, ['voltorb']);
		assert.deepEqual(entries.modified.Items, ['choicescarf']);
		assert(entries.Moves.includes('voltjab') && entries.Moves.includes('thunderbolt'));
		assert.equal(await crqHandlers.dexentries.call(null, mocha, owner).then(again => again.Moves), entries.Moves);

		const [dex] = await crqHandlers.dexes.call({ connection: {} }, 'mocha dex', owner);
		const moves = dex.counts.find(count => count.table === 'Moves');
		assert.deepEqual([moves.custom, moves.modified, moves.total], [3, 0, entries.Moves.length]);
		assert.equal(moves.customIds, undefined);

		assert.deepEqual(await crqHandlers.dexentries.call(null, 'nosuchdex', owner), { query: 'nosuchdex', missing: true });
		const effect = await crqHandlers.dexeffect.call(null, `${mocha}, move, protect`, owner);
		assert.equal(effect.query, `${mocha}, move, protect`);
		assert.equal(effect.dexid, mocha);
		assert(effect.source.some(([path, code]) => path === 'condition.onTryHit' && code.startsWith('onTryHit(')));
		const scorch = await crqHandlers.dexeffect.call(null, `${mocha}, move, scorchsoak`, owner);
		assert(scorch.source.find(([path]) => path === 'onHit')[1].includes('"Fire"'));

		const crashlog = Monitor.crashlog;
		Dexes.dexes.set('dbroken', { row: { dexid: 'dbroken', name: 'Broken' } });
		Monitor.crashlog = () => {};
		try {
			assert.deepEqual(await crqHandlers.dexentries.call(null, 'dbroken', owner), {
				query: 'dbroken', error: 'Something went wrong. Try again.',
			});
		} finally {
			Dexes.dexes.delete('dbroken');
			Object.assign(Monitor, { crashlog });
		}
	});

	it('should edit conditions only through what needs them, and copy a Pokemon\'s own condition with it', async () => {
		await fixture();
		const { crqHandlers } = require('../../dist/server/chat-plugins/dexes');
		const mocha = id('Mocha Dex');
		const edit = input => crqHandlers.dexedit.call({ connection: {} }, `${mocha}, ${JSON.stringify(input)}`, owner);
		const [dex] = await crqHandlers.dexes.call({ connection: {} }, 'mocha dex', owner);
		assert(!dex.counts.some(count => count.table === 'Conditions'));

		const wisp = await crqHandlers.dexeffect.call(null, `${mocha}, move, willowisp`, owner);
		assert(wisp.conditions.brn.users.includes('Will-O-Wisp') && wisp.conditions.brn.users.includes('Scald'));
		assert(wisp.conditions.brn.handlers.length);
		const burn = await crqHandlers.dexeffect.call(null, `${mocha}, condition, brn`, owner);
		assert.deepEqual(burn.users, wisp.conditions.brn.users);
		assert.equal(burn.conditions, undefined);

		assert.match((await edit({ condition: { name: 'Hot Sauce', duration: 3 } })).error, /come with what needs them/);
		assert.equal((await edit({ condition: { name: 'brn', noCopy: true } })).error, undefined);

		assert.equal((await edit({ pokemon: { name: 'Arceon', inheritsFrom: 'Arceus' } })).error, undefined);
		let loaded = Dexes.getDex(mocha);
		assert.equal(loaded.dex.data.Conditions.arceon.name, 'Arceon');
		assert.equal(typeof loaded.dex.species.get('Arceon').onType, 'function');
		const arceon = await crqHandlers.dexeffect.call(null, `${mocha}, condition, arceon`, owner);
		assert(arceon.handlers.some(handler => handler.path === 'onType'));
		assert.equal((await edit({ pokemon: { name: 'Arceon', types: ['Fire'] } })).error, undefined);
		assert.equal((await edit({ deletepokemon: ['Arceon'] })).error, undefined);
		loaded = Dexes.getDex(mocha);
		assert.equal(loaded.dex.data.Conditions.arceon, undefined);
		assert(!loaded.effects.Conditions.has('arceon'));
	});

	it('should credit accounts and names on a sprite, letting only its uploader and dex owner change them', async () => {
		await fixture({ sprites: true, editorAccess: true });
		const { crqHandlers } = require('../../dist/server/chat-plugins/dexes');
		const mocha = id('Mocha Dex');
		const loaded = await Dexes.setSprite(owner, Dexes.getDex(mocha), 'Voltlet', 'back', png(96, 96), { artist: 'Old Artist' });
		const { front, back } = loaded.entries.get('voltlet').sprites;
		const profile = account => ({
			discordid: account, name: account === OWNER ? 'Dex Owner' : 'Dex Editor', names: [], username: 'handle',
			globalname: null, avatar: `https://cdn.example/${account}.png`,
		});
		LoginServer.request = async (action, data) => {
			if (action === 'discord/profiles') return [{ profiles: data.ids.split(',').filter(each => [OWNER, EDITOR].includes(each)).map(profile) }];
			if (action === 'discord/search') return [{ profiles: /edit/i.test(data.query) ? [profile(EDITOR)] : [] }];
			return [null];
		};
		try {
			const call = (cmd, target, who = owner) => crqHandlers[cmd].call({ connection: {} }, target, who);
			const set = (credits, who) => call('dexsetcredits', `${front}, ${JSON.stringify({ credits })}`, who);
			const listed = await call('dexcredits', `${front},${back}`);
			assert.deepEqual(listed.credits, { [front]: [], [back]: [{ name: 'Old Artist' }] });
			assert.deepEqual([listed.account, listed.editable], [OWNER, { [front]: true, [back]: true }]);
			assert.deepEqual((await call('dexcredits', front, editor)).editable, { [front]: false });

			const editorCredit = { account: EDITOR, name: 'Dex Editor', username: 'handle', avatar: `https://cdn.example/${EDITOR}.png` };
			const saved = await set([{ account: EDITOR }, { name: 'Some Artist' }, { name: 'some artist' }, { account: EDITOR }]);
			assert.deepEqual(saved.credits, [editorCredit, { name: 'Some Artist' }]);
			assert.deepEqual((await call('dexcredits', front)).credits[front], saved.credits);
			assert.match((await set([{ account: '999' }])).error, /doesn't exist/);
			assert.match((await set([{ name: '  ' }])).error, /needs an account/);
			assert.match((await set(new Array(9).fill({ name: 'X' }).map((each, i) => ({ name: `X${i}` })))).error, /at most 8/);
			assert.match((await set([{ name: 'Someone Else' }], editor)).error, /Only the uploader/);
			assert.deepEqual((await set([{ name: 'Some Artist' }], editor)).credits, [{ name: 'Some Artist' }]);
			assert.match((await set([], editor)).error, /Only the uploader/);

			assert.deepEqual((await set([], owner)).credits, []);
			assert.deepEqual((await call('dexcredits', back)).credits[back], [{ name: 'Old Artist' }]);
			const suggested = (await call('dexcreditsearch', `${mocha}, `)).profiles.map(each => each.account);
			assert.deepEqual(suggested.sort(), [OWNER, EDITOR].sort());
			assert.deepEqual((await call('dexcreditsearch', `${mocha}, Editor`)).profiles, [editorCredit]);
			assert.deepEqual((await call('dexeditors', mocha)).people.map(each => each.account), [OWNER, EDITOR]);
		} finally {
			LoginServer.request = request;
		}
	});

	it('should count only what exists in a dex\'s generation, and tell outright bans from tag bans', async () => {
		await fixture();
		const { crqHandlers } = require('../../dist/server/chat-plugins/dexes');
		let loaded = await Dexes.createDex(owner, 'Old Dex', 'gen7');
		const entries = await crqHandlers.dexentries.call(null, loaded.row.dexid, owner);
		assert(entries.Items.includes('leftovers'));
		assert(!entries.Items.includes('heavydutyboots'));
		assert(!entries.Moves.includes('dynamaxcannon'));

		({ loaded } = await Dexes.putFormat(loaded, { name: 'OU', ruleset: ['Standard'], banlist: ['Uber', 'Pikachu'] }));
		const details = Dexes.formatDetails(formatOf('Old Dex', 'OU'));
		assert(details.outright.includes('pikachu'));
		assert(details.banned.pokemon.includes('mewtwo'));
		assert(!details.outright.includes('mewtwo'));
		assert(details.legal.pokemon.includes('bulbasaur'));

		({ loaded } = await Dexes.putType(loaded, { name: 'Cosmic', damageTaken: { Dark: 2 } }));
		await assert.rejects(Dexes.putType(loaded, { name: 'Cosmic', color: '#3b3f8f' }), /isn't something you can set/);
		await assert.rejects(Dexes.putType(loaded, { name: 'Cosmic', removed: true }), /Delete Cosmic instead/);

		({ loaded } = await Dexes.putType(loaded, { name: 'Fairy', attacks: { Cosmic: 2 }, removed: true }));
		assert(!loaded.dex.types.names().includes('Fairy'));
		assert.equal(loaded.dex.getEffectiveness('Fairy', 'Dragon'), 0);
		assert.equal(loaded.dex.getEffectiveness('Dragon', 'Fairy'), 0);
		assert.equal(loaded.dex.getImmunity('Dragon', 'Fairy'), true);
		assert.equal(loaded.dex.getEffectiveness('Fairy', 'Cosmic'), 0);
		assert(!('Cosmic' in loaded.dex.types.get('Fairy').damageTaken));
		({ loaded } = await Dexes.putType(loaded, { name: 'Fairy', removed: null }));
		assert(loaded.dex.types.names().includes('Fairy'));
		assert.equal(loaded.dex.getEffectiveness('Fairy', 'Dragon'), 1);
		assert.equal(loaded.dex.getEffectiveness('Fairy', 'Cosmic'), 1);
		loaded = await Dexes.deleteEffect(loaded, 'TypeChart', ['Fairy']);
		assert.equal(loaded.dex.getEffectiveness('Fairy', 'Cosmic'), 0);

		loaded = await Dexes.setSprite(owner, loaded, 'water', 'type', png(32, 14));
		const water = Dexes.clientData(loaded);
		assert(water.images[water.typeSprites.water]);
		({ loaded } = await Dexes.putType(loaded, { name: 'Water', damageTaken: { Fire: 1 } }));
		assert(Dexes.clientData(loaded).typeSprites.water);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Shadow', 'type', png(32, 14)), /has no type called/);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Water', 'type', png(65, 14)), /at most 64x64/);
		loaded = await Dexes.setSprite(owner, loaded, 'Water', 'type', null);
		assert(!Dexes.clientData(loaded).typeSprites);
		await Dexes.deleteDex(Dexes.getDex('olddex'));
	});

	it('should make chained formes, types, many Pokemon at once, and formats from existing ones', async () => {
		await fixture({ copy: true });
		let loaded = await Dexes.createDex(owner, 'Forme Dex', 'gen9');
		({ loaded } = await Dexes.putType(loaded, {
			name: 'Cosmic', damageTaken: { Dark: 2, sandstorm: 0 }, attacks: { Steel: 0.5 },
		}));
		assert.equal(loaded.dex.getEffectiveness('Dark', 'Cosmic'), 1);
		assert.equal(loaded.dex.getEffectiveness('Cosmic', 'Steel'), -1);
		assert(loaded.dex.types.get('Cosmic').damageTaken.sandstorm === 3);
		await assert.rejects(Dexes.putType(loaded, { name: 'Shadow Fire' }), /one word/);
		await assert.rejects(Dexes.putType(loaded, { name: 'Cosmic', attacks: { Steel: 3 } }), /must be one of/);

		({ loaded } = await Dexes.putEntries(loaded, [
			{
				name: 'Venusaur-Delta', baseSpecies: 'Venusaur', inheritsFrom: 'Venusaur', types: ['Fairy', 'Cosmic'],
				learnset: { protect: ['9M'], moonblast: ['9M'] },
			},
			{ name: 'Venusaur-Delta-Mega', baseSpecies: 'Venusaur-Delta', inheritsFrom: 'Venusaur-Mega', types: ['Fairy', 'Cosmic'] },
		]));
		loaded = await Dexes.setOfficial(loaded, true);
		({ loaded } = await Dexes.putEffect(loaded, 'Items', {
			name: 'Delta Venusaurite', inheritsFrom: 'Venusaurite', megaStone: { 'Venusaur-Delta': 'Venusaur-Delta-Mega' },
		}));
		await assert.rejects(Dexes.putEntry(loaded, { name: 'Bulbasaur-X', baseSpecies: 'Venusaur' }), /like "Venusaur-/);
		await assert.rejects(Dexes.putEntry(loaded, { name: 'Venusaur', baseSpecies: 'Bulbasaur' }), /can't change/);
		await assert.rejects(Dexes.deleteEffect(loaded, 'TypeChart', ['Cosmic']), /isn't in this dex/);
		await assert.rejects(Dexes.deleteEntry(loaded, ['Venusaur-Delta']), /isn't in this dex/);

		const { dex } = loaded;
		assert.deepEqual(dex.items.get('Delta Venusaurite').megaStone, { 'Venusaur-Delta': 'Venusaur-Delta-Mega' });
		const mega = dex.species.get('Venusaur-Delta-Mega');
		assert.deepEqual([mega.num, mega.forme, mega.battleOnly, mega.requiredItem], [3, 'Mega', 'Venusaur-Delta', 'Delta Venusaurite']);
		assert.deepEqual(dex.species.get('Venusaur').formeOrder.slice(-2), ['Venusaur-Delta', 'Venusaur-Delta-Mega']);
		assert(dex.species.get('Venusaur').otherFormes.includes('Venusaur-Delta'));
		assert.deepEqual(dex.species.get('Venusaur-Delta').otherFormes, ['Venusaur-Delta-Mega']);
		assert.equal(Dex.species.get('Venusaur').formeOrder.includes('Venusaur-Delta'), false);

		let formatid;
		({ loaded, formatid } = await Dexes.putFormat(loaded, { name: 'OU', from: 'gen9ou' }));
		assert.deepEqual(loaded.formats.get(formatid).ruleset, Dex.formats.get('gen9ou').ruleset);
		assert.deepEqual(loaded.formats.get(formatid).banlist, Dex.formats.get('gen9ou').banlist);
		await assert.rejects(Dexes.putFormat(loaded, { name: 'Random', from: 'gen9randombattle' }), /isn't a random battle/);
		const delta = { species: 'Venusaur-Delta', ability: 'Overgrow', moves: ['moonblast'], evs: { hp: 4 }, nature: 'Modest' };
		const validator = TeamValidatorAsync.get(formatid);
		assert.equal((await validator.validateTeam(Teams.pack([{ ...delta, item: 'Delta Venusaurite' }]))).charAt(0), '1');
		const clause = await validator.validateTeam(Teams.pack([delta, { ...delta, species: 'Venusaur', moves: ['gigadrain'] }]));
		assert(clause.includes('Species Clause'));
		const battle = new (require('../../dist/sim/battle').Battle)({ formatid, seed: [1, 2, 3, 4] });
		battle.setPlayer('p1', { team: Teams.pack([{ ...delta, item: 'Delta Venusaurite' }]) });
		battle.setPlayer('p2', { team: Teams.pack([{ ...delta, item: 'Venusaurite' }]) });
		assert.equal(battle.p1.pokemon[0].canMegaEvo, 'Venusaur-Delta-Mega');
		assert.equal(battle.p2.pokemon[0].canMegaEvo, null);
		battle.destroy();

		let tera;
		({ loaded, formatid: tera } = await Dexes.putFormat(loaded, { name: 'Tera', ruleset: ['Standard', 'Official Tera Types'] }));
		const teraValidator = TeamValidatorAsync.get(tera);
		assert.equal((await teraValidator.validateTeam(Teams.pack([delta]))).charAt(0), '1');
		assert.match(await teraValidator.validateTeam(Teams.pack([{ ...delta, teraType: 'Cosmic' }])), /Tera Type can't be Cosmic/);
		assert.equal((await validator.validateTeam(Teams.pack([{ ...delta, teraType: 'Cosmic' }]))).charAt(0), '1');

		let custom;
		({ loaded, formatid: custom } = await Dexes.putFormat(loaded, { name: 'Custom Game', from: 'gen9customgame' }));
		assert(Dex.formats.get(custom).debug);
		assert.equal(Dex.formats.get(custom).battle.trunc, Math.trunc);
		({ loaded } = await Dexes.putFormat(loaded, { name: 'Custom Game', debug: false }));
		assert.equal(Dex.formats.get(custom).battle, undefined);

		const { copied } = await Dexes.forkEntry(Dexes.getDex('copydex'), loaded, 'Pokedex', 'Venusaur-Delta-Mega');
		assert.deepEqual(copied.sort(), ['Pokemon Venusaur-Delta', 'Pokemon Venusaur-Delta-Mega', 'type Cosmic']);
		assert.equal(Dexes.getDex('copydex').dex.getEffectiveness('Cosmic', 'Steel'), -1);
		await Dexes.deleteDex(loaded);
	});

	it('should run a format on its own engine', async () => {
		await fixture();
		let loaded = Dexes.getDex('mochadex');
		({ loaded } = await Dexes.putEntry(loaded, { name: 'Voltling', inheritsFrom: 'Pichu', learnset: { spore: ['9L1'] } }));
		({ loaded } = await Dexes.putEntry(loaded, { name: 'Voltlet', prevo: 'Voltling' }));
		({ loaded } = await Dexes.putEffect(loaded, 'Moves', { name: 'Volt Jab', type: 'Electric', category: 'Physical', basePower: 70, pp: 40 }));
		const ou = formatOf('Mocha Dex', 'OU');
		assert.deepEqual(Dexes.formatDetails(ou).engines.map(engine => engine.id), ['', 'fusion', 'champions']);
		assert.equal(Dexes.formatDetails(ou).engine, '');

		let formatid;
		({ loaded, formatid } = await Dexes.putFormat(loaded, {
			name: 'Champions', ruleset: ['Flat Rules'], gameType: 'doubles', engine: 'champions',
		}));
		const engineDex = Dex.forFormat(Dex.formats.get(formatid));
		assert(engineDex.currentMod.startsWith('champions'));
		assert.equal(Dexes.formatDetails(formatid).mod, 'champions');
		assert.equal(Dexes.formatDetails(formatid).engine, 'champions');
		assert.equal(Dexes.battleData(formatid).engine, 'champions');
		assert.deepEqual(engineDex.species.getLearnsetData('voltlet').learnset.spore, ['9L1']);
		assert.equal(loaded.dex.species.getLearnsetData('voltlet').learnset.spore, undefined);
		assert.equal(engineDex.moves.get('Volt Jab').pp, 20);
		assert.equal(loaded.dex.moves.get('Volt Jab').pp, 40);
		const result = await TeamValidatorAsync.get(formatid).validateTeam(Teams.pack([{
			species: 'Voltlet', ability: 'Static', moves: ['spore', 'thunderbolt'], evs: { hp: 4 }, nature: 'Modest',
		}]));
		assert(!result.includes(`can't learn`) && !result.includes('crashed'), result);
		const battle = new (require('../../dist/sim/battle').Battle)({ formatid, seed: [1, 2, 3, 4] });
		assert(battle.dex.currentMod.startsWith('champions'));
		battle.destroy();
		await assert.rejects(Dexes.putFormat(loaded, {
			name: 'Champions', ruleset: ['Flat Rules', 'Infinite Fusion Mod'],
		}), /only have one engine/);

		({ loaded } = await Dexes.putFormat(loaded, { name: 'Champions', engine: 'fusion' }));
		assert.deepEqual(loaded.formats.get(formatid).ruleset, ['Flat Rules', 'Infinite Fusion Mod']);
		assert.equal(loaded.formats.get(formatid).engine, undefined);
		assert.equal(Dexes.formatDetails(formatid).engine, 'fusion');
		assert.equal(Dexes.battleData(formatid).engine, undefined);
		assert(Dex.formats.getRuleTable(Dex.formats.get(formatid)).has('infinitefusionmod'));
		({ loaded } = await Dexes.putFormat(loaded, { name: 'Champions', engine: '' }));
		assert.deepEqual(loaded.formats.get(formatid).ruleset, ['Flat Rules']);
		assert.equal(Dexes.formatDetails(formatid).engine, '');
		await assert.rejects(Dexes.putFormat(loaded, { name: 'Champions', engine: 'gen9mariomon' }), /"engine" must be one of/);
	});

	it('should build a fangame dex on an engine mod', async () => {
		await fixture();
		const bro = {
			types: ['Normal'], abilities: { 0: 'Forecast' }, baseStats: { hp: 80, atk: 100, def: 80, spa: 100, spd: 70, spe: 70 },
			eggGroups: ['Mariomon'], weightkg: 40,
		};
		let loaded = await Dexes.createDex(owner, 'Engine Dex', 'gen9mariomon');
		({ loaded } = await Dexes.putEffect(loaded, 'Moves', {
			name: 'Fire Ball', basePower: 25, category: 'Special', type: 'Fire', multihit: 3, flags: { metronome: null },
		}));
		({ loaded } = await Dexes.putEntries(loaded, [
			{ name: 'Hammer Bro', ...bro, doublesTier: '(DUU)', learnset: { fireball: ['9M'] } },
			{ name: 'Fire Bro', ...bro, types: ['Fire'], baseSpecies: 'Hammer Bro', forme: 'Fire Bro', battleOnly: 'Hammer Bro' },
			{ name: 'Weird Virus', ...bro, sameNumberAs: 'Hammer Bro', maxHP: 1 },
		]));
		const { dex } = loaded;
		assert.equal(dex.moves.get('Fire Ball').name, 'Fire Ball');
		assert.equal(Dex.moves.get('Fire Ball').name, 'G-Max Fireball');
		assert.equal(dex.moves.get('Fire Ball').flags.metronome, undefined);
		assert.deepEqual([dex.species.get('Hammer Bro').eggGroups, dex.species.get('Hammer Bro').doublesTier], [['Mariomon'], '(DUU)']);
		assert.deepEqual([dex.species.get('Fire Bro').baseSpecies, dex.species.get('Fire Bro').forme], ['Hammer Bro', 'Fire Bro']);
		assert.equal(dex.species.get('Weird Virus').num, dex.species.get('Hammer Bro').num);
		assert.equal(dex.species.get('Weird Virus').maxHP, 1);
		assert(dex.conditions.get('frb').exists);
		const { crqHandlers } = require('../../dist/server/chat-plugins/dexes');
		const entries = await crqHandlers.dexentries.call(null, id('Engine Dex'), owner);
		assert(entries.custom.Moves.includes('fireball'));
		assert.deepEqual(entries.custom.Items.sort(), ['goombaboots', 'sturdyshell']);
		assert(entries.custom.Abilities.includes('chaosemeralds'));
		assert(entries.modified.Abilities.includes('angerpoint'));
		await Dexes.deleteDex(loaded);
	});

	it('should build dexes on other dexes, keeping only their own changes', async () => {
		await fixture();
		const get = Dexes.getDex;
		await Dexes.putEntries(await Dexes.createDex(owner, 'Parent Dex', 'gen9'), [
			{ name: 'Sproutle', inheritsFrom: 'Bulbasaur', types: ['Grass'] },
			{ name: 'Pikachu', types: ['Electric', 'Steel'] },
		]);
		await Dexes.putFormat(get('parentdex'), { name: 'OU', from: 'gen9ou' });
		await assert.rejects(Dexes.createDex(editor, 'gen9', 'Parent Dex'), /name of a mod/);

		const child = await Dexes.createDex(editor, 'Child Dex', 'Parent Dex');
		assert.deepEqual(child.row.parents, [id('Parent Dex')]);
		assert.deepEqual(child.data.parents, [get('parentdex').data.hash]);
		assert(formatOf('Child Dex', 'OU'));
		assert.equal(child.data.Pokedex.sproutle, undefined);
		assert(child.data.species.includes('sproutle'));
		await Dexes.putEntry(child, { name: 'Sproutle', types: ['Grass', 'Fairy'] });
		assert.deepEqual(get('childdex').dex.species.get('Sproutle').types, ['Grass', 'Fairy']);
		assert.deepEqual(get('parentdex').dex.species.get('Sproutle').types, ['Grass']);

		await Dexes.putEntry(get('parentdex'), { name: 'Pikachu', types: ['Electric', 'Fire'] });
		assert.deepEqual(get('childdex').data.parents, [get('parentdex').data.hash]);
		assert.deepEqual(get('childdex').dex.species.get('Pikachu').types, ['Electric', 'Fire']);
		const [summary] = await require('../../dist/server/chat-plugins/dexes').crqHandlers.dexes.call({ connection: {} }, 'child dex', editor);
		const pokedex = summary.counts.find(count => count.table === 'Pokedex');
		assert.deepEqual([pokedex.custom, pokedex.modified], [1, 1]);
		await Dexes.setSpecies(get('childdex'), Dexes.findSpecies(get('childdex'), ['Bulbasaur']), false);
		assert(!get('childdex').data.species.includes('bulbasaur'));
		assert(get('parentdex').data.species.includes('bulbasaur'));
		await Dexes.putEntry(get('parentdex'), { name: 'Sproutle', heightm: 1 });
		assert(!get('childdex').data.species.includes('bulbasaur'));

		assert.deepEqual(Object.keys(Dexes.battleData(formatOf('Child Dex', 'OU'))).sort(), ['format', 'hash']);
		const hashes = [get('childdex').data.hash, get('parentdex').data.hash];
		const query = require('../../dist/lib/database').SQL`SELECT hash, data FROM dex_layers`;
		let saved = [];
		for (let i = 0; i < 50 && saved.length < 2; i++) {
			await new Promise(resolve => {
				setTimeout(resolve, 20);
			});
			saved = (await Dexes.database().query(query)).filter(row => hashes.includes(row.hash));
		}
		assert.deepEqual(saved.find(row => row.hash === hashes[0]).data.parents, [hashes[1]]);
		assert(saved.find(row => row.hash === hashes[1]).data.Pokedex.sproutle);
		const team = Teams.pack([{ species: 'Sproutle', ability: 'Overgrow', moves: ['tackle'], evs: { hp: 4 }, nature: 'Bold' }]);
		assert.equal((await TeamValidatorAsync.get(formatOf('Child Dex', 'OU')).validateTeam(team)).charAt(0), '1');

		await assert.rejects(Dexes.deleteDex(get('parentdex')), /is set in Parent Dex/);
		const fork = { loaded: await Dexes.createDex(owner, 'Child Fork', 'Child Dex') };
		assert.deepEqual(fork.loaded.row.parents, [id('Child Dex')]);
		assert(fork.loaded.data.species.includes('sproutle'));
		assert(!fork.loaded.data.species.includes('bulbasaur'));

		assert((await Dexes.setOfficial(get('parentdex'), true)).row.official);
		await Dexes.deleteDex(fork.loaded);
		await Dexes.deleteDex(get('childdex'));
		await Dexes.deleteDex(get('parentdex'));
	});

	it('should build a dex on several dexes, or with another mod\'s engine', async () => {
		await fixture();
		const get = Dexes.getDex;
		await Dexes.putEntries(await Dexes.createDex(owner, 'Left Dex', 'gen9'), [
			{ name: 'Pikachu', types: ['Electric', 'Steel'] },
			{ name: 'Sparkit', inheritsFrom: 'Pikachu' },
		]);
		await Dexes.putEntries(await Dexes.createDex(owner, 'Right Dex', 'gen9'), [
			{ name: 'Pikachu', types: ['Electric', 'Water'] },
			{ name: 'Sproutle', inheritsFrom: 'Bulbasaur', types: ['Grass'] },
		]);
		await assert.rejects(Dexes.createDex(editor, 'Bad Dex', 'Left Dex + gen9'), /no dex called "gen9"/);
		await assert.rejects(Dexes.createDex(editor, 'Bad Dex', 'Left Dex + leftdex'), /same dex twice/);
		await assert.rejects(Dexes.createDex(editor, 'Bad Dex', 'Left Dex', 'gen7'), /different generation/);
		await assert.rejects(Dexes.createDex(editor, 'Bad Dex', 'Left Dex', 'nosuchmod'), /isn't a mod/);

		let both = await Dexes.createDex(editor, 'Both Dex', 'Left Dex + Right Dex');
		assert.deepEqual(both.row.parents, [id('Left Dex'), id('Right Dex')]);
		assert.equal(both.formats.size, 0);
		assert(both.data.species.includes('sproutle'));
		assert.notEqual(both.dex.species.get('Sparkit').num, both.dex.species.get('Sproutle').num);
		assert.deepEqual(both.dex.species.get('Pikachu').types, ['Electric', 'Steel']);
		assert.equal(Dexes.baseName(both.row), 'Left Dex + Right Dex');
		({ loaded: both } = await Dexes.putFormat(both, { name: 'OU', from: 'gen9ou' }));
		const team = Teams.pack([{ species: 'Sproutle', ability: 'Overgrow', moves: ['tackle'], evs: { hp: 4 }, nature: 'Bold' }]);
		assert.equal((await TeamValidatorAsync.get(formatOf('Both Dex', 'OU')).validateTeam(team)).charAt(0), '1');
		await Dexes.putEntry(get('leftdex'), { name: 'Pikachu', types: ['Electric', 'Fire'] });
		assert.deepEqual(get('bothdex').data.parents, [get('leftdex').data.hash, get('rightdex').data.hash]);
		assert.deepEqual(get('bothdex').dex.species.get('Pikachu').types, ['Electric', 'Fire']);
		await assert.rejects(Dexes.deleteDex(get('rightdex')), /is set in Right Dex/);
		await Dexes.deleteDex(get('bothdex'));

		const mario = await Dexes.createDex(editor, 'Mario Dex', 'Left Dex', 'gen9mariomon');
		assert.equal(mario.row.mod, 'gen9mariomon');
		assert(mario.dex.currentMod.startsWith('gen9mariomondex'));
		assert.equal(Dexes.baseName(mario.row), 'Left Dex (on gen9mariomon)');
		assert.deepEqual(mario.dex.species.get('Pikachu').types, ['Electric', 'Fire']);
		assert(mario.dex.conditions.get('frb').exists);
		assert(!get('leftdex').dex.conditions.get('frb').exists);

		for (const dexid of ['mariodex', 'leftdex', 'rightdex']) await Dexes.deleteDex(get(dexid));
	});

	it('should save a snapshot when a battle starts, which outlives the dex', async () => {
		await fixture({ sprites: true, effects: true, copies: true });
		const loaded = Dexes.getDex('mochadex');
		const formatid = formatOf('Mocha Dex', 'OU');
		const p1 = makeUser('Dex Player 1');
		const p2 = makeUser('Dex Player 2');
		const room = Rooms.createBattle({
			format: formatid, players: [{ user: p1, team: team('Voltlet') }, { user: p2, team: team('Voltlet') }],
		});
		const { hash } = loaded.data;
		require('../../dist/server/chat-plugins/dexes').handlers.onBattleCreate(room.battle, [p1.id, p2.id]);
		let row;
		for (let i = 0; i < 50 && !row; i++) {
			await new Promise(resolve => {
				setTimeout(resolve, 20);
			});
			row = await Dexes.database().queryOne(require('../../dist/lib/database').SQL`
				SELECT data FROM dex_snapshots WHERE hash = ${hash}
			`);
		}
		assert.equal(row.data.dexid, loaded.row.dexid);
		assert(row.data.Pokedex.voltlet);
		assert.equal(row.data.sprites.voltlet.front, loaded.entries.get('voltlet').sprites.front);
		assert(row.data.images[row.data.sprites.voltlet.front].file.endsWith('.png'));
		const inputLog = (await room.battle.getInputLog()).join('\n');
		assert(inputLog.includes(`"hash":"${hash}"`));
		assert(room.battle.room.log.log.some(line => line === `|dex|${hash}`));
		room.destroy();
		p1.destroy();
		p2.destroy();

		await Dexes.deleteDex(loaded);
		assert(!Dex.formats.get(formatid).exists);
		assert(!Dexes.dexes.has(loaded.row.dexid));
		const kept = await Dexes.database().queryOne(require('../../dist/lib/database').SQL`
			SELECT hash FROM dex_snapshots WHERE hash = ${hash}
		`);
		assert.equal(kept.hash, hash);
		assert.equal(Dexes.getDex('wholecopy').entries.get('voltlet').trackdex, null);
		assert(Dexes.getDex('wholecopy').data.Pokedex.voltlet);
		await Dexes.deleteDex(Dexes.getDex('wholecopy'));
		await Dexes.deleteDex(Dexes.getDex('copydex'));
	});
	it('should reject parent changes that create evolution loops in descendants and restore both versions', async () => {
		await fixture();
		let parent = await Dexes.createDex(owner, 'Loop Parent', 'gen9');
		const child = await Dexes.createDex(editor, 'Loop Child', 'Loop Parent');
		await Dexes.putEntry(child, { name: 'Charmander', evos: ['Bulbasaur'] });
		parent = Dexes.getDex('Loop Parent');
		const before = [parent.data.hash, Dexes.getDex('Loop Child').data.hash];
		await assert.rejects(Dexes.putEntry(parent, { name: 'Bulbasaur', evos: ['Charmander'] }), /loop/);
		assert.deepEqual([Dexes.getDex('Loop Parent').data.hash, Dexes.getDex('Loop Child').data.hash], before);
		await Dexes.refresh(parent.row.dexid);
		assert.deepEqual([Dexes.getDex('Loop Parent').data.hash, Dexes.getDex('Loop Child').data.hash], before);
		assert(!Dexes.getDex('Loop Parent').entries.has('bulbasaur'));
	});

	it('should roll back every entry when a batch write fails', async () => {
		await fixture();
		const { SQL } = require('../../dist/lib/database');
		const db = Dexes.database();
		await db.query(SQL`ALTER TABLE dex_species ADD CONSTRAINT reject_second CHECK (speciesid <> 'rejectmon')`);
		const loaded = Dexes.getDex('Mocha Dex');
		try {
			await assert.rejects(Dexes.putEntries(loaded, [
				{ name: 'Acceptmon', inheritsFrom: 'Pikachu' },
				{ name: 'Rejectmon', inheritsFrom: 'Pikachu' },
			]), /reject_second/);
			await Dexes.refresh(loaded.row.dexid);
			assert(!Dexes.getDex('Mocha Dex').entries.has('acceptmon'));
			assert(!Dexes.getDex('Mocha Dex').entries.has('rejectmon'));
		} finally {
			await db.query(SQL`ALTER TABLE dex_species DROP CONSTRAINT reject_second`);
		}
	});

	it('should apply concurrent edits against the latest saved entry', async () => {
		await fixture();
		const loaded = Dexes.getDex('Mocha Dex');
		await Promise.all([
			Dexes.putEntry(loaded, { name: 'Voltlet', types: ['Water'] }),
			Dexes.putEntry(loaded, { name: 'Voltlet', weightkg: 42 }),
		]);
		const species = Dexes.getDex('Mocha Dex').dex.species.get('Voltlet');
		assert.deepEqual(species.types, ['Water']);
		assert.equal(species.weightkg, 42);
	});

	it('should publish parent and tracked fork changes together after committing', async () => {
		await fixture();
		const { SQL } = require('../../dist/lib/database');
		const source = Dexes.getDex('Mocha Dex');
		const copy = await Dexes.createDex(editor, 'Pending Copy', 'gen9');
		await Dexes.forkEntry(copy, source, 'Pokedex', 'Voltlet');
		const db = Dexes.database();
		await db.query(SQL`CREATE FUNCTION delay_fork() RETURNS trigger LANGUAGE plpgsql AS $$
			BEGIN
				IF NEW.trackdex IS NOT NULL THEN PERFORM pg_sleep(0.2); END IF;
				RETURN NEW;
			END $$`);
		await db.query(SQL`CREATE TRIGGER delay_fork BEFORE UPDATE ON dex_species FOR EACH ROW EXECUTE FUNCTION delay_fork()`);
		let edit;
		try {
			edit = Dexes.putEntry(source, { name: 'Voltlet', types: ['Water'] });
			let pending;
			for (let i = 0; i < 100 && !pending; i++) {
				pending = await db.queryOne(SQL`SELECT 1 FROM pg_stat_activity WHERE wait_event = 'PgSleep'`);
				if (!pending) await new Promise(resolve => {
					setTimeout(resolve, 5);
				});
			}
			assert(pending);
			assert.deepEqual(Dexes.getDex('Mocha Dex').dex.species.get('Voltlet').types, ['Electric', 'Steel']);
			assert.equal(Dex.formats.get(formatOf('Mocha Dex', 'OU')).mod, source.dex.currentMod);
			await edit;
			assert.deepEqual(Dexes.getDex('Mocha Dex').dex.species.get('Voltlet').types, ['Water']);
			assert.deepEqual(Dexes.getDex('Pending Copy').dex.species.get('Voltlet').types, ['Water']);
		} finally {
			await edit;
			await db.query(SQL`DROP TRIGGER delay_fork ON dex_species`);
			await db.query(SQL`DROP FUNCTION delay_fork()`);
		}
	});
});
