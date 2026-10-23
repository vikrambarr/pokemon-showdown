export const Abilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {
	aftermath: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target, true)) {
				this.damage(source.baseMaxhp / 4, source, target);
			}
		},
	},
};
