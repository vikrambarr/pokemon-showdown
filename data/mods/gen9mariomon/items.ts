export const Items: import('../../../sim/dex-items').ModdedItemDataTable = {
	goombaboots: {
		name: "Goomba Boots",
		spritenum: 0,
		fling: {
			basePower: 10,
		},
		onModifySpe(spe, pokemon) {
			if (["Goomba", "Goomba Stack"].includes(pokemon.species.name) && !pokemon.transformed) {
				return this.chainModify(2);
			}
		},
		itemUser: ["Goomba", "Goomba Stack"],
		shortDesc: "If held by a Goomba/Goomba Stack, its Speed is doubled.",
		num: 0,
	},
	sturdyshell: {
		name: "Sturdy Shell",
		spritenum: 0,
		fling: {
			basePower: 10,
		},
		onModifyDef(def, pokemon) {
			if (["Koopa Troopa", "Paratroopa", "Dry Bones", "Hammer Bro"].includes(pokemon.species.name) && !pokemon.transformed) {
				return this.chainModify(2);
			}
		},
		itemUser: ["Koopa Troopa", "Paratroopa", "Dry Bones", "Hammer Bro"],
		shortDesc: "If held by Koopa Troopa/Paratroopa/Dry Bones/Hammer Bro, its Defense is doubled.",
		num: 0,
	},
};
