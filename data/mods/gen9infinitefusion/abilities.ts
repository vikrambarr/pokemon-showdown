export const Abilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {
	noguard: {
		inherit: true,
		onAnyInvulnerability(target, source, move) {
			if (move && !move.ohko && !source.hasItem('mankeyspaw') &&
				(source === this.effectState.target || target === this.effectState.target)) return 0;
		},
		onAnyAccuracy(accuracy, target, source, move) {
			if (move && !move.ohko && !source.hasItem('mankeyspaw') &&
				(source === this.effectState.target || target === this.effectState.target)) {
				return true;
			}
			return accuracy;
		},
	},
};
