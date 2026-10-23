'use strict';

const assert = require('assert').strict;
const { Battle } = require('../../dist/sim/battle');
const { BattleStream } = require('../../dist/sim/battle-stream');
const { buildDex, buildFormat, releaseDex } = require('../../dist/sim/dex-custom');
const { parseHandler } = require('../../dist/sim/dex-handlers');
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

const changes = (fn, from, to) => Object.fromEntries(parseHandler(fn, Dex.data).slots
	.flatMap((slot, index) => slot.value === from ? [[index, [from, to]]] : []));

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

	it('should copy and edit moves and items, with values in their code changed', () => {
		const dex = buildDex({
			...DATA, hash: 'simeffects', species: ['blissey', 'snorlax'], effects: {
				Moves: {
					scorchsoak: {
						inherit: 'soak', data: { name: 'Scorch Soak', num: -1, type: 'Fire' },
						slots: { onHit: changes(Dex.data.Moves.soak.onHit, 'Water', 'Fire') },
					},
				},
				Items: { choiceband: { data: {}, slots: { onModifyAtk: changes(Dex.data.Items.choiceband.onModifyAtk, 1.5, 3) } } },
			},
		});
		const battle = new Battle({
			formatid: 'simtestanything', format: buildFormat(dex, { name: '[Sim Test] Anything', ruleset: [] }), seed: [1, 2, 3, 4],
		});
		battle.setPlayer('p1', { team: [{ species: 'Blissey', ability: 'Natural Cure', moves: ['scorchsoak'], evs: {} }] });
		battle.setPlayer('p2', { team: [{ species: 'Snorlax', ability: 'Thick Fat', item: 'choiceband', moves: ['rest'], evs: {} }] });
		battle.makeChoices('move scorchsoak', 'move rest');
		const snorlax = battle.p2.active[0];
		assert.deepEqual(snorlax.getTypes(), ['Fire']);
		assert(battle.log.includes('|-start|p2a: Snorlax|typechange|Fire'));
		assert.equal(battle.runEvent('ModifyAtk', snorlax, null, null, 100), 300);
		assert(Dex.moves.get('Soak').onHit.toString().includes('"Water"'));
		assert(!Dex.moves.get('Scorch Soak').exists);
		releaseDex(dex);
	});

	it('should point copies at themselves, and refuse values that do not fit', () => {
		const dex = buildDex({ ...DATA, hash: 'simrename', effects: { Moves: { shield: { inherit: 'reflect', data: { name: 'Shield' } } } } });
		assert.equal(dex.moves.get('Shield').sideCondition, 'shield');
		assert(dex.conditions.get('shield').onSideStart.toString().includes('"Shield"'));
		assert.equal(dex.moves.get('Reflect').sideCondition, 'reflect');
		releaseDex(dex);

		const soak = Dex.data.Moves.soak.onHit;
		const bad = { Moves: { soak: { data: {}, slots: { onHit: changes(soak, 'Water', 'Fyre') } } } };
		assert.throws(() => buildDex({ ...DATA, hash: 'simbad', effects: bad }), /isn't a type/);
		assert.equal(Dex.dexes['dexsimbad'], undefined);

		const data = JSON.parse('{"__proto__": {"basePower": 999}, "onHit": {"evil": 1}, "constructor": 1}');
		const ignored = buildDex({ ...DATA, hash: 'simignored', effects: { Moves: { soak: { data } } } });
		const move = ignored.data.Moves.soak;
		assert.equal(move.onHit, soak);
		assert.equal(move.basePower, 0);
		assert.equal({}.basePower, undefined);
		assert(!Object.hasOwn(move, 'constructor'));
		const stale = buildDex({
			...DATA, hash: 'simstale', effects: { Moves: { soak: { data: {}, slots: { onHit: { 0: ['Grass', 'Fire'] } } } } },
		});
		assert.equal(stale.data.Moves.soak.onHit, soak);
		releaseDex(ignored);
		releaseDex(stale);
	});

	it('should move stat handlers to other stats', () => {
		const dex = buildDex({
			...DATA, hash: 'simevents', effects: {
				Items: {
					choicescarf: { data: {}, events: { onModifySpe: 'onModifyAtk' } },
					eviolite: { data: {}, events: { onModifyDef: 'onModifySpD', onModifySpD: 'onModifyDef' } },
				},
			},
		});
		const scarf = dex.items.get('choicescarf');
		assert.equal(scarf.onModifySpe, undefined);
		assert.equal(scarf.onModifyAtk, Dex.data.Items.choicescarf.onModifySpe);
		const eviolite = dex.items.get('eviolite');
		assert.equal(eviolite.onModifyDef, Dex.data.Items.eviolite.onModifySpD);
		assert.equal(eviolite.onModifySpDPriority, Dex.data.Items.eviolite.onModifyDefPriority);
		releaseDex(dex);

		const clash = { Items: { eviolite: { data: {}, events: { onModifyDef: 'onModifySpD' } } } };
		assert.throws(() => buildDex({ ...DATA, hash: 'simclash', effects: clash }), /already has its own handler/);
		const blaze = { Abilities: { blaze: { data: {}, events: { onModifyAtk: 'onModifySpe' } } } };
		assert.throws(() => buildDex({ ...DATA, hash: 'simblaze', effects: blaze }), /can't become onModifySpe/);
	});

	it('should only Mega Evolve the exact species a Mega Stone names, through chained formes', () => {
		const venusaur = Dex.data.Pokedex.venusaur;
		const delta = {
			num: 3, name: 'Venusaur-Delta', baseSpecies: 'Venusaur', forme: 'Delta', types: ['Fairy', 'Psychic'],
			abilities: { 0: 'Overgrow' }, baseStats: venusaur.baseStats, eggGroups: ['Monster'], weightkg: 100,
		};
		const dex = buildDex({
			...DATA, hash: 'simmegas', species: [...DATA.species, 'venusaur', 'venusaurdelta', 'venusaurdeltamega'],
			Pokedex: {
				...DATA.Pokedex, venusaurdelta: delta,
				venusaurdeltamega: { ...delta, name: 'Venusaur-Delta-Mega', baseSpecies: 'Venusaur-Delta', forme: 'Mega' },
			},
			Learnsets: { ...DATA.Learnsets, venusaurdelta: { learnset: { protect: ['9M'] } } },
			effects: {
				Items: {
					deltavenusaurite: {
						inherit: 'venusaurite',
						data: { name: 'Delta Venusaurite', num: -10001, megaStone: { 'Venusaur-Delta': 'Venusaur-Delta-Mega' } },
					},
				},
			},
		});
		assert.deepEqual(dex.items.get('Delta Venusaurite').megaStone, { 'Venusaur-Delta': 'Venusaur-Delta-Mega' });
		const format = buildFormat(dex, DATA.format);
		const megaOf = (species, item, battleFormat = format) => {
			const battle = new Battle({ format: battleFormat, formatid: battleFormat.id, seed: [1, 2, 3, 4] });
			const team = Teams.pack([{ species, item, ability: dex.species.get(species).abilities[0], moves: ['protect'] }]);
			battle.setPlayer('p1', { team });
			battle.setPlayer('p2', { team });
			const result = battle.p1.pokemon[0].canMegaEvo;
			battle.destroy();
			return result;
		};
		assert.equal(megaOf('Venusaur-Delta', 'Delta Venusaurite'), 'Venusaur-Delta-Mega');
		assert.equal(megaOf('Venusaur-Delta', 'Venusaurite'), null);
		assert.equal(megaOf('Venusaur', 'Delta Venusaurite'), null);
		assert.equal(megaOf('Venusaur', 'Venusaurite'), 'Venusaur-Mega');
		assert.equal(megaOf('Charizard-Mega-X', 'Charizardite Y'), 'Charizard-Mega-Y');
		assert.equal(megaOf('Charizard-Mega-X', 'Charizardite X'), null);
		const natdex = Dex.formats.get('gen9nationaldexag');
		assert.equal(megaOf('Slowbro-Galar', 'Slowbronite', natdex), null);
		assert.equal(megaOf('Slowbro', 'Slowbronite', natdex), 'Slowbro-Mega');
		releaseDex(dex);
	});

	it('should build a dex on another from saved versions, and release both', () => {
		const fs = require('fs');
		const folder = `${__dirname}/dex-data-tmp`;
		const parent = { ...DATA, hash: 'a'.repeat(20) };
		const child = {
			hash: 'b'.repeat(20), mod: 'gen9', parent: parent.hash, species: [...DATA.species, 'pichu'],
			Pokedex: { pichu: { ...Dex.data.Pokedex.pichu, types: ['Electric', 'Fairy'] } }, Learnsets: {}, FormatsData: {},
		};
		const previous = Config.dexdatapath;
		Config.dexdatapath = folder;
		fs.mkdirSync(folder, { recursive: true });
		for (const layer of [parent, child]) fs.writeFileSync(`${folder}/${layer.hash}.json`, JSON.stringify(layer));
		try {
			const dex = buildDex({ hash: child.hash });
			assert.deepEqual(dex.species.get('Voltlet').types, ['Electric', 'Steel']);
			assert.deepEqual(dex.species.get('Pichu').types, ['Electric', 'Fairy']);
			assert(Dex.dexes[`gen9dex${parent.hash}`]);
			releaseDex(dex);
			assert.equal(Dex.dexes[`gen9dex${child.hash}`], undefined);
			assert.equal(Dex.dexes[`gen9dex${parent.hash}`], undefined);
			assert.throws(() => buildDex({ hash: '../../config/config' }), /isn't a dex version/);
		} finally {
			Config.dexdatapath = previous;
			fs.rmSync(folder, { recursive: true, force: true });
		}
	});

	it('should merge several parents, and run a parent on another engine', () => {
		const pikachu = Dex.data.Pokedex.pikachu;
		const first = {
			...DATA, hash: 'c'.repeat(20),
			Pokedex: { ...DATA.Pokedex, pikachu: { ...pikachu, types: ['Electric', 'Steel'], evos: ['Raichu', 'Voltlet'] } },
			Learnsets: { ...DATA.Learnsets, pikachu: { learnset: { ...Dex.data.Learnsets.pikachu.learnset, flashcannon: ['9M'] } } },
		};
		const second = {
			hash: 'd'.repeat(20), mod: 'gen9', species: ['pikachu', 'pichu'],
			Pokedex: {
				pikachu: {
					...pikachu, types: ['Electric', 'Water'], abilities: { ...pikachu.abilities, 1: 'Static' }, evos: ['Raichu-Alola', 'Pichu'],
				},
				voltlet: { ...DATA.Pokedex.voltlet, types: ['Water'], weightkg: 99 },
			},
			Learnsets: { pikachu: { learnset: { ...Dex.data.Learnsets.pikachu.learnset, surf: ['9M'] } } },
			FormatsData: {},
		};
		const parents = [buildDex(first), buildDex(second)];
		const dex = buildDex({
			hash: 'e'.repeat(20), mod: 'gen9', parents: [first.hash, second.hash], species: ['pikachu', 'pichu', 'voltlet'],
			Pokedex: {}, Learnsets: {}, FormatsData: {},
		});
		const merged = dex.species.get('Pikachu');
		assert.deepEqual(merged.types, ['Electric', 'Steel']);
		assert.equal(merged.abilities[1], 'Static');
		assert.deepEqual(merged.evos, ['Raichu', 'Voltlet', 'Raichu-Alola', 'Pichu']);
		assert.deepEqual(dex.species.get('Voltlet').types, ['Electric', 'Steel']);
		assert.equal(dex.species.get('Voltlet').weightkg, 10);
		const learnset = dex.data.Learnsets.pikachu.learnset;
		assert(learnset.flashcannon && learnset.surf && learnset.thunderbolt);

		const mariomon = buildDex({ hash: 'f'.repeat(20), mod: 'gen9mariomon', parents: [first.hash], species: first.species,
			Pokedex: {}, Learnsets: {}, FormatsData: {} });
		assert(mariomon.currentMod.startsWith('gen9mariomondex'));
		assert(Dex.dexes[`gen9mariomondex${first.hash}`]);
		assert.deepEqual(mariomon.species.get('Pikachu').types, ['Electric', 'Steel']);
		assert(mariomon.conditions.get('frb').exists);
		assert(!parents[0].conditions.get('frb').exists);
		for (const built of [dex, mariomon, ...parents]) releaseDex(built);
		assert.equal(Dex.dexes[`gen9mariomondex${first.hash}`], undefined);
		assert.equal(Dex.dexes[`gen9dex${first.hash}`], undefined);
	});

	it('should use the dex\'s type chart', () => {
		const dex = buildDex({
			...DATA, hash: 'simtypes', TypeChart: {
				cosmic: { damageTaken: { Dark: 1, sandstorm: 3 } },
				steel: { ...Dex.data.TypeChart.steel, damageTaken: { ...Dex.data.TypeChart.steel.damageTaken, Cosmic: 2 } },
			},
		});
		assert(dex.types.get('Cosmic').exists);
		assert.equal(dex.getEffectiveness('Dark', 'Cosmic'), 1);
		assert.equal(dex.getEffectiveness('Cosmic', 'Steel'), -1);
		assert(!Dex.types.get('Cosmic').exists);
		releaseDex(dex);
	});
});
