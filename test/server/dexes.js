'use strict';

const assert = require('assert').strict;
const { FS } = require('../../dist/lib');
const Dexes = require('../../dist/server/dexes');
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

	it('should make a dex with every Pokemon in its base mod', async () => {
		const loaded = await Dexes.createDex(owner, 'Mocha Dex', 'gen9');
		assert.equal(loaded.row.ownerid, OWNER);
		assert(loaded.row.species.includes('pikachu'));
		assert(!loaded.row.species.includes('pikachuworld') || Dex.species.get('Pikachu-World').isNonstandard === null);
		await assert.rejects(Dexes.createDex(owner, 'mocha dex', 'gen9'), /already a dex/);
		await assert.rejects(Dexes.createDex(owner, 'Other', 'nosuchmod'), /isn't a dex you can build on/);
	});

	it('should make custom Pokemon, edit existing ones, and play them in its formats', async () => {
		let loaded = await Dexes.editable(owner, 'mochadex');
		({ loaded } = await Dexes.putEntry(loaded, {
			name: 'Voltlet', inheritsFrom: 'Pikachu', types: ['Electric', 'Steel'],
			learnset: { protect: ['9M'] },
		}));
		({ loaded } = await Dexes.putEntry(loaded, {
			name: 'Pikachu', baseStats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
		}));
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
		assert.equal(formatid, 'mochadexou');
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
	});

	it('should let only its owner and editors change it', async () => {
		await assert.rejects(Dexes.editable(editor, 'mochadex'), /can't edit/);
		await Dexes.database().query(require('../../dist/lib/database').SQL`
			INSERT INTO dex_editors (dexid, accountid, added) VALUES ('mochadex', ${EDITOR}, ${Date.now()})
		`);
		await Dexes.refresh('mochadex');
		assert(await Dexes.editable(editor, 'mochadex'));
	});

	it('should keep sprites by their contents', async () => {
		const loaded = await Dexes.setSprite(owner, Dexes.getDex('mochadex'), 'Voltlet', 'front', png(96, 96));
		const image = loaded.uploads.get(loaded.entries.get('voltlet').sprites.front);
		assert.match(image.sha, /^[0-9a-f]{64}$/);
		assert.equal(image.accountid, OWNER);
		assert.equal(image.dexname, 'Mocha Dex');
		const row = await Dexes.database().queryOne(require('../../dist/lib/database').SQL`
			SELECT width FROM dex_sprites WHERE sha = ${image.sha}
		`);
		assert.equal(row.width, 96);
		assert.deepEqual(Dexes.clientData(loaded).sprites.voltlet, { front: image.sha });
		assert.equal(Dexes.clientData(loaded).credits[image.sha].uploader, 'Dex Owner');
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Voltlet', 'icon', png(96, 96)), /must be 40x30/);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Voltlet', 'front', 'bm90IGEgcG5n'), /PNG/);
	});

	it('should make and edit moves, abilities and items, including values in their code', async () => {
		let loaded = Dexes.getDex('mochadex');
		({ loaded } = await Dexes.putEffect(loaded, 'Moves', {
			name: 'Scorch Soak', inheritsFrom: 'Soak', type: 'Fire', replace: [['Water', 'Fire']],
		}));
		let editor = Dexes.effectEditor(loaded, 'Moves', 'Scorch Soak');
		const onHit = editor.handlers.find(handler => handler.path === 'onHit');
		assert(onHit.slots.length && onHit.slots.every(slot => slot.value === 'Fire' && slot.original === 'Water' && slot.edited));
		assert.equal(editor.data.shortDesc, `Changes the target's type to Fire.`);
		assert.equal(Dexes.clientData(loaded).Moves.scorchsoak.type, 'Fire');

		({ loaded } = await Dexes.putEffect(loaded, 'Items', { name: 'Choice Band', slots: { 'onModifyAtk:1': 3 } }));
		assert(Dexes.effectEditor(loaded, 'Items', 'Choice Band').data.shortDesc.startsWith(`Holder's Attack is 3×`));
		({ loaded } = await Dexes.putEffect(loaded, 'Items', {
			name: 'Volt Orb', inheritsFrom: 'Light Ball', replace: [['Pikachu', 'Voltlet']],
		}));
		assert.equal(Dexes.effectEditor(loaded, 'Items', 'Volt Orb').data.shortDesc,
			'If held by a Voltlet, its Attack and Sp. Atk are doubled.');
		({ loaded } = await Dexes.putEffect(loaded, 'Moves', {
			name: 'Volt Jab', type: 'Electric', category: 'Physical', basePower: 70, flags: { contact: 1 },
			secondary: { chance: 30, status: 'par' },
		}));
		assert.equal(loaded.effects.Moves.get('voltjab').num, -10002);
		({ loaded } = await Dexes.putEffect(loaded, 'Moves', { name: 'Shield', inheritsFrom: 'Protect' }));
		editor = Dexes.effectEditor(loaded, 'Moves', 'Shield');
		assert.equal(loaded.dex.moves.get('Shield').volatileStatus, 'shield');
		assert(editor.lost.engine.some(entry => entry.file === 'sim/battle.js'));
		assert(editor.lost.references.some(entry => entry.effect === `move: King's Shield`));

		await assert.rejects(Dexes.putEffect(loaded, 'Moves', { name: 'Scorch Soak', slots: { 'onHit:0': 'Fyre' } }), /isn't a type/);
		await assert.rejects(Dexes.putEffect(loaded, 'Moves', { name: 'Scorch Soak', onHit: 1 }), /is code/);
		await assert.rejects(Dexes.putEffect(loaded, 'Moves', { name: 'Scorch Soak', basePower: 'lots' }), /whole number/);
		await assert.rejects(Dexes.putEffect(loaded, 'Moves', { name: 'Scorch Soak', speed: 1 }), /isn't something you can set/);
		await assert.rejects(Dexes.putEffect(loaded, 'Moves', { name: 'Scorch Soak', replace: [['Grass', 'Fire']] }), /Nothing/);
		await assert.rejects(Dexes.putEffect(loaded, 'Moves', { name: 'Scorch Soak', type: null }), /can't be removed/);

		({ loaded } = await Dexes.putEffect(loaded, 'Items', { name: 'Choice Scarf', events: { onModifySpe: 'atk' } }));
		assert.equal(loaded.dex.items.get('Choice Scarf').onModifySpe, undefined);
		assert(Dexes.effectEditor(loaded, 'Items', 'Choice Scarf').data.shortDesc.startsWith(`Holder's Attack is 1.5×`));
		await assert.rejects(Dexes.putEffect(loaded, 'Items', { name: 'Choice Scarf', events: { onModifySpe: 'hp' } }), /can become/);
		({ loaded } = await Dexes.putEffect(loaded, 'Abilities', { name: 'Intimidate', slots: { 'onStart:3': -2 } }));
		assert(loaded.dex.abilities.get('Intimidate').onStart.toString().includes('atk: (-2)'));

		({ loaded } = await Dexes.putEntry(loaded, { name: 'Voltlet', learnset: { voltjab: ['9L1'], scorchsoak: ['9M'] } }));
		const result = await TeamValidatorAsync.get('mochadexou').validateTeam(Teams.pack([{
			species: 'Voltlet', ability: 'Static', item: 'Volt Orb', moves: ['voltjab', 'scorchsoak'], evs: { hp: 4 }, nature: 'Adamant',
		}]));
		assert.equal(result.charAt(0), '1', result);

		loaded = await Dexes.deleteEffect(loaded, 'Items', 'Choice Band');
		assert(Dex.mod(loaded.data.mod).items.get('choiceband').exists);
		assert.equal(loaded.data.effects.Items.choiceband, undefined);
	});

	it('should hide private dexes from lists and searches, but not from their exact names', async () => {
		let loaded = Dexes.getDex('mochadex');
		assert.deepEqual(Dexes.search('mocha', null).map(dex => dex.row.dexid), ['mochadex']);
		loaded = await Dexes.setVisibility(loaded, 'private');
		assert.deepEqual(Dexes.search('mocha', null), []);
		assert.deepEqual(Dexes.search('mocha', EDITOR).map(dex => dex.row.dexid), ['mochadex']);
		LoginServer.request = async () => [{ discordid: OWNER }];
		assert.deepEqual(await Dexes.dexesOf('Dex Owner', null), []);
		assert.equal((await Dexes.dexesOf('Dex Owner', OWNER)).length, 1);
		assert.equal(Dexes.getDex('Mocha Dex').row.visibility, 'private');
		await assert.rejects(Dexes.setVisibility(loaded, 'locked'), /public or private/);
		await Dexes.setVisibility(loaded, 'public');
	});

	it('should import entries with what they need, and keep them up to date until they are edited', async () => {
		let source = Dexes.getDex('mochadex');
		let copy = await Dexes.createDex(editor, 'Copy Dex', 'gen9');
		let result = await Dexes.importEntry(copy, source, 'Pokedex', 'Voltlet');
		copy = result.loaded;
		assert(result.copied.includes('Pokemon Voltlet'));
		assert(result.copied.includes('move Volt Jab'));
		assert(result.copied.includes('move Scorch Soak'));
		const voltlet = copy.entries.get('voltlet');
		assert.equal(voltlet.trackdex, 'mochadex');
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

		await assert.rejects(Dexes.importEntry(Dexes.getDex('copydex'), Dexes.getDex('mochadex'), 'Pokedex', 'Voltlet'), /overwrite/);
		await assert.rejects(Dexes.importEntry(Dexes.getDex('mochadex'), Dexes.getDex('copydex'), 'Moves', 'Volt Jab', true),
			/comes from Mocha Dex already/);

		result = await Dexes.importDex(editor, 'Whole Copy', Dexes.getDex('mochadex'));
		assert.equal(result.loaded.row.origin.dex, 'Mocha Dex');
		assert(result.loaded.formats.has('wholecopyou'));
		assert.equal(result.loaded.entries.get('voltlet').trackdex, 'mochadex');
		assert.deepEqual(result.loaded.data.Pokedex.voltlet.types, ['Electric', 'Dragon']);

		({ loaded: source } = await Dexes.putEffect(Dexes.getDex('mochadex'), 'Items', { name: 'Volt Orb', spriteFrom: 'Leftovers' }));
		assert.equal(source.dex.items.get('Volt Orb').spritenum, Dex.items.get('Leftovers').spritenum);
		assert.equal(Dexes.getDex('wholecopy').dex.items.get('Volt Orb').spritenum, Dex.items.get('Leftovers').spritenum);
	});

	it('should delete a sprite everywhere it was imported, but only for its uploader', async () => {
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

	it('should save a snapshot when a battle starts, which outlives the dex', async () => {
		const loaded = Dexes.getDex('mochadex');
		const p1 = makeUser('Dex Player 1');
		const p2 = makeUser('Dex Player 2');
		const room = Rooms.createBattle({
			format: 'mochadexou', players: [{ user: p1, team: team('Voltlet') }, { user: p2, team: team('Voltlet') }],
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
		assert.equal(row.data.dexid, 'mochadex');
		assert(row.data.Pokedex.voltlet);
		assert.equal(row.data.sprites.voltlet.front, Dexes.spriteShas(loaded, loaded.entries.get('voltlet').sprites).front);
		const inputLog = (await room.battle.getInputLog()).join('\n');
		assert(inputLog.includes(`"hash":"${hash}"`));
		assert(room.battle.room.log.log.some(line => line === `|dex|${hash}`));
		room.destroy();
		p1.destroy();
		p2.destroy();

		await Dexes.deleteDex(loaded);
		assert(!Dex.formats.get('mochadexou').exists);
		assert(!Dexes.dexes.has('mochadex'));
		const kept = await Dexes.database().queryOne(require('../../dist/lib/database').SQL`
			SELECT hash FROM dex_snapshots WHERE hash = ${hash}
		`);
		assert.equal(kept.hash, hash);
		assert.equal(Dexes.getDex('wholecopy').entries.get('voltlet').trackdex, null);
		assert(Dexes.getDex('wholecopy').data.Pokedex.voltlet);
		await Dexes.deleteDex(Dexes.getDex('wholecopy'));
		await Dexes.deleteDex(Dexes.getDex('copydex'));
	});
});
