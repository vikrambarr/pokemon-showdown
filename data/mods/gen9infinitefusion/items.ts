export const Items: import('../../../sim/dex-items').ModdedItemDataTable = {
	mankeyspaw: {
		name: "Mankey\u2019s Paw",
		desc: "Critical hit ratio is raised by 3 stages, accuracy of moves is halved.",
		spritenum: 261,
		fling: {
			basePower: 10,
		},
		onSourceModifyAccuracyPriority: -2,
		onSourceModifyAccuracy(accuracy) {
			if (typeof accuracy === 'number') {
				return this.chainModify(0.5);
			} else {
				return 50;
			}
		},
		onModifyCritRatio(critRatio) {
			return critRatio + 3;
		},
		num: 0,
	},
	necrozium: {
		name: "Necrozium",
		desc: "If held by Necrozma, Photon Geyser causes transformation to Ultra forme.",
		spritenum: 108,
		onTakeItem(item, pokemon, source) {
			const validFormes = ['Necrozma', 'Necrozma-Ultra'];
			if ((source && validFormes.includes(source.baseSpecies.name)) || validFormes.includes(pokemon.baseSpecies.name)) {
				return false;
			}
			return true;
		},
		itemUser: ["Necrozma"],
		num: 0,
	},
	deepseascale: {
		inherit: true,
		isNonstandard: null,
		onModifySpD(spd, pokemon) {
			if (pokemon.baseSpecies.name === 'Clamperl' || pokemon.m.fusion === 'Clamperl') {
				return this.chainModify(2);
			}
		},
	},
	deepseatooth: {
		inherit: true,
		isNonstandard: null,
		onModifySpA(spa, pokemon) {
			if (pokemon.baseSpecies.name === 'Clamperl' || pokemon.m.fusion === 'Clamperl') {
				return this.chainModify(2);
			}
		},
	},
	eviolite: {
		inherit: true,
		onModifyDef(def, pokemon) {
			if (pokemon.baseSpecies.nfe || this.dex.species.get(pokemon.m.fusion).nfe || pokemon.baseSpecies.id === 'dipplin') {
				return this.chainModify(1.5);
			}
		},
		onModifySpD(spd, pokemon) {
			if (pokemon.baseSpecies.nfe || this.dex.species.get(pokemon.m.fusion).nfe || pokemon.baseSpecies.id === 'dipplin') {
				return this.chainModify(1.5);
			}
		},
	},
	leek: {
		inherit: true,
		isNonstandard: null,
		onModifyCritRatio(critRatio, user) {
			if (["farfetchd", "sirfetchd"].includes(this.toID(user.baseSpecies.baseSpecies)) ||
				["farfetchd", "sirfetchd", "farfetchdgalar"].includes(this.toID(user.m.fusion))) {
				return critRatio + 2;
			}
		},
	},
	stick: {
		inherit: true,
		onModifyCritRatio(critRatio, user) {
			if (
				this.toID(user.baseSpecies.baseSpecies) === 'farfetchd' ||
				this.toID(this.dex.species.get(user.m.fusion).baseSpecies) === 'farfetchd'
			) {
				return critRatio + 2;
			}
		},
	},
	lightball: {
		inherit: true,
		onModifyAtk(atk, pokemon) {
			if (pokemon.baseSpecies.baseSpecies === 'Pikachu' || this.dex.species.get(pokemon.m.fusion).baseSpecies === 'Pikachu') {
				return this.chainModify(2);
			}
		},
		onModifySpA(spa, pokemon) {
			if (pokemon.baseSpecies.baseSpecies === 'Pikachu' || this.dex.species.get(pokemon.m.fusion).baseSpecies === 'Pikachu') {
				return this.chainModify(2);
			}
		},
	},
	luckypunch: {
		inherit: true,
		isNonstandard: null,
		onModifyCritRatio(critRatio, user) {
			if (user.baseSpecies.name === 'Chansey' || user.m.fusion === 'Chansey') {
				return critRatio + 2;
			}
		},
	},
	metalpowder: {
		inherit: true,
		isNonstandard: null,
		onModifyDef(def, pokemon) {
			if ((pokemon.species.name === 'Ditto' || pokemon.m.fusion === 'Ditto') && !pokemon.transformed) {
				return this.chainModify(2);
			}
		},
	},
	quickpowder: {
		inherit: true,
		isNonstandard: null,
		onModifySpe(spe, pokemon) {
			if ((pokemon.species.name === 'Ditto' || pokemon.m.fusion === 'Ditto') && !pokemon.transformed) {
				return this.chainModify(2);
			}
		},
	},
	thickclub: {
		inherit: true,
		isNonstandard: null,
		onModifyAtk(atk, pokemon) {
			if (
				pokemon.baseSpecies.baseSpecies === 'Cubone' ||
				pokemon.baseSpecies.baseSpecies === 'Marowak' ||
				this.dex.species.get(pokemon.m.fusion).baseSpecies === 'Cubone' ||
				this.dex.species.get(pokemon.m.fusion).baseSpecies === 'Marowak'
			) {
				return this.chainModify(2);
			}
		},
	},
};
