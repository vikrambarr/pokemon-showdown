export const Items: import('../../../sim/dex-items').ModdedItemDataTable = {
	dragonfang: {
		inherit: true,
		onModifyAtk(atk, pokemon) {
			if (pokemon.species.name === 'Clamperl-Delta') {
				return this.chainModify(2);
			}
		},
		itemUser: ["Clamperl-Delta"],
	},
	dragonscale: {
		inherit: true,
		onModifyDef(def, pokemon) {
			if (pokemon.species.name === 'Clamperl-Delta') {
				return this.chainModify(2);
			}
		},
		itemUser: ["Clamperl-Delta"],
	},
	lightball: {
		inherit: true,
		onModifyAtk(atk, pokemon) {
			if (['Pikachu', 'Pikachu-Delta'].includes(pokemon.baseSpecies.baseSpecies)) {
				return this.chainModify(2);
			}
		},
		onModifySpA(spa, pokemon) {
			if (['Pikachu', 'Pikachu-Delta'].includes(pokemon.baseSpecies.baseSpecies)) {
				return this.chainModify(2);
			}
		},
		itemUser: ["Pikachu", "Pikachu-Cosplay", "Pikachu-Rock-Star", "Pikachu-Belle", "Pikachu-Pop-Star", "Pikachu-PhD", "Pikachu-Libre", "Pikachu-Original", "Pikachu-Hoenn", "Pikachu-Sinnoh", "Pikachu-Unova", "Pikachu-Kalos", "Pikachu-Alola", "Pikachu-Partner", "Pikachu-Starter", "Pikachu-World", "Pikachu-Delta"],
	},
	metalpowder: {
		inherit: true,
		onModifyDef(def, pokemon) {
			if (['Ditto', 'Ditto-Delta'].includes(pokemon.species.name) && !pokemon.transformed) {
				return this.chainModify(2);
			}
		},
		itemUser: ["Ditto", "Ditto-Delta"],
	},
	quickpowder: {
		inherit: true,
		onModifySpe(spe, pokemon) {
			if (['Ditto', 'Ditto-Delta'].includes(pokemon.species.name) && !pokemon.transformed) {
				return this.chainModify(2);
			}
		},
		itemUser: ["Ditto", "Ditto-Delta"],
	},
	crystalpiece: {
		name: "Crystal Piece",
		desc: "If held by Giratina/Arceus/Regigigas, this item triggers its Primal Reversion.",
		spritenum: -1,
		itemUser: ["Arceus", "Giratina", "Regigigas"],
		onSwitchInPriority: -1,
		onSwitchIn(pokemon) {
			if (pokemon.isActive && ['Arceus', 'Giratina', 'Regigigas'].includes(pokemon.baseSpecies.name) &&
				!pokemon.transformed) {
				pokemon.formeChange(pokemon.baseSpecies.name + '-Primal', this.effect, true);
			}
		},
		onTakeItem(item, source) {
			return !['Arceus', 'Giratina', 'Regigigas'].includes(source.baseSpecies.baseSpecies);
		},
		num: 0,
	},
	flygonarmor: {
		name: "Flygon Armor",
		desc: "If held by a Flygon, this item changes its forme to Armored.",
		spritenum: -1,
		onTakeItem(item, pokemon, source) {
			return !(source?.baseSpecies.baseSpecies === 'Flygon' || pokemon.baseSpecies.baseSpecies === 'Flygon');
		},
		forcedForme: "Flygon-Armor",
		itemUser: ["Flygon-Armor"],
		num: 0,
	},
	leavannyarmor: {
		name: "Leavanny Armor",
		desc: "If held by a Leavanny, this item changes its forme to Armored.",
		spritenum: -1,
		onTakeItem(item, pokemon, source) {
			return !(source?.baseSpecies.baseSpecies === 'Leavanny' || pokemon.baseSpecies.baseSpecies === 'Leavanny');
		},
		forcedForme: "Leavanny-Armor",
		itemUser: ["Leavanny-Armor"],
		num: 0,
	},
	mewtwoarmor: {
		name: "Mewtwo Armor",
		desc: "If held by a Mewtwo, this item changes its forme to Armored.",
		spritenum: -1,
		onTakeItem(item, pokemon, source) {
			return !(source?.baseSpecies.baseSpecies === 'Mewtwo' || pokemon.baseSpecies.baseSpecies === 'Mewtwo');
		},
		forcedForme: "Mewtwo-Armor",
		itemUser: ["Mewtwo-Armor"],
		num: 0,
	},
	tyranitararmor: {
		name: "Tyranitar Armor",
		desc: "If held by a Tyranitar, this item changes its forme to Armored.",
		spritenum: -1,
		onTakeItem(item, pokemon, source) {
			return !(source?.baseSpecies.baseSpecies === 'Tyranitar' || pokemon.baseSpecies.baseSpecies === 'Tyranitar');
		},
		forcedForme: "Tyranitar-Armor",
		itemUser: ["Tyranitar-Armor"],
		num: 0,
	},
	volcaronadeltaarmor: {
		name: "Volcarona-Delta Armor",
		desc: "If held by a Volcarona-Delta, this item changes its forme to Armored.",
		spritenum: -1,
		onTakeItem(item, pokemon, source) {
			return !(source?.baseSpecies.baseSpecies === 'Volcarona-Delta' ||
				pokemon.baseSpecies.baseSpecies === 'Volcarona-Delta');
		},
		forcedForme: "Volcarona-Delta-Armor",
		itemUser: ["Volcarona-Delta-Armor"],
		num: 0,
	},
	zekromarmor: {
		name: "Zekrom Armor",
		desc: "If held by a Zekrom, this item changes its forme to Armored.",
		spritenum: -1,
		onTakeItem(item, pokemon, source) {
			return !(source?.baseSpecies.baseSpecies === 'Zekrom' || pokemon.baseSpecies.baseSpecies === 'Zekrom');
		},
		forcedForme: "Zekrom-Armor",
		itemUser: ["Zekrom-Armor"],
		num: 0,
	},
	eevite: {
		name: "Eevite",
		desc: "If held by a Eevee, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Eevee": "Eevee-Mega" },
		itemUser: ["Eevee"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies] && !(
				source.species.id === 'espeon' ||
				source.species.id === 'jolteon' ||
				source.species.id === 'flareon' ||
				source.species.id === 'umbreon' ||
				source.species.id === 'glaceon' ||
				source.species.id === 'leafeon' ||
				source.species.id === 'sylveon' ||
				source.species.id === 'vaporeon'
			);
		},
		num: 0,
	},
};
