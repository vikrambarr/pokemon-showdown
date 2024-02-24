export const Pokedex: {[k: string]: ModdedSpeciesData} = {
	
	// Resubmissions
	soulply: {
		num: 6001,
		name: "Soulply",
		types: ["Ghost"],
		baseStats: {hp: 110, atk: 90, def: 90, spa: 20, spd: 119, spe: 33},
		abilities: {0: "Sticky Hold", 1: "Weak Armor", H: "Consumer Exchange"},
		heightm: 0.6,
		weightkg: 4,
		color: "Black",
		tags: ["Pokeathlon"],
		eggGroups: ["Undiscovered"],
		tier: "OU",
		natDexTier: "OU",
	},
	imitotion: {
		num: 6002,
		name: "Imitotion",
		types: ["Bug"],
		baseStats: {hp: 70, atk: 50, def: 25, spa: 50, spd: 25, spe: 80},
		abilities: {0: "Swarm", H: "Rattled"},
		heightm: 1.85,
		weightkg: 95,
		color: "Purple",
		evoLevel: 45,
		evos: ["Aviotion"],
		tags: ["Pokeathlon"],
		eggGroups: ["Amorphous"],
		tier: "LC",
		natDexTier: "LC",
	},
	aviotion: {
		num: 6003,
		name: "Aviotion",
		types: ["Bug"],
		baseStats: {hp: 90, atk: 70, def: 45, spa: 70, spd: 45, spe: 100},
		abilities: {0: "Swarm", H: "Intimidate"},
		heightm: 1.85,
		weightkg: 95,
		color: "Purple",
		evoLevel: 55,
		prevo: "Imitotion",
		evos: ["Dracotion"],
		tags: ["Pokeathlon"],
		eggGroups: ["Amorphous"],
		tier: "NFE",
		natDexTier: "NFE",
	},
	dracotion: {
		num: 6004,
		name: "Dracotion",
		types: ["Bug", "Dragon"],
		baseStats: {hp: 120, atk: 100, def: 75, spa: 100, spd: 75, spe: 130},
		abilities: {0: "Windy Wall", H: "Intimidate"},
		heightm: 1.85,
		weightkg: 95,
		color: "Purple",
		prevo: "Aviotion",
		tags: ["Pokeathlon"],
		eggGroups: ["Amorphous"],
		tier: "OU",
		natDexTier: "OU",
	},
	bunnor: {
		num: 6005,
		name: "Bunnor",
		types: ["Normal", "Ice"],
		baseStats: {hp: 30, atk: 75, def: 25, spa: 45, spd: 35, spe: 40},
		abilities: {0: "Snow Cloak", 1: "Ice Body", H: "Fluffy"},
		heightm: 0.4,
		weightkg: 2,
		color: "White",
		evos: ["Rabbicicle"],
		tags: ["Pokeathlon"],
		eggGroups: ["Undiscovered"],
		tier: "LC",
		natDexTier: "LC",
	},
	rabbicicle: {
		num: 6006,
		name: "Rabbicicle",
		types: ["Normal", "Ice"],
		baseStats: {hp: 90, atk: 105, def: 65, spa: 65, spd: 75, spe: 100},
		abilities: {0: "Snow Cloak", 1: "Ice Body", H: "Fluffy"},
		heightm: 0.8,
		weightkg: 10,
		color: "White",
		prevo: "Bunnor",
		tags: ["Pokeathlon"],
		eggGroups: ["Undiscovered"],
		tier: "OU",
		natDexTier: "UU",
	},
	enchantobra: {
		num: 6007,
		name: "Enchantobra",
		types: ["Fire", "Fairy"],
		baseStats: {hp: 117, atk: 40, def: 60, spa: 117, spd: 60, spe: 116},
		abilities: {0: "Cute Charm", 1: "Flame Body", H: "Magic Guard"},
		heightm: 1.3,
		weightkg: 31.5,
		color: "Red",
		evoLevel: 37,
		tags: ["Pokeathlon"],
		eggGroups: ["Human-Like"],
		tier: "UU",
		natDexTier: "UU",
	},
	eyespy: {
		num: 6008,
		name: "Eyespy",
		types: ["Psychic"],
		gender: "N",
		baseStats: {hp: 40, atk: 20, def: 20, spa: 40, spd: 20, spe: 40},
		abilities: {0: "Keen Eye", H: "Levitate"},
		heightm: 0.5,
		weightkg: 5,
		evos: ["Icyall"],
		color: "Black",
		tags: ["Pokeathlon"],
		eggGroups: ["Undiscovered"],
		tier: "LC",
		natDexTier: "LC",
	},
	icyall: {
		num: 6009,
		name: "Icyall",
		types: ["Psychic"],
		gender: "N",
		baseStats: {hp: 100, atk: 80, def: 60, spa: 140, spd: 60, spe: 80},
		abilities: {0: "Multishot", H: "Compound Eyes"},
		heightm: 2,
		weightkg: 52,
		prevo: "Eyespy",
		color: "Black",
		tags: ["Pokeathlon"],
		eggGroups: ["Undiscovered"],
		tier: "OU",
		natDexTier: "OU",
	},
	ironeverlasting: {
		num: 6010,
		name: "Iron Everlasting",
		types: ["Normal", "Steel"],
		gender: "N",
		baseStats: {hp: 90, atk: 114, def: 80, spa: 76, spd: 80, spe: 130},
		abilities: {0: "Quark Drive"},
		heightm: 0.9,
		weightkg: 68,
		color: "Gray",
		tags: ["Paradox", "Pokeathlon"],
		eggGroups: ["Undiscovered"],
		tier: "UU",
		natDexTier: "UU",
	},
	golisopodshogun: {
		num: 768,
		name: "Golisopod-Shogun",
		baseSpecies: "Golisopod",
		forme: "Shogun",
		types: ["Bug", "Steel"],
		baseStats: {hp: 75, atk: 125, def: 140, spa: 60, spd: 90, spe: 40},
		abilities: {0: "Bushido", H: "Sharpness"},
		heightm: 2,
		weightkg: 108,
		color: "Gray",
		evoLevel: 30,
		tags: ["Pokeathlon"],
		eggGroups: ["Bug", "Water 3"],
		tier: "OU",
		natDexTier: "OU",
	},
	tinkatonrhinian: {
		num: 959,
		name: "Tinkaton-Rhinian",
		baseSpecies: "Tinkaton",
		forme: "Rhinian",
		types: ["Fairy", "Normal"],
		gender: "F",
		baseStats: {hp: 85, atk: 70, def: 77, spa: 65, spd: 115, spe: 94},
		abilities: {0: "Fairy Law"},
		heightm: 0.7,
		weightkg: 112.8,
		color: "Pink",
		tags: ["Pokeathlon"],
		eggGroups: ["Fairy"],
		tier: "UU",
		natDexTier: "RU",
	},
	regimyo: {
		num: 6011,
		name: "Regimyo",
		types: ["Fighting"],
		gender: "N",
		baseStats: {hp: 80, atk: 150, def: 150, spa: 75, spd: 50, spe: 75},
		abilities: {0: "Clear Body", H: "Muscle Memory"},
		heightm: 1.2,
		weightkg: 255,
		color: "Red",
		tags: ["Sub-Legendary", "Pokeathlon"],
		eggGroups: ["Undiscovered"],
		tier: "OU",
		natDexTier: "OU",
	},
	jovianshk: {
		num: 6012,
		name: "Jovianshk",
		types: ["Dragon", "Psychic"],
		baseStats: {hp: 95, atk: 97, def: 72, spa: 123, spd: 95, spe: 98},
		abilities: {0: "Slow Light", H: "Levitate"},
		heightm: 1.0,
		weightkg: 50.2,
		color: "Black",
		tags: ["Pokeathlon"],
		eggGroups: ["Undiscovered"],
		tier: "UU",
		natDexTier: "UU",
	},
	lunachi: {
		num: 6013,
		name: "Lunachi",
		baseForme: "Aria",
		types: ["Fairy", "Dark"],
		baseStats: {hp: 99, atk: 93, def: 82, spa: 93, spd: 92, spe: 121},
		abilities: {0: "Sacred Treasures"},
		heightm: 0.3,
		weightkg: 11,
		color: "White",
		tags: ["Pokeathlon"],
		eggGroups: ["Undiscovered"],
		otherFormes: ["Lunachi-Bestowed"],
		formeOrder: ["Lunachi", "Lunachi-Bestowed"],
		tier: "OU",
		natDexTier: "UU",
	},
	lunachibestowed: {
		num: 6013,
		name: "Lunachi-Bestowed",
		baseSpecies: "Lunachi",
		forme: "Bestowed",
		types: ["Fairy", "Dark"],
		baseStats: {hp: 99, atk: 93, def: 82, spa: 93, spd: 92, spe: 121},
		abilities: {0: "Sacred Treasures"},
		heightm: 0.3,
		weightkg: 11,
		color: "White",
		tags: ["Pokeathlon"],
		eggGroups: ["Undiscovered"],
		battleOnly: "Lunachi",
		tier: "Illegal",
		natDexTier: "Illegal",
	},
	ockthane: {
		num: 6014,
		name: "Ockthane",
		types: ["Ice", "Electric"],
		baseStats: {hp: 87, atk: 93, def: 62, spa: 144, spd: 116, spe: 78},
		abilities: {0: "Supreme Overlord", H: "Psychic Surge"},
		heightm: 0.6,
		weightkg: 17,
		color: "Yellow",
		tags: ["Pokeathlon"],
		eggGroups: ["Undiscovered"],
		tier: "OU",
		natDexTier: "UU",
	},
	incineroarolulian: {
		num: 727,
		name: "Incineroar-Olulian",
		baseSpecies: "Incineroar",
		forme: "Olulian",
		types: ["Fighting", "Steel"],
		baseStats: {hp: 95, atk: 130, def: 110, spa: 65, spd: 80, spe: 50},
		abilities: {0: "Iron Fist", 1: "Steelworker"},
		heightm: 1.7,
		weightkg: 76.1,
		color: "Pink",
		tags: ["Pokeathlon"],
		eggGroups: ["Human-Like"],
		tier: "UU",
		natDexTier: "RU",
	},
	raikousupra: {
		num: 243,
		name: "Raikou-Supra",
		baseSpecies: "Raikou",
		forme: "Supra",
		types: ["Rock"],
		gender: "N",
		baseStats: {hp: 90, atk: 85, def: 75, spa: 115, spd: 100, spe: 115},
		abilities: {0: "Sand Stream", 1: "Sandy Defense", H: "Adaptability"},
		heightm: 1.9,
		weightkg: 178,
		color: "Yellow",
		tags: ["Sub-Legendary", "Pokeathlon"],
		eggGroups: ["Undiscovered"],
		tier: "OU",
		natDexTier: "UU",
	},
	heatransupra: {
		num: 485,
		name: "Heatran-Supra",
		baseSpecies: "Heatran",
		forme: "Supra",
		types: ["Fire", "Grass"],
		baseStats: {hp: 91, atk: 90, def: 106, spa: 130, spd: 106, spe: 77},
		abilities: {0: "Dancer", H: "Chlorophyll"},
		heightm: 1.7,
		weightkg: 430,
		color: "Brown",
		tags: ["Sub-Legendary", "Pokeathlon"],
		eggGroups: ["Undiscovered"],
		tier: "OU",
		natDexTier: "OU",
	},
	mosster: {
		num: 6015,
		name: "Mosster",
		types: ["Rock", "Grass"],
		baseStats: {hp: 120, atk: 90, def: 120, spa: 50, spd: 100, spe: 30},
		abilities: {0: "Water Absorb", H: "Inertia"},
		heightm: 0.6,
		weightkg: 90,
		color: "Green",
		tags: ["Pokeathlon"],
		eggGroups: ["Undiscovered"],
		tier: "OU",
		natDexTier: "OU",
	},
	barrimander: {
		num: 6016,
		name: "Barrimander",
		types: ["Psychic", "Poison"],
		baseStats: {hp: 50, atk: 70, def: 70, spa: 80, spd: 80, spe: 105},
		abilities: {0: "Own Tempo", 1: "Dry Skin", H: "Prankster"},
		heightm: 0.8,
		weightkg: 10,
		color: "Black",
		tags: ["Pokeathlon"],
		eggGroups: ["Undiscovered"],
		tier: "UU",
		natDexTier: "UU",
	},
	meditao: {
		num: 6017,
		name: "Meditao",
		types: ["Psychic", "Fighting"],
		baseStats: {hp: 60, atk: 65, def: 65, spa: 65, spd: 65, spe: 90},
		abilities: {0: "Inner Focus", H: "Muscle Memory"},
		heightm: 1.3,
		weightkg: 31.5,
		color: "Black",
		prevo: "Meditite",
		evoLevel: 37,
		tags: ["Pokeathlon"],
		eggGroups: ["Human-Like"],
		tier: "RU",
		natDexTier: "RU",
	},
	electrodemega: {
		num: 101,
		name: "Electrode-Mega",
		baseSpecies: "Electrode",
		forme: "Mega",
		types: ["Electric"],
		baseStats: {hp: 60, atk: 200, def: 10, spa: 110, spd: 10, spe: 200},
		abilities: {0: "Kablooey"},
		heightm: 1.7,
		weightkg: 80,
		color: "Red",
		tags: ["Pokeathlon"],
		eggGroups: ["Mineral"],
		requiredItem: "Electrodite",
		tier: "OU",
		natDexTier: "OU",
	},
	florgesmega: {
		num: 671,
		name: "Florges-Mega",
		baseSpecies: "Florges",
		forme: "Mega",
		types: ["Fairy"],
		gender: "F",
		baseStats: {hp: 78, atk: 55, def: 108, spa: 132, spd: 184, spe: 95},
		abilities: {0: "Ivy Wall"},
		heightm: 1.1,
		weightkg: 10,
		color: "White",
		eggGroups: ["Fairy"],
		tags: ["Pokeathlon"],
		requiredItem: "Florgesite",
		tier: "OU",
		natDexTier: "OU",
	},

	// Pokeathlon
	bewitwing: {
		num: 6018,
		name: "Bewitwing",
		types: ["Ghost", "Fairy"],
		baseStats: {hp: 95, atk: 100, def: 85, spa: 85, spd: 130, spe: 90},
		abilities: {0: "Serene Grace", 1: "Cute Charm", H: "Prankster"},
		heightm: 0.5,
		weightkg: 9,
		color: "Purple",
		tags: ["Pokeathlon"],
		eggGroups: ["Undiscovered"],
		tier: "UU",
		natDexTier: "UU",
	},
	eidolburgh: {
		num: 6019,
		name: "Eidolburgh",
		types: ["Bug", "Fairy"],
		baseStats: {hp: 93, atk: 72, def: 117, spa: 133, spd: 132, spe: 53},
		abilities: {0: "Sanctuary"},
		heightm: 2.1,
		weightkg: 266,
		color: "Gray",
		tags: ["Pokeathlon"],
		eggGroups: ["Undiscovered"],
		tier: "UU",
		natDexTier: "RU",
	},
	snorlaxfrost: {
		num: 143,
		name: "Snorlax-Frost",
		baseSpecies: "Snorlax",
		forme: "Frost",
		types: ["Ground", "Ice"],
		baseStats: {hp: 160, atk: 110, def: 65, spa: 65, spd: 110, spe: 30},
		abilities: {0: "Thick Fat", 1: "Cursed Body", H: "Refrigerate"},
		heightm: 2.1,
		weightkg: 460,
		color: "Brown",
		tags: ["Pokeathlon"],
		eggGroups: ["Monster"],
		tier: "OU",
		natDexTier: "UU",
	},
	heracrosssubarctic: {
		num: 214,
		name: "Heracross-Subarctic",
		baseSpecies: "Heracross",
		forme: "Subarctic",
		types: ["Bug", "Ice"],
		baseStats: {hp: 85, atk: 35, def: 75, spa: 135, spd: 90, spe: 80},
		abilities: {0: "Compound Eyes", 1: "Quick Feet", H: "Slush Rush"},
		heightm: 1.5,
		weightkg: 54,
		color: "Red",
		tags: ["Pokeathlon"],
		eggGroups: ["Bug"],
		tier: "OU",
		natDexTier: "UU",
	},
};