export const Items: import('../../../sim/dex-items').ModdedItemDataTable = {
	stick: {
		inherit: true,
		onModifyCritRatio(critRatio, user) {
			if (['barand', 'barandnuclear'].includes(this.toID(user.baseSpecies.baseSpecies))) {
				return critRatio + 2;
			}
		},
		itemUser: ["Barand", "Barand-Nuclear"],
		shortDesc: "If held by a Barand, its critical hit ratio is raised by 2 stages.",
	},
	prettyribbon: {
		name: "Pretty Ribbon",
		shortDesc: "Holder's Fairy-type attacks have 1.2x power.",
		spritenum: -2,
		fling: {
			basePower: 10,
		},
		onBasePowerPriority: 15,
		onBasePower(basePower, user, target, move) {
			if (move?.type === 'Fairy') {
				return this.chainModify([4915, 4096]);
			}
		},
		num: 0,
	},
};
