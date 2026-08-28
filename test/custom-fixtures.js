'use strict';

/** The one custom species the custom-* tests build with, in the shape a database row has. */
exports.SPECIES_ROW = {
	name: 'Testmon', num: -100001, inheritsfrom: null,
	species: {
		name: 'Testmon', types: ['Steel'], abilities: { 0: 'Levitate' },
		baseStats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
		eggGroups: ['Undiscovered'], weightkg: 10,
	},
	learnset: { tackle: ['9M'] },
};

/** A team of exactly that species, unpacked. `Teams.pack` it where a packed team is wanted. */
exports.TEAM = [{
	name: 'Testmon', species: 'Testmon', ability: 'Levitate', moves: ['tackle'],
	evs: { hp: 4, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, nature: 'Serious',
}];
