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

function gif(width, height) {
	const data = Buffer.alloc(13);
	data.write('GIF89a', 0, 'latin1');
	data.writeUInt16LE(width, 6);
	data.writeUInt16LE(height, 8);
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
		await assert.rejects(Dexes.createDex(owner, 'Other', 'nosuchmod'), /isn't a dex or mod you can build on/);
	});

	it('should make custom Pokemon, edit existing ones, and play them in its formats', async () => {
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
		LoginServer.request = async (action, { userid }) => [userid === 'nobody' ? { names: [] } : { discordid: EDITOR }];
		await assert.rejects(Dexes.setEditor(Dexes.getDex('mochadex'), 'Nobody', true), /hasn't logged in/);
		let loaded = await Dexes.setEditor(Dexes.getDex('mochadex'), 'Dex Editor', true);
		assert.deepEqual([...loaded.editors], [[EDITOR, 'Dex Editor']]);
		assert(await Dexes.editable(editor, 'mochadex'));
		assert.deepEqual((await Dexes.dexesOf('Dex Editor', null)).map(dex => dex.row.dexid), ['mochadex']);
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
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Voltlet', 'icon', png(96, 96)), /at most 64x64/);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Voltlet', 'front', 'bm90IGEgcG5n'), /PNG or GIF/);
	});

	it('should keep GIFs of any size up to the limit, with their settings', async () => {
		const settings = { artist: 'Mocha Artist', pixelated: true, flip: true, y: -16, gen: 3 };
		const loaded = await Dexes.setSprite(owner, Dexes.getDex('mochadex'), 'Voltlet', 'back', gif(160, 150), settings);
		const uploadid = loaded.entries.get('voltlet').sprites.back;
		const image = Dexes.clientData(loaded).images[uploadid];
		assert.equal(image.file, `${loaded.uploads.get(uploadid).sha}.gif`);
		assert.equal(image.width, 160);
		assert.equal(image.height, 150);
		assert.equal(image.artist, 'Mocha Artist');
		assert.equal(image.gen, 3);
		assert.equal(image.y, -16);
		assert(image.flip && image.pixelated);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Voltlet', 'back', gif(401, 96)), /at most 400x400/);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Voltlet', 'back', gif(96, 96), { y: 200 }), /"y" must be/);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Voltlet', 'back', gif(96, 96), { size: 2 }), /isn't a sprite setting/);
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Voltlet', 'back', gif(96, 96), { constructor: 2 }), /isn't a sprite setting/);
		const cleared = await Dexes.setSprite(owner, loaded, 'Voltlet', 'back', null);
		assert.equal(cleared.entries.get('voltlet').sprites.back, undefined);
	});

	it('should edit base Pokemon and items that get sprites', async () => {
		let loaded = await Dexes.createDex(owner, 'Sprite Dex', 'gen9');
		await assert.rejects(Dexes.setSprite(owner, loaded, 'Leftovers', 'item', png(24, 24), { y: 200 }), /"y" must be/);
		assert(!loaded.effects.Items.has('leftovers'));
		loaded = await Dexes.setSprite(owner, loaded, 'Leftovers', 'item', png(24, 24));
		assert.deepEqual(loaded.effects.Items.get('leftovers').data, { name: 'Leftovers' });
		assert.equal(Dexes.clientData(loaded).itemSprites.leftovers, loaded.effects.Items.get('leftovers').sprites.item);
		loaded = await Dexes.setSprite(owner, loaded, 'Pikachu', 'icon', png(40, 30));
		assert.deepEqual(loaded.entries.get('pikachu').data, { name: 'Pikachu' });
		assert.equal(loaded.data.Pokedex.pikachu.baseStats.spe, Dex.species.get('Pikachu').baseStats.spe);
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

	it('should make unreleased Pokemon legal', async () => {
		assert.equal(Dex.species.get('Raichu-Mega-X').isNonstandard, 'Future');
		const { loaded } = await Dexes.putEntry(Dexes.getDex('mochadex'), { name: 'Raichu-Mega-X', isNonstandard: null });
		assert.equal(loaded.entries.get('raichumegax').data.isNonstandard, null);
		assert.equal(loaded.dex.species.get('Raichu-Mega-X').isNonstandard, null);
		await Dexes.deleteEntry(loaded, 'Raichu-Mega-X');
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
		assert(loaded.effects.Moves.get('voltjab').num <= -10002);
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

	it('should fork entries with what they need, and keep them up to date until they are edited', async () => {
		let source = Dexes.getDex('mochadex');
		let copy = await Dexes.createDex(editor, 'Copy Dex', 'gen9');
		let result = await Dexes.forkEntry(copy, source, 'Pokedex', 'Voltlet');
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

		await assert.rejects(Dexes.forkEntry(Dexes.getDex('copydex'), Dexes.getDex('mochadex'), 'Pokedex', 'Voltlet'), /overwrite/);
		await assert.rejects(Dexes.forkEntry(Dexes.getDex('mochadex'), Dexes.getDex('copydex'), 'Moves', 'Volt Jab', true),
			/comes from Mocha Dex already/);

		result = await Dexes.forkDex(editor, 'Whole Copy', Dexes.getDex('mochadex'));
		assert.equal(result.loaded.row.origin.dex, 'Mocha Dex');
		assert(result.loaded.formats.has('wholecopyou'));
		assert.equal(result.loaded.entries.get('voltlet').trackdex, 'mochadex');
		assert.deepEqual(result.loaded.data.Pokedex.voltlet.types, ['Electric', 'Dragon']);

		({ loaded: source } = await Dexes.putEffect(Dexes.getDex('mochadex'), 'Items', { name: 'Volt Orb', spriteFrom: 'Leftovers' }));
		assert.equal(source.dex.items.get('Volt Orb').spritenum, Dex.items.get('Leftovers').spritenum);
		assert.equal(Dexes.getDex('wholecopy').dex.items.get('Volt Orb').spritenum, Dex.items.get('Leftovers').spritenum);
	});

	it('should delete a sprite everywhere it was forked, but only for its uploader', async () => {
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

	it('should only let creators lock entries, and stop other users forking them', async () => {
		let source = await Dexes.setLocked(Dexes.getDex('mochadex'), 'Moves', 'Scorch Soak', true);
		assert(source.effects.Moves.get('scorchsoak').locked);
		assert.equal(Dexes.getDex('copydex').effects.Moves.get('scorchsoak').trackdex, null);
		assert.equal(Dexes.getDex('wholecopy').effects.Moves.get('scorchsoak').trackdex, null);
		await assert.rejects(Dexes.forkEntry(Dexes.getDex('copydex'), source, 'Pokedex', 'Voltlet', true), /is locked/);
		await assert.rejects(Dexes.setLocked(Dexes.getDex('copydex'), 'Pokedex', 'Voltlet', true), /can't be locked/);
		await assert.rejects(Dexes.setLocked(Dexes.getDex('wholecopy'), 'Moves', 'Volt Jab', true), /can't be locked/);

		const skipped = await Dexes.forkDex(editor, 'Locked Out', source);
		assert(!skipped.loaded.effects.Moves.has('scorchsoak'));
		assert(!skipped.loaded.entries.has('voltlet'));
		assert(skipped.warnings.some(warning => warning.includes('Scorch Soak is locked')));
		await Dexes.deleteDex(skipped.loaded);

		const own = await Dexes.createDex(owner, 'Own Fork', 'gen9');
		const forked = (await Dexes.forkEntry(own, source, 'Moves', 'Scorch Soak')).loaded;
		assert(forked.effects.Moves.get('scorchsoak').locked);
		await Dexes.deleteDex(forked);
		source = await Dexes.setLocked(source, 'Moves', 'Scorch Soak', false);
		assert(!source.effects.Moves.get('scorchsoak').locked);
	});

	it('should make chained formes, types, many Pokemon at once, and formats from existing ones', async () => {
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
		({ loaded } = await Dexes.putEffect(loaded, 'Items', {
			name: 'Delta Venusaurite', inheritsFrom: 'Venusaurite', megaStone: { 'Venusaur-Delta': 'Venusaur-Delta-Mega' },
		}));
		await assert.rejects(Dexes.putEntry(loaded, { name: 'Bulbasaur-X', baseSpecies: 'Venusaur' }), /like "Venusaur-/);
		await assert.rejects(Dexes.putEntry(loaded, { name: 'Venusaur', baseSpecies: 'Bulbasaur' }), /can't change/);
		await assert.rejects(Dexes.deleteEffect(loaded, 'TypeChart', 'Cosmic'), /isn't in this dex/);
		await assert.rejects(Dexes.deleteEntry(loaded, 'Venusaur-Delta'), /isn't in this dex/);

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

	it('should build a fangame dex on an engine mod', async () => {
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
	});

	it('should build dexes on other dexes, keeping only their own changes', async () => {
		const get = Dexes.getDex;
		await Dexes.putEntries(await Dexes.createDex(owner, 'Parent Dex', 'gen9'), [
			{ name: 'Sproutle', inheritsFrom: 'Bulbasaur', types: ['Grass'] },
			{ name: 'Pikachu', types: ['Electric', 'Steel'] },
		]);
		await Dexes.putFormat(get('parentdex'), { name: 'OU', from: 'gen9ou' });
		await assert.rejects(Dexes.createDex(editor, 'gen9', 'Parent Dex'), /name of a mod/);

		const child = await Dexes.createDex(editor, 'Child Dex', 'Parent Dex');
		assert.deepEqual(child.row.parents, ['parentdex']);
		assert.deepEqual(child.data.parents, [get('parentdex').data.hash]);
		assert(child.formats.has('childdexou'));
		assert.equal(child.data.Pokedex.sproutle, undefined);
		assert(child.data.species.includes('sproutle'));
		await Dexes.putEntry(child, { name: 'Sproutle', types: ['Grass', 'Fairy'] });
		assert.deepEqual(get('childdex').dex.species.get('Sproutle').types, ['Grass', 'Fairy']);
		assert.deepEqual(get('parentdex').dex.species.get('Sproutle').types, ['Grass']);

		await Dexes.putEntry(get('parentdex'), { name: 'Pikachu', types: ['Electric', 'Fire'] });
		assert.deepEqual(get('childdex').data.parents, [get('parentdex').data.hash]);
		assert.deepEqual(get('childdex').dex.species.get('Pikachu').types, ['Electric', 'Fire']);
		await Dexes.setSpecies(get('childdex'), Dexes.findSpecies(get('childdex'), ['Bulbasaur']), false);
		assert(!get('childdex').data.species.includes('bulbasaur'));
		assert(get('parentdex').data.species.includes('bulbasaur'));
		await Dexes.putEntry(get('parentdex'), { name: 'Sproutle', heightm: 1 });
		assert(!get('childdex').data.species.includes('bulbasaur'));

		await Dexes.setLocked(get('parentdex'), 'Pokedex', 'Pikachu', true);
		await Dexes.setLocked(get('parentdex'), 'Pokedex', 'Sproutle', true);
		await assert.rejects(Dexes.putEntry(get('childdex'), { name: 'Pikachu', types: ['Water'] }), /locked in Parent Dex/);
		await assert.rejects(Dexes.putEntry(get('childdex'), { name: 'Sproutlet', inheritsFrom: 'Sproutle' }), /locked in Parent Dex/);

		assert.deepEqual(Object.keys(Dexes.battleData('childdexou')).sort(), ['format', 'hash']);
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
		assert.equal((await TeamValidatorAsync.get('childdexou').validateTeam(team)).charAt(0), '1');

		await assert.rejects(Dexes.deleteDex(get('parentdex')), /built on Parent Dex/);
		const fork = await Dexes.forkDex(owner, 'Child Fork', get('childdex'));
		assert.deepEqual(fork.loaded.row.parents, ['parentdex']);
		assert(fork.loaded.entries.has('sproutle'));
		assert(!fork.loaded.data.species.includes('bulbasaur'));

		const bulk = Array.from({ length: 201 }, (_, i) => ({ name: `Bulk ${i}`, inheritsFrom: 'Bulbasaur' }));
		await assert.rejects(Dexes.putEntries(get('parentdex'), bulk), /at a time/);
		assert((await Dexes.setOfficial(get('parentdex'), true)).row.official);
		await Dexes.deleteDex(fork.loaded);
		await Dexes.deleteDex(get('childdex'));
		await Dexes.deleteDex(get('parentdex'));
	});

	it('should build a dex on several dexes, or with another mod\'s engine', async () => {
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
		await assert.rejects(Dexes.createDex(editor, 'Bad Dex', 'Left Dex', undefined, 'gen7'), /different generation/);
		await assert.rejects(Dexes.createDex(editor, 'Bad Dex', 'Left Dex', undefined, 'nosuchmod'), /isn't a mod/);

		let both = await Dexes.createDex(editor, 'Both Dex', 'Left Dex + Right Dex');
		assert.deepEqual(both.row.parents, ['leftdex', 'rightdex']);
		assert.equal(both.formats.size, 0);
		assert(both.data.species.includes('sproutle'));
		assert.notEqual(both.dex.species.get('Sparkit').num, both.dex.species.get('Sproutle').num);
		assert.deepEqual(both.dex.species.get('Pikachu').types, ['Electric', 'Steel']);
		assert.equal(Dexes.baseName(both.row), 'Left Dex + Right Dex');
		({ loaded: both } = await Dexes.putFormat(both, { name: 'OU', from: 'gen9ou' }));
		const team = Teams.pack([{ species: 'Sproutle', ability: 'Overgrow', moves: ['tackle'], evs: { hp: 4 }, nature: 'Bold' }]);
		assert.equal((await TeamValidatorAsync.get('bothdexou').validateTeam(team)).charAt(0), '1');
		await Dexes.putEntry(get('leftdex'), { name: 'Pikachu', types: ['Electric', 'Fire'] });
		assert.deepEqual(get('bothdex').data.parents, [get('leftdex').data.hash, get('rightdex').data.hash]);
		assert.deepEqual(get('bothdex').dex.species.get('Pikachu').types, ['Electric', 'Fire']);

		const mario = await Dexes.createDex(editor, 'Mario Dex', 'Left Dex', undefined, 'gen9mariomon');
		assert.equal(mario.row.mod, 'gen9mariomon');
		assert(mario.dex.currentMod.startsWith('gen9mariomondex'));
		assert.equal(Dexes.baseName(mario.row), 'Left Dex (on gen9mariomon)');
		assert.deepEqual(mario.dex.species.get('Pikachu').types, ['Electric', 'Fire']);
		assert(mario.dex.conditions.get('frb').exists);
		assert(!get('leftdex').dex.conditions.get('frb').exists);

		await assert.rejects(Dexes.deleteDex(get('rightdex')), /built on Right Dex/);
		for (const dexid of ['mariodex', 'bothdex', 'leftdex', 'rightdex']) await Dexes.deleteDex(get(dexid));
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
		assert.equal(row.data.sprites.voltlet.front, loaded.entries.get('voltlet').sprites.front);
		assert(row.data.images[row.data.sprites.voltlet.front].file.endsWith('.png'));
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
