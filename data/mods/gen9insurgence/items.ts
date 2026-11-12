export const Items: import('../../../sim/dex-items').ModdedItemDataTable = {
	dragonfang: {
		inherit: true,
		onModifyAtk(atk, pokemon) {
			if (pokemon.species.name === 'Clamperl-Delta' || pokemon.m.fusion === 'Clamperl-Delta') {
				return this.chainModify(2);
			}
		},
		itemUser: ["Clamperl-Delta"],
	},
	dragonscale: {
		inherit: true,
		onModifyDef(def, pokemon) {
			if (pokemon.species.name === 'Clamperl-Delta' || pokemon.m.fusion === 'Clamperl-Delta') {
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
	},
	crystalfragment: {
		name: "Crystal Fragment",
		desc: "If held by a Delta Metagross Ruin, this item allows it to Crystallize in battle.",
		spritenum: -1,
		megaStone: { "Metagross-Delta-Ruin": "Metagross-Delta-Ruin-Crystal" },
		itemUser: ["Metagross-Delta-Ruin"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
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
	},
	poliwrathite: {
		name: "Poliwrathite",
		desc: "If held by a Poliwrath, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Poliwrath": "Poliwrath-Mega" },
		itemUser: ["Poliwrath"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	marowakite: {
		name: "Marowakite",
		desc: "If held by a Marowak, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Marowak": "Marowak-Mega" },
		itemUser: ["Marowak"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
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
	},
	meganiumitei: {
		name: "Meganiumite I",
		desc: "If held by a Meganium, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Meganium": "Meganium-Mega-I" },
		itemUser: ["Meganium"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	typhlosionite: {
		name: "Typhlosionite",
		desc: "If held by a Typhlosion, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Typhlosion": "Typhlosion-Mega" },
		itemUser: ["Typhlosion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	feraligatitei: {
		name: "Feraligatite I",
		desc: "If held by a Feraligatr, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Feraligatr": "Feraligatr-Mega-I" },
		itemUser: ["Feraligatr"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	sudowoodite: {
		name: "Sudowoodite",
		desc: "If held by a Sudowoodo, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Sudowoodo": "Sudowoodo-Mega" },
		itemUser: ["Sudowoodo"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	politoedite: {
		name: "Politoedite",
		desc: "If held by a Politoed, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Politoed": "Politoed-Mega" },
		itemUser: ["Politoed"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	sunflorite: {
		name: "Sunflorite",
		desc: "If held by a Sunflora, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Sunflora": "Sunflora-Mega-M" },
		itemUser: ["Sunflora"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	etigirafarigite: {
		name: "Etigirafarigite",
		desc: "If held by a Girafarig, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Girafarig": "Girafarig-Mega" },
		itemUser: ["Girafarig"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	magcargonite: {
		name: "Magcargonite",
		desc: "If held by a Magcargo, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Magcargo": "Magcargo-Mega" },
		itemUser: ["Magcargo"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	donphanite: {
		name: "Donphanite",
		desc: "If held by a Donphan, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Donphan": "Donphan-Mega" },
		itemUser: ["Donphan"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	miltankite: {
		name: "Miltankite",
		desc: "If held by a Miltank, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Miltank": "Miltank-Mega" },
		itemUser: ["Miltank"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	shiftrite: {
		name: "Shiftrite",
		desc: "If held by a Shiftry, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Shiftry": "Shiftry-Mega" },
		itemUser: ["Shiftry"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	flygonite: {
		name: "Flygonite",
		desc: "If held by a Flygon, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Flygon": "Flygon-Mega" },
		itemUser: ["Flygon"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	cacturnite: {
		name: "Cacturnite",
		desc: "If held by a Cacturne, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Cacturne": "Cacturne-Mega" },
		itemUser: ["Cacturne"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	crawdauntite: {
		name: "Crawdauntite",
		desc: "If held by a Crawdaunt, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Crawdaunt": "Crawdaunt-Mega" },
		itemUser: ["Crawdaunt"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	milotite: {
		name: "Milotite",
		desc: "If held by a Milotic, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Milotic": "Milotic-Mega" },
		itemUser: ["Milotic"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	jirachite: {
		name: "Jirachite",
		desc: "If held by a Jirachi, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Jirachi": "Jirachi-Mega" },
		itemUser: ["Jirachi"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	chatotite: {
		name: "Chatotite",
		desc: "If held by a Chatot, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Chatot": "Chatot-Mega" },
		itemUser: ["Chatot"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	spiritombite: {
		name: "Spiritombite",
		desc: "If held by a Spiritomb, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Spiritomb": "Spiritomb-Mega" },
		itemUser: ["Spiritomb"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	froslassitei: {
		name: "Froslassite I",
		desc: "If held by a Froslass, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Froslass": "Froslass-Mega-I" },
		itemUser: ["Froslass"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	zebstrikite: {
		name: "Zebstrikite",
		desc: "If held by a Zebstrika, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Zebstrika": "Zebstrika-Mega" },
		itemUser: ["Zebstrika"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	zoronite: {
		name: "Zoronite",
		desc: "If held by a Zoroark, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Zoroark": "Zoroark-Mega" },
		itemUser: ["Zoroark"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	gothitite: {
		name: "Gothitite",
		desc: "If held by a Gothitelle, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Gothitelle": "Gothitelle-Mega" },
		itemUser: ["Gothitelle"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	reuniclite: {
		name: "Reuniclite",
		desc: "If held by a Reuniclus, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Reuniclus": "Reuniclus-Mega" },
		itemUser: ["Reuniclus"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	haxorite: {
		name: "Haxorite",
		desc: "If held by a Haxorus, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Haxorus": "Haxorus-Mega" },
		itemUser: ["Haxorus"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	cryogonalite: {
		name: "Cryogonalite",
		desc: "If held by a Cryogonal, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Cryogonal": "Cryogonal-Mega" },
		itemUser: ["Cryogonal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	stunfiskite: {
		name: "Stunfiskite",
		desc: "If held by a Stunfisk, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Stunfisk": "Stunfisk-Mega" },
		itemUser: ["Stunfisk"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	bisharpite: {
		name: "Bisharpite",
		desc: "If held by a Bisharp, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Bisharp": "Bisharp-Mega" },
		itemUser: ["Bisharp"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	hydreigonite: {
		name: "Hydreigonite",
		desc: "If held by a Hydreigon, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Hydreigon": "Hydreigon-Mega" },
		itemUser: ["Hydreigon"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltavenusaurite: {
		name: "Delta Venusaurite",
		desc: "If held by a Delta Venusaur, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Venusaur-Delta": "Venusaur-Delta-Mega" },
		itemUser: ["Venusaur-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltacharizardite: {
		name: "Delta Charizardite",
		desc: "If held by a Delta Charizard, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Charizard-Delta": "Charizard-Delta-Mega" },
		itemUser: ["Charizard-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltablastoisinite: {
		name: "Delta Blastoisinite",
		desc: "If held by a Delta Blastoise, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Blastoise-Delta": "Blastoise-Delta-Mega" },
		itemUser: ["Blastoise-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltabisharpite: {
		name: "Delta Bisharpite",
		desc: "If held by a Delta Bisharp, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Bisharp-Delta": "Bisharp-Delta-Mega" },
		itemUser: ["Bisharp-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltagardevoirite: {
		name: "Delta Gardevoirite",
		desc: "If held by a Delta Gardevoir, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Gardevoir-Delta": "Gardevoir-Delta-Mega" },
		itemUser: ["Gardevoir-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltagalladite: {
		name: "Delta Galladite",
		desc: "If held by a Delta Gallade, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Gallade-Delta": "Gallade-Delta-Mega" },
		itemUser: ["Gallade-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltasunflorite: {
		name: "Delta Sunflorite",
		desc: "If held by a Delta Sunflora, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Sunflora-Delta": "Sunflora-Delta-Mega" },
		itemUser: ["Sunflora-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltascizorite: {
		name: "Delta Scizorite",
		desc: "If held by a Delta Scizor, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Scizor-Delta": "Scizor-Delta-Mega" },
		itemUser: ["Scizor-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltaglalitite: {
		name: "Delta Glalitite",
		desc: "If held by a Delta Glalie, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Glalie-Delta": "Glalie-Delta-Mega" },
		itemUser: ["Glalie-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltafroslassite: {
		name: "Delta Froslassite",
		desc: "If held by a Delta Froslass, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Froslass-Delta": "Froslass-Delta-Mega" },
		itemUser: ["Froslass-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltatyphlosionite: {
		name: "Delta Typhlosionite",
		desc: "If held by a Delta Typhlosion, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Typhlosion-Delta": "Typhlosion-Delta-Mega" },
		itemUser: ["Typhlosion-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltapidgeotite: {
		name: "Delta Pidgeotite",
		desc: "If held by a Delta Pidgeot, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Pidgeot-Delta": "Pidgeot-Delta-Mega" },
		itemUser: ["Pidgeot-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltaetigirafarigite: {
		name: "Delta Etigirafarigite",
		desc: "If held by a Delta Girafarig, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Girafarig-Delta": "Girafarig-Delta-Mega" },
		itemUser: ["Girafarig-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltasablenite: {
		name: "Delta Sablenite",
		desc: "If held by a Delta Sableye, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Sableye-Delta": "Sableye-Delta-Mega" },
		itemUser: ["Sableye-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltamawilite: {
		name: "Delta Mawilite",
		desc: "If held by a Delta Mawile, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Mawile-Delta": "Mawile-Delta-Mega" },
		itemUser: ["Mawile-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltamedichamite: {
		name: "Delta Medichamite",
		desc: "If held by a Delta Medicham, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Medicham-Delta": "Medicham-Delta-Mega" },
		itemUser: ["Medicham-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltacameruptite: {
		name: "Delta Cameruptite",
		desc: "If held by a Delta Camerupt, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Camerupt-Delta": "Camerupt-Delta-Mega" },
		itemUser: ["Camerupt-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltamilotite: {
		name: "Delta Milotite",
		desc: "If held by a Delta Milotic, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Milotic-Delta": "Milotic-Delta-Mega" },
		itemUser: ["Milotic-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltametagrossitespider: {
		name: "Delta Metagrossite (Spider)",
		desc: "If held by a Delta Metagross Spider, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Metagross-Delta-Spider": "Metagross-Delta-Spider-Mega" },
		itemUser: ["Metagross-Delta-Spider"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltametagrossiteruin: {
		name: "Delta Metagrossite (Ruin)",
		desc: "If held by a Delta Metagross Ruin, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Metagross-Delta-Ruin": "Metagross-Delta-Ruin-Mega" },
		itemUser: ["Metagross-Delta-Ruin"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltalopunnite: {
		name: "Delta Lopunnite",
		desc: "If held by a Delta Lopunny, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Lopunny-Delta": "Lopunny-Delta-Mega" },
		itemUser: ["Lopunny-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltalucarionite: {
		name: "Delta Lucarionite",
		desc: "If held by a Delta Lucario, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Lucario-Delta": "Lucario-Delta-Mega" },
		itemUser: ["Lucario-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	steelixitefire: {
		name: "Steelixite Fire",
		desc: "If held by a Steelix, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Steelix": "Steelix-Mega-F" },
		itemUser: ["Steelix"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	shadowmewtwonitex: {
		name: "Shadow Mewtwonite X",
		desc: "If held by a Mewtwo-Shadow, this item allows it to Mega Evolve in battle.",
		spritenum: -1,
		megaStone: { "Mewtwo-Shadow": "Mewtwo-Shadow-Mega-X" },
		itemUser: ["Mewtwo-Shadow"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
};
