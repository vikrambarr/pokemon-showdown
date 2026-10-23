export const Items: import('../../../sim/dex-items').ModdedItemDataTable = {
	luckypunch: {
		inherit: true,
		onModifyCritRatio(critRatio, user) {
			if (user.baseSpecies.name.includes('Chansey') || user.m.fusion?.includes('Chansey')) {
				return critRatio + 2;
			}
		},
		itemUser: ["Chansey", "Chansey-Egho"],
	},
	longclub: {
		name: "Long Club",
		spritenum: -4,
		fling: {
			basePower: 150,
		},
		onModifyCritRatio(critRatio, user) {
			if (user.baseSpecies.baseSpecies === 'Terathwack' || user.m.fusion === 'Terathwack') {
				return critRatio + 2;
			}
		},
		itemUser: ["Terathwack"],
		num: 0,
		gen: 6,
		shortDesc: "If held by a Terathwack, its critical hit ratio is raised by 2 stages.",
	},
	typelessplate: {
		name: "Typeless Plate",
		spritenum: 282,
		onPlate: '???',
		onBasePowerPriority: 15,
		onBasePower(basePower, user, target, move) {
			if (move.type === '???') {
				return this.chainModify([4915, 4096]);
			}
		},
		onTakeItem(item, pokemon, source) {
			if ((source?.baseSpecies.num === 493) || pokemon.baseSpecies.num === 493) {
				return false;
			}
			return true;
		},
		forcedForme: "Arceus-Typeless",
		shortDesc: "Holder's ???-type attacks have 1.2x power. Judgment is ??? type.",
		num: 301,
		gen: 4,
	},
};
