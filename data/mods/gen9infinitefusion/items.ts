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
};
