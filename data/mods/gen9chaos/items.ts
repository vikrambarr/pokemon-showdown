export const Items: import('../../../sim/dex-items').ModdedItemDataTable = {
	lightball: {
		inherit: true,
		onModifyAtk(atk, pokemon) {
			if (pokemon.species.name.includes('Pikachu')) {
				return this.chainModify(2);
			}
		},
		onModifySpA(spa, pokemon) {
			if (pokemon.species.name.includes('Pikachu')) {
				return this.chainModify(2);
			}
		},
		itemUser: ["Pikachu", "Pikachu-Cosplay", "Pikachu-Rock-Star", "Pikachu-Belle", "Pikachu-Pop-Star", "Pikachu-PhD", "Pikachu-Libre", "Pikachu-Original", "Pikachu-Hoenn", "Pikachu-Sinnoh", "Pikachu-Unova", "Pikachu-Kalos", "Pikachu-Alola", "Pikachu-Partner", "Pikachu-Starter", "Pikachu-World", "Pikachu-Delta", "Pikachu-Ash"],
	},
	luckypunch: {
		inherit: true,
		onModifyCritRatio(critRatio, user) {
			if (user.species.name.includes('Chansey')) {
				return critRatio + 2;
			}
		},
		itemUser: ["Chansey", "Chansey-Egho"],
	},
	metalpowder: {
		inherit: true,
		onModifyDef(def, pokemon) {
			if (pokemon.species.name.includes('Ditto') && !pokemon.transformed) {
				return this.chainModify(2);
			}
		},
		itemUser: ["Ditto", "Ditto-Delta"],
	},
	quickpowder: {
		inherit: true,
		onModifySpe(spe, pokemon) {
			if (pokemon.species.name.includes('Ditto') && !pokemon.transformed) {
				return this.chainModify(2);
			}
		},
		itemUser: ["Ditto", "Ditto-Delta"],
	},
	stick: {
		inherit: true,
		onModifyCritRatio(critRatio, user) {
			if (['farfetchd', 'barand', 'barandnuclear'].includes(this.toID(user.baseSpecies.baseSpecies))) {
				return critRatio + 2;
			}
		},
		itemUser: ["Farfetch\u2019d", "Barand", "Barand-Nuclear"],
		shortDesc: "If held by a Farfetch’d or Barand, its critical hit ratio is raised by 2 stages.",
	},
};
