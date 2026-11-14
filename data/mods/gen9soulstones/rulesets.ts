export const Rulesets: import('../../../sim/dex-formats').ModdedFormatDataTable = {
	frostbitemod: {
		effectType: 'Rule',
		name: 'Frostbite Mod',
		desc: "Freeze is replaced by frostbite.",
		onConvertStatus(status) {
			if (status.id === 'frz') return this.dex.conditions.get('frb');
		},
	},
	soulstonesmod: {
		effectType: 'Rule',
		name: 'Soulstones Mod',
		desc: "Cosmic-type Pok&eacute;mon keep their Ground immunity while grounded, and Cloud Nine also stops terrain.",
		onGroundedImmunity(relayVar, pokemon) {
			if (pokemon.hasType('Cosmic')) return false;
		},
		onTryTerrain() {
			for (const pokemon of this.getAllActive()) {
				if (pokemon.hasAbility('cloudnine') && !pokemon.abilityState.ending) return false;
			}
		},
	},
};
