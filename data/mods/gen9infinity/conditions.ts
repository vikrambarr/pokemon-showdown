export const Conditions: import('../../../sim/dex-conditions').ModdedConditionDataTable = {
	partiallytrapped: {
		inherit: true,
		durationCallback(target, source) {
			if (source?.lastMoveUsed?.id === 'greatbind') return source?.hasItem('gripclaw') ? 6 : 5;
			if (source?.hasItem('gripclaw')) return 8;
			return this.random(5, 7);
		},
	},
};
