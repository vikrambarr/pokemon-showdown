export const Abilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {
	runaway: {
		inherit: true,
		onImmunity(type) {
			if (type === 'trapped') return false;
		},
	},
	angerpoint: {
		inherit: true,
		onHit(target, source, move) {
			if (!target.hp) return;
			if (move?.effectType === 'Move' && target.getMoveHitData(move).crit) {
				if (target.species.id === 'wiggler') target.formeChange('Wiggler-Angry');
				if (target.m.fusion === 'Wiggler') target.fusionChange('Wiggler-Angry');
				this.boost({ atk: 12 }, target, target);
			}
		},
	},
	defeatist: {
		inherit: true,
		onUpdate(pokemon) {
			if (pokemon.hp <= pokemon.maxhp / 2) {
				if (pokemon.species.id === 'rex') pokemon.formeChange('Rex-Squished', this.effect, true);
				if (pokemon.m.fusion === 'Rex') pokemon.fusionChange('Rex-Squished', this.effect);
			} else {
				if (pokemon.species.id === 'rexsquished') pokemon.formeChange('Rex', this.effect, true);
				if (pokemon.m.fusion === 'Rex-Squished') pokemon.fusionChange('Rex', this.effect);
			}
		},
	},
	transmutate: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && !noModifyType.includes(move.id) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Psychic';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		flags: {},
		name: "Transmutate",
		desc: "This Pokemon's Normal-type moves become Psychic-type moves and have their power multiplied by 1.2. This effect comes after other effects that change a move's type.",
		shortDesc: "This Pokemon's Normal-type moves become Psychic type and have 1.2x power.",
		rating: 4,
		num: 0,
	},
	chaosemeralds: {
		suppressesAbilities(pokemon) {
			return (pokemon.species.id === 'supersonic' || pokemon.m.fusion === 'Super Sonic') &&
				!pokemon.volatiles['gastroacid'] && !pokemon.transformed && !pokemon.abilityState.ending;
		},
		onDamagePriority: -40,
		onDamage(damage, target, source, effect) {
			if (
				(target.species.id === 'sonic' || target.m.fusion === 'Sonic') && !target.transformed &&
				damage >= target.hp && effect?.effectType === 'Move'
			) {
				return target.hp - 1;
			}
		},
		onResidualOrder: 1,
		onResidual(pokemon) {
			if (
				!(pokemon.baseSpecies.baseSpecies === 'Sonic' || pokemon.m.fusion?.includes('Sonic')) ||
				pokemon.transformed || !pokemon.hp
			) return;
			if (pokemon.species.id === 'supersonic' || pokemon.m.fusion === 'Super Sonic' || pokemon.hp !== 1) return;
			this.add('-activate', pokemon, 'ability: Chaos Emeralds');
			if (pokemon.species.id === 'sonic') pokemon.formeChange('Super Sonic', this.effect, true);
			if (pokemon.m.fusion === 'Sonic') pokemon.fusionChange('Super Sonic', this.effect);
			this.heal(pokemon.baseMaxhp);
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "Chaos Emeralds",
		shortDesc: "When Sonic reaches 1 HP, fully heal and transform into Super Sonic.",
		rating: 5,
	},
};
