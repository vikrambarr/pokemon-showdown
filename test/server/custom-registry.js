'use strict';

/** A running battle's format has to be findable by `Dex.formats.get`, which fails silently. */

const assert = require('assert').strict;

const {
	customFormat, parseCustomFormat, registerCustomFormat, releaseCustomFormat,
} = require('../../dist/server/custom/dex');
const { customFormatId, customFormatName } = require('../../dist/server/custom/entries');
const { baseSnapshot, normalizeFormatData, toFormatData } = require('../../dist/server/custom/formats/validator');

function battleOptions(ownerid, name, base = '[Gen 9] OU') {
	const input = { ...baseSnapshot(base), name, base };
	const normalized = normalizeFormatData(input, { otherNames: new Map(), ownerid });
	const format = { ...toFormatData(normalized), name: customFormatName(ownerid, normalized.name) };
	return { customData: { Pokedex: {}, Learnsets: {}, FormatsData: {}, format } };
}

describe('Custom format registry', () => {
	afterEach(() => {
		releaseCustomFormat('battle-one');
		releaseCustomFormat('battle-two');
	});

	it('should name a format so its id survives every spelling of it', () => {
		const id = customFormatId('alice', 'monotypechomp');
		assert.equal(id, 'custom-alice-monotypechomp');
		assert.equal(toID(customFormatName('alice', 'Monotype Chomp')), toID(id));
		assert.equal(parseCustomFormat(id).id, id);
	});

	it('should make a running battle format resolvable by both of its spellings', () => {
		const format = registerCustomFormat('battle-one', battleOptions('alice', 'Monotype Chomp'));
		assert(format);
		assert.equal(Dex.formats.get('custom-alice-monotypechomp'), format);
		// The spelling `deserializeBattleRoom` recovers out of a room id.
		assert.equal(Dex.formats.get('customalicemonotypechomp'), format);
		// What the battle timer reads; a nonexistent format would leave it undefined.
		assert.equal(format.gameType, 'singles');
		assert(Dex.formats.getRuleTable(format).has('teampreview'));
	});

	it('should keep custom formats out of the format list', () => {
		registerCustomFormat('battle-one', battleOptions('alice', 'Monotype Chomp'));
		assert(!Dex.formats.all().some(format => format.id === 'customalicemonotypechomp'));
	});

	it('should keep the format while any room is still running it', () => {
		const options = battleOptions('alice', 'Monotype Chomp');
		registerCustomFormat('battle-one', options);
		registerCustomFormat('battle-two', options);
		releaseCustomFormat('battle-one');
		assert(Dex.formats.get('custom-alice-monotypechomp').exists, `released while still in use`);
		releaseCustomFormat('battle-two');
		assert(!Dex.formats.get('custom-alice-monotypechomp').exists, `not released by the last room`);
	});

	it('should not register anything for an ordinary battle', () => {
		assert.equal(registerCustomFormat('battle-one', {}), null);
		assert.equal(customFormat({}), null);
	});

	it('should tell two owners formats of the same name apart', () => {
		const alice = registerCustomFormat('battle-one', battleOptions('alice', 'Monotype Chomp'));
		const bob = registerCustomFormat('battle-two', battleOptions('bob', 'Monotype Chomp'));
		assert.notEqual(alice.id, bob.id);
		assert.equal(Dex.formats.get('custom-alice-monotypechomp'), alice);
		assert.equal(Dex.formats.get('custom-bob-monotypechomp'), bob);
	});

	it('should refuse a name too long to survive the owner prefix', () => {
		assert.throws(
			() => battleOptions('averylongusername', 'A Very Long Custom Format Name Indeed'),
			Chat.ErrorMessage
		);
	});
});
