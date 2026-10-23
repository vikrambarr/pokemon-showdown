export const Abilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {
	disguise: {
		inherit: true,
		onDamage(damage, target, source, effect) {
			if (effect?.effectType === 'Move' &&
				['mimikyu', 'mimikyutotem', 'mimikyuorion', 'mimikyutemporal'].includes(target.species.id)) {
				this.add('-activate', target, 'ability: Disguise');
				this.effectState.busted = true;
				return 0;
			}
		},
		onCriticalHit(target, source, move) {
			if (!target) return;
			if (!['mimikyu', 'mimikyutotem', 'mimikyuorion', 'mimikyutemporal'].includes(target.species.id)) {
				return;
			}
			const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
			if (hitSub) return;

			if (!target.runImmunity(move)) return;
			return false;
		},
		onEffectiveness(typeMod, target, type, move) {
			if (!target || move.category === 'Status') return;
			if (!['mimikyu', 'mimikyutotem', 'mimikyuorion', 'mimikyutemporal'].includes(target.species.id)) {
				return;
			}

			const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
			if (hitSub) return;

			if (!target.runImmunity(move)) return;
			return 0;
		},
		onUpdate(pokemon) {
			if (['mimikyu', 'mimikyutotem', 'mimikyuorion', 'mimikyutemporal'].includes(pokemon.species.id) &&
				this.effectState.busted) {
				let speciesid = 'Mimikyu-Busted';
				if (pokemon.species.id === 'mimikyutotem') speciesid = 'Mimikyu-Busted-Totem';
				if (pokemon.species.id === 'mimikyuorion') speciesid = 'Mimikyu-Orion-Busted';
				if (pokemon.species.id === 'mimikyutemporal') speciesid = 'Mimikyu-Temporal-Busted';
				pokemon.formeChange(speciesid, this.effect, true);
				this.damage(pokemon.baseMaxhp / 8, pokemon, pokemon, this.dex.species.get(speciesid));
			}
		},
	},
	oblivious: {
		inherit: true,
		onTryBoost(boost, target, source, effect) {
			if (effect.name === 'Intimidate' && boost.atk) {
				delete boost.atk;
				this.add('-fail', target, 'unboost', 'Attack', '[from] ability: Oblivious', `[of] ${target}`);
			}
			if (effect.name === 'Dishearten' && boost.spa) {
				delete boost.spa;
				this.add('-fail', target, 'unboost', 'Sp. Atk', '[from] ability: Oblivious', `[of] ${target}`);
			}
		},
	},
	owntempo: {
		inherit: true,
		onTryBoost(boost, target, source, effect) {
			if (effect.name === 'Intimidate' && boost.atk) {
				delete boost.atk;
				this.add('-fail', target, 'unboost', 'Attack', '[from] ability: Own Tempo', `[of] ${target}`);
			}
			if (effect.name === 'Dishearten' && boost.spa) {
				delete boost.spa;
				this.add('-fail', target, 'unboost', 'Sp. Atk', '[from] ability: Oblivious', `[of] ${target}`);
			}
		},
	},
	rattled: {
		inherit: true,
		onAfterBoost(boost, target, source, effect) {
			if ((effect?.name === 'Intimidate' && boost.atk) || (effect?.name === 'Dishearten' && boost.spa)) {
				this.boost({ spe: 1 });
			}
		},
	},
	scrappy: {
		inherit: true,
		onTryBoost(boost, target, source, effect) {
			if (effect.name === 'Intimidate' && boost.atk) {
				delete boost.atk;
				this.add('-fail', target, 'unboost', 'Attack', '[from] ability: Scrappy', `[of] ${target}`);
			}
			if (effect.name === 'Dishearten' && boost.spa) {
				delete boost.spa;
				this.add('-fail', target, 'unboost', 'Sp. Atk', '[from] ability: Oblivious', `[of] ${target}`);
			}
		},
	},
	innerfocus: {
		inherit: true,
		onTryBoost(boost, target, source, effect) {
			if (effect.name === 'Intimidate' && boost.atk) {
				delete boost.atk;
				this.add('-fail', target, 'unboost', 'Attack', '[from] ability: Inner Focus', `[of] ${target}`);
			}
			if (effect.name === 'Dishearten' && boost.spa) {
				delete boost.spa;
				this.add('-fail', target, 'unboost', 'Sp. Atk', '[from] ability: Oblivious', `[of] ${target}`);
			}
		},
	},
	windrider: {
		inherit: true,
		onStart(pokemon) {
			if (pokemon.side.sideConditions['tailwind']) {
				this.boost({ atk: 1, spa: 1 }, pokemon, pokemon);
			}
		},
		onTryHit(target, source, move) {
			if (target !== source && move.flags['wind']) {
				if (!this.boost({ atk: 1, spa: 1 }, target, target)) {
					this.add('-immune', target, '[from] ability: Wind Rider');
				}
				return null;
			}
		},
		onSideConditionStart(side, source, sideCondition) {
			const pokemon = this.effectState.target;
			if (sideCondition.id === 'tailwind') {
				this.boost({ atk: 1, spa: 1 }, pokemon, pokemon);
			}
		},
		shortDesc: "Atk and Sp. Atk raised by 1 if hit by a wind move or Tailwind begins. Wind move immunity.",
	},
	sandveil: {
		inherit: true,
		onImmunity(type, pokemon) {
			if (type === 'sandstorm') return false;
		},
		onModifyAccuracyPriority: undefined,
		onModifyAccuracy(accuracy) {},
		onModifySpDPriority: -1,
		onModifyDef(def) {
			if (this.field.isWeather('sandstorm')) {
				this.debug('Sand Veil - Def boost');
				return this.chainModify(1.5);
			}
		},
		desc: "If Sandstorm is active, Def is 1.5x. This Pokemon takes no damage from Sandstorm.",
		shortDesc: "If Sandstorm is active, Def is 1.5x. This Pokemon takes no damage from Sandstorm.",
	},
	snowcloak: {
		inherit: true,
		onImmunity(type, pokemon) {
			if (type === 'hail') return false;
		},
		onModifyAccuracyPriority: undefined,
		onModifyAccuracy(accuracy) {},
		onModifyDefPriority: -1,
		onModifySpD(spd) {
			if (this.field.isWeather(['hail', 'snowscape'])) {
				this.debug('Snow Cloak - SpD boost');
				return this.chainModify(1.5);
			}
		},
		desc: "If Hail or Snow is active, Sp. Def is 1.5x. This Pokemon takes no damage from Hail.",
		shortDesc: "If Hail or Snow is active, Sp. Def is 1.5x. This Pokemon takes no damage from Hail.",
	},
	immunity: {
		inherit: true,
		onTryHitPriority: 1,
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Poison') {
				this.add('-immune', target, '[from] ability: Immunity');
				return null;
			}
		},
		shortDesc: "Poison immunity. This Pokemon cannot be poisoned.",
	},
	runaway: {
		inherit: true,
		onTrapPokemonPriority: -10,
		onTrapPokemon(pokemon) {
			pokemon.trapped = false;
		},
		onMaybeTrapPokemonPriority: -10,
		onMaybeTrapPokemon(pokemon) {
			pokemon.maybeTrapped = false;
		},
		shortDesc: "Holder cannot be prevented from choosing to switch out by any effect.",
	},
	toxicboost: {
		inherit: true,
		onDamagePriority: 1,
		onDamage(damage, target, source, effect) {
			if (effect.id === 'psn' || effect.id === 'tox') {
				return damage / 2;
			}
		},
		shortDesc: "If this Pokemon is poisoned, its Physical moves have 1.5x power; half damage from poison.",
	},
	liquidvoice: {
		inherit: true,
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.flags.sound) return this.chainModify([4915, 4096]);
		},
		shortDesc: "This Pokemon's sound-based moves become Water type. Sound-based moves have 1.2x power.",
	},
	corrosion: {
		inherit: true,
		onModifyMovePriority: -5,
		onModifyMove(move) {
			if (move.type !== 'Poison') return;
			if (!move.ignoreImmunity) move.ignoreImmunity = {};
			if (move.ignoreImmunity !== true) {
				move.ignoreImmunity['Poison'] = true;
			}
			move.onEffectiveness = function (typeMod, t, type, m) {
				if (type === 'Poison') return 0;
			};
		},
		shortDesc: "User can poison a Pokemon regardless of typing. Poison moves are neutral on Poison and Steel.",
	},
	moxie: {
		inherit: true,
		onSourceAfterFaint(length, target, source, effect) {
			if (this.effectState.moxie) return;
			if (effect?.effectType === 'Move') {
				this.effectState.moxie = true;
				this.boost({ atk: 1 }, source);
			}
		},
		desc: "This Pokemon's Attack is raised by 1 stage if it attacks and knocks out another Pokemon. Once per switch-in.",
		shortDesc: "+1 Attack on KO. Once per switch-in.",
	},
	illuminate: {
		inherit: true,
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Light';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		onTryBoost(boost, target, source, effect) {},
		onModifyMove(move) {},
		desc: "This Pokemon's Normal-type moves become Light-type moves and have their power multiplied by 1.2. This effect comes after other effects that change a move's type, but before Ion Deluge and Electrify's effects.",
		shortDesc: "This Pokemon's Normal-type moves become Light type and have 1.2x power.",
	},
	cloudnine: {
		inherit: true,
		onStart(pokemon) {
			pokemon.abilityState.ending = false;
			this.eachEvent('WeatherChange', this.effect);
			this.eachEvent('TerrainChange', this.effect);
		},
		onEnd(pokemon) {
			pokemon.abilityState.ending = true;
			this.eachEvent('WeatherChange', this.effect);
			this.eachEvent('TerrainChange', this.effect);
		},
		shortDesc: "While this Pokemon is active, the effects of weather and terrains are disabled.",
	},
	waterveil: {
		inherit: true,
		onUpdate(pokemon) {
			if (pokemon.status === 'brn') {
				this.add('-activate', pokemon, 'ability: Water Veil');
				pokemon.cureStatus();
			}
		},
		onAllySetStatus(status, target, source, effect) {
			if (status.id !== 'brn') return;
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Water Veil');
			}
			return false;
		},
		shortDesc: "This Pokemon nor its alliess can be burned. Gaining this Ability while burned cures it.",
	},
	protean: {
		inherit: true,
		onPrepareHit(source, target, move) {
			if (move.hasBounced || move.flags['futuremove'] || move.sourceEffect === 'snatch' || move.callsMove) return;
			const type = move.type;
			if (type && type !== '???' && source.getTypes().join() !== type) {
				if (!source.setType(type)) return;
				this.add('-start', source, 'typechange', type, '[from] ability: Protean');
			}
		},
		desc: "This Pokemon's type changes to match the type of the move it is about to use. This effect comes after all effects that change a move's type.",
		shortDesc: "This Pokemon's type changes to match the type of the move it is about to use.",
	},
	honeygather: {
		inherit: true,
		onResidual(target, source, effect) {
			this.heal(target.baseMaxhp / 16);
		},
		shortDesc: "Heals 1/16 HP every turn. 1/8 in sun.",
	},
	serenegrace: {
		inherit: true,
		onModifyMovePriority: -2,
		onModifyMove(move) {
			if (move.secondaries) {
				this.debug('doubling secondary chance');
				for (const secondary of move.secondaries) {
					if (secondary.chance) secondary.chance *= 2;
				}
			}
			if (move.self?.chance) move.self.chance *= 2;
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.secondaries) {
				for (const secondary of move.secondaries) {
					if (secondary.chance) this.chainModify(1 - secondary.chance / 200);
				}
			}
			if (move.self?.chance) this.chainModify(1 - move.self.chance / 200);
		},
		desc: "This Pokemon's moves have their secondary effect chance doubled. This effect stacks with the Rainbow effect, except for secondary effects that cause the target to flinch. The Power of moves is reduced by the original effect chance %.",
		shortDesc: "Doubled effect chance, but BP reduced by original effect chance.",
	},
	moody: {
		inherit: true,
		onResidual(pokemon) {
			const stats: BoostID[] = [];
			const boost: SparseBoostsTable = {};
			let statPlus: BoostID;
			for (statPlus in pokemon.boosts) {
				if (statPlus === 'accuracy' || statPlus === 'evasion') continue;
				if (pokemon.boosts[statPlus] < 6) {
					stats.push(statPlus);
				}
			}
			const randomStat: BoostID | undefined = stats.length ? this.sample(stats) : undefined;
			if (pokemon.abilityState.statPlus) boost[pokemon.abilityState.statPlus as BoostID] = -2;
			if (randomStat) { boost[randomStat] = 2; pokemon.abilityState.statPlus = randomStat; }

			this.boost(boost, pokemon, pokemon);
		},
		desc: "This Pokemon has a random stat, other than accuracy or evasiveness, raised by 2 stages at the end of each turn. The stat raised the previous turn will be lowered by 2 stages the next turn.",
		shortDesc: "Boosts a random stat (except accuracy/evasion) +2 every turn. Drops boosted stat next turn.",
	},
	emergencyexit: {
		inherit: true,
		onEmergencyExit(originalHp, target) {
			if (!target.hp || target.hp > target.maxhp / 2 || originalHp <= target.maxhp / 2) return;
			if (!this.canSwitch(target.side) || target.forceSwitchFlag || target.switchFlag) return;
			for (const side of this.sides) {
				for (const active of side.active) {
					active.switchFlag = false;
				}
			}
			target.abilityState.exit = true;
		},
		onResidualOrder: 1,
		onResidualSubOrder: 1,
		onResidual(pokemon) {
			if (pokemon.abilityState.exit) {
				pokemon.switchFlag = true;
				this.add('-activate', pokemon, 'ability: Emergency Exit');
			}
		},
		desc: "When this Pokemon has more than 1/2 its maximum HP and takes damage bringing it to 1/2 or less of its maximum HP, it switches out to a chosen ally at the end of the turn. This effect applies after all hits from a multi-hit move. This effect is prevented if the move had a secondary effect removed by the Sheer Force Ability. This effect applies to both direct and indirect damage, except Curse and Substitute on use, Belly Drum, Pain Split, and confusion damage.",
		shortDesc: "This Pokemon switches out at the end of the turn when it reaches 1/2 or less of its maximum HP.",
	},
	wimpout: {
		inherit: true,
		onEmergencyExit(originalHp, target) {
			if (!target.hp || target.hp > target.maxhp / 2 || originalHp <= target.maxhp / 2) return;
			if (!this.canSwitch(target.side) || target.forceSwitchFlag || target.switchFlag) return;
			for (const side of this.sides) {
				for (const active of side.active) {
					active.switchFlag = false;
				}
			}
			target.abilityState.exit = true;
		},
		onResidualOrder: 1,
		onResidualSubOrder: 1,
		onResidual(pokemon) {
			if (pokemon.abilityState.exit) {
				pokemon.switchFlag = true;
				this.add('-activate', pokemon, 'ability: Wimp Out');
			}
		},
		desc: "When this Pokemon has more than 1/2 its maximum HP and takes damage bringing it to 1/2 or less of its maximum HP, it switches out to a chosen ally at the end of the turn. This effect applies after all hits from a multi-hit move. This effect is prevented if the move had a secondary effect removed by the Sheer Force Ability. This effect applies to both direct and indirect damage, except Curse and Substitute on use, Belly Drum, Pain Split, and confusion damage.",
		shortDesc: "This Pokemon switches out at the end of the turn when it reaches 1/2 or less of its maximum HP.",
	},
	rivalry: {
		inherit: true,
		onBasePower(basePower, attacker, defender, move) {
			if (defender.hasType(attacker.getTypes())) {
				return this.chainModify(1.25);
			}
		},
		desc: "1.25x against targets that share a type with user.",
		shortDesc: "1.25x against targets that share a type with user.",
	},
	merciless: {
		inherit: true,
		onModifyCritRatio(critRatio, source, target) {
			if (target?.status) return 5;
		},
		shortDesc: "This Pokemon's attacks are critical hits if the target has a status condition.",
	},
	justified: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (move.type === 'Dark') {
				this.boost({ atk: 1, spa: 1 });
			}
		},
		shortDesc: "This Pokemon's Atk and SpA are raised by 1 stage after it is damaged by a Dark-type move.",
	},
	overcoat: {
		inherit: true,
		onModifySpD(spd, pokemon) {
			if (this.field.isWeather(['sandstorm', 'hail', 'snow'])) {
				return this.chainModify(1.1);
			}
		},
		onModifyDef(def, pokemon) {
			if (this.field.isWeather(['sandstorm', 'hail', 'snow'])) {
				return this.chainModify(1.1);
			}
		},
		desc: "This Pokemon is immune to powder moves, damage from Sandstorm, and the effects of Rage Powder and the Effect Spore Ability. 1.1x Defense and Special Defense during Sandstorm, Hail, or Snow.",
		shortDesc: "This Pokemon is immune to powder moves, Sandstorm, and Effect Spore. 1.1x Def and SpDef in sand or hail",
	},
	battlearmor: {
		inherit: true,
		onModifySpDPriority: 6,
		onModifySpD(spd, target, source, move) {
			return this.chainModify(1.2);
		},
		shortDesc: "1.2x SpDef. This Pokemon cannot be struck by a critical hit.",
	},
	shellarmor: {
		inherit: true,
		onModifyDefPriority: 6,
		onModifyDef(def, target, source, move) {
			return this.chainModify(1.2);
		},
		shortDesc: "1.2x Def. This Pokemon cannot be struck by a critical hit.",
	},
	damp: {
		inherit: true,
		onStart(source) {
			this.add('-activate', source, 'ability: Damp');
			if (!this.field.pseudoWeather.watersport) {
				this.field.addPseudoWeather('watersport');
			}
		},
		desc: "While this Pokemon is active, Explosion, Mind Blown, Misty Explosion, Self-Destruct, and the Aftermath Ability are prevented from having an effect. Summons Water Sport on activation.",
		shortDesc: "Prevents Explosion-like moves and Aftermath while active. Summons Water Sport on activation.",
	},
	thermalexchange: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (['Fire', 'Ice'].includes(move.type)) {
				this.boost({ atk: 1, spa: 1 });
			}
		},
		onUpdate(pokemon) {
			if (['brn', 'frb'].includes(pokemon.status)) {
				this.add('-activate', pokemon, 'ability: Thermal Exchange');
				pokemon.cureStatus();
			}
		},
		onSetStatus(status, target, source, effect) {
			if (!['brn', 'frb'].includes(status.id)) return;
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Thermal Exchange');
			}
			return false;
		},
		desc: "This Pokemon's Attack and Special Attack are raised 1 stage after it is damaged by a Fire-type or Ice-type move. This Pokemon cannot be burned or frostbitten. Gaining this Ability while burned or frostbitten cures it.",
		shortDesc: "Atk and SpA raised by 1 when damaged by Fire/Ice moves; can't be burned or frostbitten.",
	},
	grasspelt: {
		inherit: true,
		onModifySpDPriority: 6,
		onModifySpD(pokemon) {
			if (this.field.isTerrain('grassyterrain')) return this.chainModify(1.5);
		},
		shortDesc: "If Grassy Terrain is active, this Pokemon's Def and SpDef are multiplied by 1.5.",
	},
	steadfast: {
		inherit: true,
		onFlinch(pokemon) {
		},
		onBasePowerPriority: 21,
		onBasePower(basePower, pokemon) {
			let boosted = true;
			for (const target of this.getAllActive()) {
				if (target === pokemon) continue;
				if (target.newlySwitched || this.queue.willMove(target)) {
					boosted = true;
					break;
				}
			}
			if (boosted) {
				this.debug('Steadfast boost');
				return this.chainModify(1.3);
			}
		},
		shortDesc: "1.3x power if user moves before target.",
	},
	flareboost: {
		inherit: true,
		onDamage(damage, target, source, effect) {
			if (effect?.id === 'brn') {
				return damage / 2;
			}
		},
		desc: "While this Pokemon is burned, the power of its special attacks is multiplied by 1.5. Takes half damage from burn.",
		shortDesc: "While this Pokemon is burned, its special attacks have 1.5x power. Half damage from burn.",
	},
	flamebody: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (move.category === 'Physical') {
				if (this.randomChance(3, 10)) {
					source.trySetStatus('brn', target);
				}
			}
		},
		shortDesc: "30% to burn pokemon using physical moves against it.",
	},
	sandforce: {
		inherit: true,
		onBasePower(basePower, attacker, defender, move) {
			if (this.field.isWeather('sandstorm')) {
				this.debug('Sand Force boost');
				return this.chainModify([5325, 4096]);
			}
		},
		desc: "If Sandstorm is active, this Pokemon's attacks have their power multiplied by 1.3. This Pokemon takes no damage from Sandstorm.",
		shortDesc: "This Pokemon's attacks do 1.3x in Sandstorm; immunity to it.",
	},
	cutecharm: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (target.hasType(source.getTypes())) {
				this.debug('Cute Charm neutralize');
				return this.chainModify(0.75);
			}
		},
		onDamagingHit(damage, target, source, move) {},
		desc: "Takes 0.75x from targets that share a type with user.",
		shortDesc: "Takes 0.75x from targets that share a type with user.",
	},
	ironbarbs: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (move.category === 'Physical') {
				this.damage(source.baseMaxhp / 8, source, target);
			}
		},
		desc: "Pokemon using Physical moves against this Pokemon lose 1/8 of their maximum HP, rounded down.",
		shortDesc: "Pokemon using Physical moves against this Pokemon lose 1/8 of their max HP.",
	},
	roughskin: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (move.category === 'Physical') {
				this.damage(source.baseMaxhp / 8, source, target);
			}
		},
		desc: "Pokemon using Physical moves against this Pokemon lose 1/8 of their maximum HP, rounded down.",
		shortDesc: "Pokemon using Physical moves against this Pokemon lose 1/8 of their max HP.",
	},
	transistor: {
		inherit: true,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Electric') {
				this.debug('Transistor boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Electric') {
				this.debug('Transistor boost');
				return this.chainModify(1.5);
			}
		},
		shortDesc: "This Pokemon's offensive stat is multiplied by 1.5 while using an Electric-type attack.",
	},
	hadronengine: {
		inherit: true,
		onModifyAtkPriority: 5,
		onModifyAtk(atk, pokemon) {
			if (this.field.isTerrain('electricterrain')) {
				return this.chainModify(1.33);
			}
		},
		onModifySpA(spa, pokemon) {
			if (this.field.isTerrain('electricterrain')) {
				return this.chainModify(1.33);
			}
		},
		shortDesc: "Sets Electric Terrain on start. 1.33x Atk and SpA in Electric Terrain.",
	},
	bigpecks: {
		inherit: true,
		onTryBoost(boost, target, source, effect) {},
		onBasePowerPriority: 19,
		onBasePower(basePower, attacker, defender, move) {
			if (defender.hp <= defender.maxhp / 2) {
				return this.chainModify(1.3);
			}
		},
		shortDesc: "30% more damage to foes below half HP.",
	},
	affection: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Fairy') {
				this.debug('Affection boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Fairy') {
				this.debug('Affection boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Affection",
		rating: 3.5,
		num: 0,
		shortDesc: "This Pokemon's offensive stat is multiplied by 1.5 while using a Fairy-type attack.",
	},
	antigravity: {
		onModifyMovePriority: -5,
		onModifyMove(move) {
			if (!move.ignoreImmunity) move.ignoreImmunity = {};
			if (move.ignoreImmunity !== true) {
				move.ignoreImmunity['Sound'] = true;
				move.ignoreImmunity['Ground'] = true;
			}
		},
		flags: {},
		name: "Anti-Gravity",
		rating: 3,
		num: 0,
		shortDesc: "Sound, Ground moves hit Cosmic.",
	},
	arsonist: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Fire') {
				this.debug('Arsonist boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Fire') {
				this.debug('Arsonist boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Arsonist",
		rating: 3.5,
		num: 0,
		shortDesc: "This Pokemon's offensive stat is multiplied by 1.5 while using a Fire-type attack.",
	},
	astralmajesty: {
		onSourceModifyAtkPriority: 6,
		onSourceModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Light' || move.type === 'Dragon') {
				this.debug('Astral Majesty weaken');
				return this.chainModify(0.5);
			}
		},
		onSourceModifySpAPriority: 5,
		onSourceModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Light' || move.type === 'Dragon') {
				this.debug('Astral Majesty weaken');
				return this.chainModify(0.5);
			}
		},
		flags: { breakable: 1 },
		name: "Astral Majesty",
		rating: 3.5,
		num: 0,
		shortDesc: "Light-/Dragon-type moves against this Pokemon deal damage with a halved offensive stat.",
	},
	attunement: {
		onModifySpAPriority: 5,
		onModifySpA(spa, pokemon) {
			if (pokemon.status) {
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Attunement",
		rating: 3.5,
		num: 0,
		shortDesc: "If this Pokemon is statused, its Sp. Atk is 1.5x.",
	},
	blacklight: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Light' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Dark';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify(1.2);
		},
		flags: {},
		name: "Black Light",
		rating: 4,
		num: 0,
		shortDesc: "This Pokemon's Light-type moves become Dark-type and have 1.2x power.",
	},
	bonecollector: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Ground') {
				this.debug('Bone Collector boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Ground') {
				this.debug('Bone Collector boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Bone Collector",
		rating: 3.5,
		num: 0,
		shortDesc: "This Pokemon's offensive stat is multiplied by 1.5 while using a Ground-type attack.",
	},
	virtuoso: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Sound') {
				this.debug('Virtuoso boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Sound') {
				this.debug('Virtuoso boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Virtuoso",
		rating: 3.5,
		num: 0,
		shortDesc: "This Pokemon's offensive stat is multiplied by 1.5 while using a Sound-type attack.",
	},
	charisma: {
		onSourceAfterFaint(length, target, source, effect) {
			if (this.effectState.charisma) return;
			if (effect?.effectType === 'Move') {
				this.effectState.charisma = true;
				this.boost({ spa: 1 }, source);
			}
		},
		flags: {},
		name: "Charisma",
		rating: 3,
		num: 0,
		shortDesc: "+1 Sp. Atk on KO. Once per switch-in.",
	},
	clayform: {
		onWeather(target, source, effect) {
			if (target.effectiveWeather() !== effect.id) return;
			if (effect.id === 'sandstorm') {
				this.heal(target.baseMaxhp / 8);
			}
		},
		flags: {},
		name: "Clay Form",
		rating: 1.5,
		num: 0,
		shortDesc: "If Sandstorm is active, this Pokemon heals 1/8 of its max HP each turn.",
	},
	cometstorm: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Rock') {
				if (!this.boost({ spa: 1, spe: 1 })) {
					this.add('-immune', target, '[from] ability: Comet Storm');
				}
				return null;
			}
		},
		flags: { breakable: 1 },
		name: "Comet Storm",
		rating: 3,
		num: 0,
		shortDesc: "When hit by a Rock-type move, +1 Speed and Sp. Atk. Rock-type immunity.",
	},
	conductor: {
		onModifyMovePriority: -5,
		onModifyMove(move) {
			if (move.type === 'Electric') {
				if (!move.ignoreImmunity) move.ignoreImmunity = {};
				if (move.ignoreImmunity !== true) {
					move.ignoreImmunity['Electric'] = true;
				}
				move.onEffectiveness = function (typeMod, t, type, m) {
					if (type === 'Electric') return 0;
				};
			}
		},
		flags: { breakable: 1 },
		name: "Conductor",
		shortDesc: "Electric-type moves hit Ground. Electric-type attacks are neutral on Ground and Electric-types.",
		rating: 5,
		num: 0,
	},
	darkmatter: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Cosmic';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify(1.2);
		},
		flags: {},
		name: "Dark Matter",
		rating: 4,
		num: 0,
		shortDesc: "This Pokemon's Normal-type moves become Cosmic-type and have 1.2x power.",
	},
	destructivecore: {
		onSwitchInPriority: -1,
		onStart(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Togedemaru-Orion' || pokemon.transformed) return;
			if (pokemon.hp < pokemon.maxhp / 2) {
				if (pokemon.species.id !== 'togedemaruorionreactive') {
					pokemon.formeChange('Togedemaru-Orion-Reactive');
				}
			} else {
				if (pokemon.species.id === 'togedemaruorionreactive') {
					pokemon.formeChange('Togedemaru-Orion');
				}
			}
		},
		onResidualOrder: 29,
		onResidual(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Togedemaru-Orion' || pokemon.transformed || !pokemon.hp) return;
			if (pokemon.hp < pokemon.maxhp / 2) {
				if (pokemon.species.id !== 'togedemaruorionreactive') {
					pokemon.formeChange('Togedemaru-Orion-Reactive');
				}
			} else {
				if (pokemon.species.id === 'togedemaruorionreactive') {
					pokemon.formeChange('Togedemaru-Orion');
				}
			}
		},
		onSetStatus(status, target, source, effect) {
			if (target.species.id !== 'togedemaruorion' || target.transformed) return;
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Destructive Core');
			}
			return false;
		},
		onTryAddVolatile(status, target) {
			if (target.species.id !== 'togedemaruorion' || target.transformed) return;
			if (status.id !== 'yawn') return;
			this.add('-immune', target, '[from] ability: Destructive Core');
			return null;
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "Destructive Core",
		rating: 3,
		num: 0,
		shortDesc: "If Togedemaru-Orion, switch-in/end of turn it changes to Reactive at 1/2 max HP or less.",
	},
	disarray: {
		onStart(pokemon) {
			this.field.addPseudoWeather('trickroom');
		},
		flags: {},
		name: "Disarray",
		shortDesc: "This Pokemon summons Trick Room on switch-in.",
		rating: 4.5,
		num: 0,
	},
	dishearten: {
		onStart(pokemon) {
			let activated = false;
			for (const target of pokemon.adjacentFoes()) {
				if (!activated) {
					this.add('-ability', pokemon, 'Dishearten', 'boost');
					activated = true;
				}
				if (target.volatiles['substitute']) {
					this.add('-immune', target);
				} else {
					this.boost({ spa: -1 }, target, pokemon, null, true);
				}
			}
		},
		flags: {},
		name: "Dishearten",
		rating: 3.5,
		num: 0,
		shortDesc: "On switch-in, this Pokemon lowers the Sp. Atk of opponents by 1 stage.",
	},
	ethereal: {
		onTryHit(target, source, move) {
			if (!move.flags.contact) return;
			if (target.abilityState.etherealLost) return;
			if (move.smartTarget) {
				move.smartTarget = false;
			} else {
				this.add('-immune', target, '[from] ability: Ethereal');
			}
			target.abilityState.etherealLost = true;
			return null;
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, failskillswap: 1, breakable: 1 },
		name: "Ethereal",
		rating: 5,
		num: 0,
		shortDesc: "User is immune to one contact move per switch-in.",
	},
	fortification: {
		onDamage(damage, target, source, effect) {
			this.effectState.checkFortification = !(
				effect.effectType === "Move" && !effect.multihit &&
				!(effect.hasSheerForce && source.hasAbility('sheerforce'))
			);
		},
		onTryEatItem(item) {
			const healingItems = [
				'aguavberry', 'enigmaberry', 'figyberry', 'iapapaberry', 'magoberry', 'sitrusberry', 'wikiberry', 'oranberry', 'berryjuice',
			];
			if (healingItems.includes(item.id)) {
				return this.effectState.checkFortification;
			}
			return true;
		},
		onAfterMoveSecondary(target, source, move) {
			this.effectState.checkFortification = true;
			if (!source || source === target || !target.hp || !move.totalDamage) return;
			const lastAttackedBy = target.getLastAttackedBy();
			if (!lastAttackedBy) return;
			const damage = move.multihit && !move.smartTarget ? move.totalDamage : lastAttackedBy.damage;
			if (target.hp <= target.maxhp / 2 && target.hp + damage > target.maxhp / 2) {
				this.boost({ def: 1, spd: 1 }, target, target);
			}
		},
		flags: {},
		name: "Fortification",
		rating: 2,
		num: 0,
		shortDesc: "This Pokemon's Def and Sp.Def is raised by 1 when it reaches 1/2 or less of its max HP.",
	},
	genius: {
		onModifySpAPriority: 5,
		onModifySpA(spa) {
			return this.chainModify(2);
		},
		flags: {},
		name: "Genius",
		shortDesc: "Doubles the user's Special Attack stat.",
		rating: 5,
		num: 0,
	},
	haunted: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Ghost') {
				this.debug('Haunted boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Ghost') {
				this.debug('Haunted boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Haunted",
		rating: 3.5,
		num: 0,
		shortDesc: "This Pokemon's offensive stat is multiplied by 1.5 while using a Ghost-type attack.",
	},
	hivebody: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target, true)) {
				if (this.randomChance(3, 10)) {
					source.addVolatile('partiallytrapped', source, this.dex.getActiveMove('Infestation'));
				}
			}
		},
		flags: {},
		name: "Hive Body",
		rating: 2.5,
		num: 0,
		shortDesc: "30% to inflict Infestation when hit by a contact move.",
	},
	icyveins: {
		onBasePowerPriority: 21,
		onBasePower(basePower, attacker, defender, move) {
			if (this.field.isWeather(['hail', 'snowscape'])) {
				this.debug('Icy Veins boost');
				return this.chainModify(1.3);
			}
		},
		onImmunity(type, pokemon) {
			if (type === 'hail') return false;
		},
		flags: {},
		name: "Icy Veins",
		rating: 2,
		num: 0,
		shortDesc: "This Pokemon's attacks do 1.3x in Hail or Snow; Hail immunity.",
	},
	impenetrable: {
		onTryBoost(boost, target, source, effect) {
			if (source && target === source) return;
			if (boost.def && boost.def < 0) {
				delete boost.def;
				if (!(effect as ActiveMove).secondaries && effect.id !== 'octolock') {
					this.add("-fail", target, "unboost", "Defense", "[from] ability: Impenetrable", `[of] ${target}`);
				}
			}
			if (boost.spd && boost.spd < 0) {
				delete boost.spd;
				if (!(effect as ActiveMove).secondaries && effect.id !== 'octolock') {
					this.add("-fail", target, "unboost", "Sp. Def", "[from] ability: Impenetrable", `[of] ${target}`);
				}
			}
		},
		flags: { breakable: 1 },
		name: "Impenetrable",
		rating: 0.5,
		num: 0,
		shortDesc: "Prevents other Pokemon from lowering this Pokemon's Def and Sp. Def stat stage.",
	},
	intuition: {
		onTryBoost(boost, target, source, effect) {
			if (source && target === source) return;
			if (boost.spa && boost.spa < 0) {
				delete boost.spa;
				if (!(effect as ActiveMove).secondaries && effect.id !== 'octolock') {
					this.add("-fail", target, "unboost", "Sp. Atk", "[from] ability: Intuition", `[of] ${target}`);
				}
			}
		},
		flags: { breakable: 1 },
		name: "Intuition",
		rating: 0.5,
		num: 0,
		shortDesc: "Prevents other Pokemon from lowering this Pokemon's  Sp. Atk stat stage.",
	},
	irradiate: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Light' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Irradiate boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Light' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Irradiate boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Irradiate",
		rating: 2,
		num: 0,
		shortDesc: "At 1/3 or less of its max HP, this Pokemon's offensive stat is 1.5x with Light attacks.",
	},
	irredeemable: {
		onSourceModifyAtkPriority: 6,
		onSourceModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Light' || move.type === 'Fairy') {
				this.debug('Irredeemable weaken');
				return this.chainModify(0.5);
			}
		},
		onSourceModifySpAPriority: 5,
		onSourceModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Light' || move.type === 'Fairy') {
				this.debug('Irredeemable weaken');
				return this.chainModify(0.5);
			}
		},
		flags: { breakable: 1 },
		name: "Irredeemable",
		rating: 3.5,
		num: 0,
		shortDesc: "Light-/Fairy-type moves against this Pokemon deal damage with a halved offensive stat.",
	},
	leadership: {
		onModifyPriority(priority, pokemon) {
			if (pokemon.activeMoveActions === 0) return priority + 1;
		},
		flags: {},
		name: "Leadership",
		shortDesc: "+1 priority on first turn out.",
		rating: 4.5,
		num: 0,
	},
	leechingfangs: {
		onAfterMoveSecondarySelf(pokemon, target, move) {
			if (this.checkMoveMakesContact(move, pokemon, target, false) && move.flags.bite) {
				this.heal(pokemon.maxhp / 8, pokemon, pokemon);
			}
		},
		flags: {},
		name: "Leeching Fangs",
		shortDesc: "After making contact with a biting move, holder gains 1/8 of the max HP.",
		rating: 3.5,
		num: 0,
	},
	lightbulb: {
		onSourceModifyAtkPriority: 6,
		onSourceModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Dark') {
				this.debug('Light Bulb weaken');
				return this.chainModify(0.5);
			}
		},
		onSourceModifySpAPriority: 5,
		onSourceModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Dark') {
				this.debug('Light Bulb weaken');
				return this.chainModify(0.5);
			}
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Light') {
				this.debug('Light Bulb boost');
				return this.chainModify(2);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Light') {
				this.debug('Light Bulb boost');
				return this.chainModify(2);
			}
		},
		flags: { breakable: 1 },
		name: "Light Bulb",
		rating: 3.5,
		num: 0,
		shortDesc: "This Pokemon's Light power is 2x; Dark power against it is halved.",
	},
	maelstrom: {
		onFoeTrapPokemon(pokemon) {
			if (!pokemon.isAdjacent(this.effectState.target)) return;
			if (pokemon.isGrounded()) {
				pokemon.tryTrap(true);
			}
		},
		onFoeMaybeTrapPokemon(pokemon, source) {
			if (!source) source = this.effectState.target;
			if (!source || !pokemon.isAdjacent(source)) return;
			if (pokemon.isGrounded(!pokemon.knownType)) {
				pokemon.maybeTrapped = true;
			}
		},
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target, true)) {
				if (this.randomChance(3, 10)) {
					source.addVolatile('partiallytrapped', source, this.dex.getActiveMove('Whirlpool'));
				}
			}
		},
		flags: {},
		name: "Maelstrom",
		rating: 5,
		num: 0,
		shortDesc: "Prevents grounded foes from switching out. 30% to Whirlpool when hit by a contact move.",
	},
	maestro: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Sound' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Maestro boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Sound' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Maestro boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Maestro",
		rating: 2,
		num: 0,
		shortDesc: "At 1/3 or less of its max HP, this Pokemon's offensive stat is 1.5x with Sound attacks.",
	},
	nebulacloud: {
		onAllyTryBoost(boost, target, source, effect) {
			if ((source && target === source) || !target.hasType('Cosmic')) return;
			let showMsg = false;
			let i: BoostID;
			for (i in boost) {
				if (boost[i]! < 0) {
					delete boost[i];
					showMsg = true;
				}
			}
			if (showMsg && !(effect as ActiveMove).secondaries) {
				const effectHolder = this.effectState.target;
				this.add('-block', target, 'ability: Nebula Cloud', `[of] ${effectHolder}`);
			}
		},
		onAllySetStatus(status, target, source, effect) {
			if (target.hasType('Cosmic') && source && target !== source && effect?.id !== 'yawn') {
				this.debug('interrupting setStatus with Nebula Cloud');
				if (effect.name === 'Synchronize' || (effect.effectType === 'Move' && !effect.secondaries)) {
					const effectHolder = this.effectState.target;
					this.add('-block', target, 'ability: Nebula Cloud', `[of] ${effectHolder}`);
				}
				return null;
			}
		},
		onAllyTryAddVolatile(status, target) {
			if (target.hasType('Cosmic') && status.id === 'yawn') {
				this.debug('Nebula Cloud blocking yawn');
				const effectHolder = this.effectState.target;
				this.add('-block', target, 'ability: Nebula Cloud', `[of] ${effectHolder}`);
				return null;
			}
		},
		flags: { breakable: 1 },
		name: "Nebula Cloud",
		rating: 0,
		num: 0,
		shortDesc: "This side's Cosmic types can't have stats lowered or status inflicted by other Pokemon.",
	},
	opaqueness: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Light') {
				this.add('-immune', target, '[from] ability: Opaqueness');
				return null;
			}
		},
		flags: { breakable: 1 },
		name: "Opaqueness",
		rating: 3.5,
		num: 0,
		shortDesc: "Light immunity.",
	},
	hivemind: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Bug') {
				this.debug('Hivemind boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Bug') {
				this.debug('Hivemind boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Hive Mind",
		rating: 3.5,
		num: 0,
		shortDesc: "This Pokemon's offensive stat is multiplied by 1.5 while using a Bug-type attack.",
	},
	packedsnow: {
		onSourceModifyDamage(damage, source, target, move) {
			if (target.getMoveHitData(move).typeMod > 0 && this.field.isWeather(['hail', 'snowscape'])) {
				this.debug('Packed Snow neutralize');
				return this.chainModify(0.5);
			}
		},
		onImmunity(type, pokemon) {
			if (type === 'hail') return false;
		},
		flags: { breakable: 1 },
		name: "Packed Snow",
		rating: 3,
		num: 0,
		shortDesc: "This Pokemon receives 1/2 damage from supereffective attacks during snow or hail. Hail immunity.",
	},
	pounce: {
		onModifyPriority(priority, pokemon) {
			if (pokemon.activeMoveActions === 0) return priority + 1;
		},
		flags: {},
		name: "Pounce",
		shortDesc: "+1 priority on first turn out.",
		rating: 4.5,
		num: 0,
	},
	precision: {
		onSourceModifyAccuracyPriority: -1,
		onSourceModifyAccuracy(accuracy) {
			if (typeof accuracy !== 'number') return;
			this.debug('precision - enhancing accuracy');
			return this.chainModify(1.3);
		},
		flags: {},
		name: "Precision",
		rating: 3,
		num: 0,
		shortDesc: "This Pokemon's moves have their accuracy multiplied by 1.3.",
	},
	pureheart: {
		onResidual(target, source, effect) {
			this.heal(target.baseMaxhp / 16);
		},
		flags: {},
		name: "Pure Heart",
		shortDesc: "Heals 1/16 HP every turn.",
		rating: 1.5,
		num: 0,
	},
	realism: {
		onSourceModifyAtkPriority: 6,
		onSourceModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Ghost' || move.type === 'Fairy') {
				this.debug('Realism weaken');
				return this.chainModify(0.5);
			}
		},
		onSourceModifySpAPriority: 5,
		onSourceModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Ghost' || move.type === 'Fairy') {
				this.debug('Realism weaken');
				return this.chainModify(0.5);
			}
		},
		flags: { breakable: 1 },
		name: "Realism",
		rating: 3.5,
		num: 0,
		shortDesc: "Ghost-/Fairy-type moves against this Pokemon deal damage with a halved offensive stat.",
	},
	reaper: {
		onSourceAfterFaint(length, target, source, effect) {
			if (effect?.effectType === 'Move') {
				this.heal(source.maxhp / 5, source, source);
			}
		},
		flags: {},
		name: "Reaper",
		rating: 3,
		num: 0,
		shortDesc: "This Pokemon is healed by 1/5 max HP if it attacks and KOes another Pokemon.",
	},
	regrowth: {
		onResidual(target, source, effect) {
			let negBoosts = false;
			let i: BoostID;
			for (i in target.boosts) {
				if (target.boosts[i] < 0) {
					this.boost({ [i]: 1 }, this.effectState.target);
					negBoosts = true;
				}
			}
			if (!negBoosts) this.heal(target.baseMaxhp / 16);
		},
		flags: {},
		name: "Regrowth",
		shortDesc: "Raises negative stat boosts on self by 1 stage. Otherwise, heals 1/16 HP every turn.",
		rating: 1.5,
		num: 0,
	},
	requiem: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Dark') {
				this.debug('Requiem boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Dark') {
				this.debug('Requiem boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Requiem",
		rating: 3.5,
		num: 0,
		shortDesc: "This Pokemon's offensive stat is multiplied by 1.5 while using a Dark-type attack.",
	},
	scorchscale: {
		onHit(target, source, move) {
			if (move.priority > 0.1 && move.category !== 'Status') {
				source.trySetStatus('brn', target);
			}
		},
		flags: { breakable: 1 },
		name: "Scorch Scale",
		rating: 2.5,
		num: 0,
		shortDesc: "Burns any foe that uses priority attacks on it.",
	},
	sharpshooter: {
		onSourceAccuracy(accuracy, target, source, move) {
			if (!move.flags.contact) {
				return true;
			}
			return accuracy;
		},
		flags: {},
		name: "Sharp Shooter",
		rating: 4,
		num: 0,
		shortDesc: "Non-contact moves used by this Pokemon will always hit.",
	},
	spellcaster: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Psychic' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Spellcaster boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Psychic' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Spellcaster boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Spellcaster",
		rating: 2,
		num: 0,
		shortDesc: "At 1/3 or less of its max HP, this Pokemon's offensive stat is 1.5x with Psychic attacks.",
	},
	starstruck: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Cosmic' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Starstruck boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Cosmic' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Starstruck boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Starstruck",
		rating: 2,
		num: 0,
		shortDesc: "At 1/3 or less of its max HP, this Pokemon's offensive stat is 1.5x with Cosmic attacks.",
	},
	synthesize: {
		onResidual(target, source, effect) {
			if (['sunnyday', 'desolateland'].includes(target.effectiveWeather())) {
				this.heal(target.baseMaxhp / 8);
			}
		},
		flags: {},
		name: "Synthesize",
		shortDesc: "Heals 1/8 HP every turn in sun.",
		rating: 1.5,
		num: 0,
	},
	tvface: {
		onSwitchInPriority: -2,
		onStart(pokemon) {
			if (this.field.isTerrain('electricterrain') && pokemon.species.id === 'eiscueorionnotv') {
				this.add('-activate', pokemon, 'ability: TV Face');
				this.effectState.busted = false;
				pokemon.formeChange('Eiscue-Orion', this.effect, true);
			}
		},
		onDamagePriority: 1,
		onDamage(damage, target, source, effect) {
			if (effect?.effectType === 'Move' && effect.category === 'Physical' && target.species.id === 'eiscueorion') {
				this.add('-activate', target, 'ability: TV Face');
				this.effectState.busted = true;
				return 0;
			}
		},
		onCriticalHit(target, type, move) {
			if (!target) return;
			if (move.category !== 'Physical' || target.species.id !== 'eiscueorion') return;
			if (target.volatiles['substitute'] && !(move.flags['bypasssub'] || move.infiltrates)) return;
			if (!target.runImmunity(move)) return;
			return false;
		},
		onEffectiveness(typeMod, target, type, move) {
			if (!target) return;
			if (move.category !== 'Physical' || target.species.id !== 'eiscueorion') return;

			const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
			if (hitSub) return;

			if (!target.runImmunity(move)) return;
			return 0;
		},
		onUpdate(pokemon) {
			if (pokemon.species.id === 'eiscueorion' && this.effectState.busted) {
				pokemon.formeChange('Eiscue-Orion-NoTV', this.effect, true);
			}
		},
		onTerrainChange(pokemon, source, sourceEffect) {
			if ((sourceEffect as Ability)?.suppressWeather) return;
			if (!pokemon.hp) return;
			if (this.field.isTerrain('electricterrain') && pokemon.species.id === 'eiscueorionnotv') {
				this.add('-activate', pokemon, 'ability: TV Face');
				this.effectState.busted = false;
				pokemon.formeChange('Eiscue-Orion', this.effect, true);
			}
		},
		flags: {
			failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1,
			breakable: 1, notransform: 1,
		},
		name: "TV Face",
		rating: 3,
		num: 0,
		shortDesc: "If Eiscue-Orion, the first physical hit it takes deals 0 damage. Effect is restored in Electric Terrain.",
	},
	terminator: {
		onDamage(damage, target, source, effect) {
			this.effectState.checkedTerminator = !(
				effect.effectType === "Move" && !effect.multihit &&
				!(effect.hasSheerForce && source.hasAbility('sheerforce'))
			);
		},
		onTryEatItem(item) {
			const healingItems = [
				'aguavberry', 'enigmaberry', 'figyberry', 'iapapaberry', 'magoberry', 'sitrusberry', 'wikiberry', 'oranberry', 'berryjuice',
			];
			if (healingItems.includes(item.id)) {
				return this.effectState.checkedTerminator;
			}
			return true;
		},
		onAfterMoveSecondary(target, source, move) {
			this.effectState.checkedTerminator = true;
			if (!source || source === target || !target.hp || !move.totalDamage) return;
			const lastAttackedBy = target.getLastAttackedBy();
			if (!lastAttackedBy) return;
			const damage = move.multihit && !move.smartTarget ? move.totalDamage : lastAttackedBy.damage;
			if (target.hp <= target.maxhp / 2 && target.hp + damage > target.maxhp / 2) {
				this.boost({ atk: 1 }, target, target);
			}
		},
		flags: {},
		name: "Terminator",
		rating: 2,
		num: 0,
		shortDesc: "This Pokemon's Atk is raised by 1 when it reaches 1/2 or less of its max HP.",
	},
	terrorize: {
		onSourceModifyAtkPriority: 6,
		onSourceModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Bug') {
				this.debug('Terrorize weaken');
				return this.chainModify(0.5);
			}
		},
		onSourceModifySpAPriority: 5,
		onSourceModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Bug') {
				this.debug('Terrorize weaken');
				return this.chainModify(0.5);
			}
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Psychic') {
				this.debug('Terrorize boost');
				return this.chainModify(2);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Psychic') {
				this.debug('Terrorize boost');
				return this.chainModify(2);
			}
		},
		flags: { breakable: 1 },
		name: "Terrorize",
		rating: 3.5,
		num: 0,
		shortDesc: "This Pokemon's Psychic power is 2x; Bug power against it is halved.",
	},
	tormented: {
		onModifySpAPriority: 5,
		onModifySpA(spa) {
			return this.modify(spa, 1.5);
		},
		onSourceModifyAccuracyPriority: -1,
		onSourceModifyAccuracy(accuracy, target, source, move) {
			if (move.category === 'Special' && typeof accuracy === 'number') {
				return this.chainModify([3277, 4096]);
			}
		},
		flags: {},
		name: "Tormented",
		rating: 3.5,
		num: 0,
		shortDesc: "This Pokemon's Sp. Atk is 1.5x and accuracy of its special attacks is 0.8x.",
	},
	tropicalhide: {
		onSourceModifyAtkPriority: 6,
		onSourceModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Grass' || move.type === 'Water') {
				this.debug('Tropical Hide weaken');
				return this.chainModify(0.5);
			}
		},
		onSourceModifySpAPriority: 5,
		onSourceModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Grass' || move.type === 'Water') {
				this.debug('Tropical Hide weaken');
				return this.chainModify(0.5);
			}
		},
		flags: { breakable: 1 },
		name: "Tropical Hide",
		rating: 3.5,
		num: 0,
		shortDesc: "Grass-/Water-type moves against this Pokemon deal damage with a halved offensive stat.",
	},
	unbreakable: {
		onTryBoost(boost, target, source, effect) {
			if (source && target === source) return;
			if (boost.def && boost.def < 0) {
				delete boost.def;
				if (!(effect as ActiveMove).secondaries && effect.id !== 'octolock') {
					this.add("-fail", target, "unboost", "Defense", "[from] ability:Unbreakable", `[of] ${target}`);
				}
			}
		},
		flags: { breakable: 1 },
		name: "Unbreakable",
		rating: 0.5,
		num: 0,
		shortDesc: "Prevents other Pokemon from lowering this Pokemon's Defense stat stage.",
	},
	vengeful: {
		onDamage(damage, target, source, effect) {
			this.effectState.checkedTerminator = !(
				effect.effectType === "Move" && !effect.multihit &&
				!(effect.hasSheerForce && source.hasAbility('sheerforce'))
			);
		},
		onTryEatItem(item) {
			const healingItems = [
				'aguavberry', 'enigmaberry', 'figyberry', 'iapapaberry', 'magoberry', 'sitrusberry', 'wikiberry', 'oranberry', 'berryjuice',
			];
			if (healingItems.includes(item.id)) {
				return this.effectState.checkedTerminator;
			}
			return true;
		},
		onAfterMoveSecondary(target, source, move) {
			this.effectState.checkedTerminator = true;
			if (!source || source === target || !target.hp || !move.totalDamage) return;
			const lastAttackedBy = target.getLastAttackedBy();
			if (!lastAttackedBy) return;
			const damage = move.multihit && !move.smartTarget ? move.totalDamage : lastAttackedBy.damage;
			if (target.hp <= target.maxhp / 2 && target.hp + damage > target.maxhp / 2) {
				this.boost({ atk: 1, spe: 1 }, target, target);
			}
		},
		flags: {},
		name: "Vengeful",
		rating: 2,
		num: 0,
		shortDesc: "This Pokemon's Atk and Speed is raised by 1 when it reaches 1/2 or less of its max HP.",
	},
	vitality: {
		onDamagingHit(damage, target, source, effect) {
			this.boost({ spd: 1 });
		},
		flags: {},
		name: "Vitality",
		rating: 4,
		num: 0,
		shortDesc: "This Pokemon's Sp. Def is raised by 1 stage after it is damaged by a move.",
	},
	whiteout: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Dark' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Light';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify(1.2);
		},
		flags: {},
		name: "Whiteout",
		rating: 4,
		num: 0,
		shortDesc: "This Pokemon's Dark-type moves become Light-type and have 1.2x power.",
	},
	windfury: {
		onBasePowerPriority: 7,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['wind']) {
				this.debug('Wind Fury boost');
				return this.chainModify(1.3);
			}
		},
		onSourceModifyDamage(damage, source, target, move) {
			if (move.flags['wind']) {
				this.debug('Wind Fury weaken');
				return this.chainModify(0.5);
			}
		},
		flags: { breakable: 1 },
		name: "Wind Fury",
		rating: 3.5,
		num: 0,
		shortDesc: "This Pokemon receives 1/2 damage from wind moves. Its own have 1.3x power.",
	},
	wintergift: {
		onSwitchInPriority: -2,
		onStart(pokemon) {
			this.singleEvent('WeatherChange', this.effect, this.effectState, pokemon);
		},
		onWeatherChange(pokemon) {
			if (!pokemon.isActive || pokemon.baseSpecies.baseSpecies !== 'Cherrim-Orion' || pokemon.transformed) return;
			if (!pokemon.hp) return;
			if (['hail', 'snowscape'].includes(pokemon.effectiveWeather())) {
				if (pokemon.species.id !== 'cherrimorionhailing') {
					pokemon.formeChange('Cherrim-Orion-Hailing', this.effect, false, '0', '[msg]');
				}
			} else {
				if (pokemon.species.id === 'cherrimorionhailing') {
					pokemon.formeChange('Cherrim-Orion', this.effect, false, '0', '[msg]');
				}
			}
		},
		onAllyModifySpAPriority: 3,
		onAllyModifySpA(spa, pokemon) {
			if (this.effectState.target.baseSpecies.baseSpecies !== 'Cherrim-Orion') return;
			if (['hail', 'snowscape'].includes(pokemon.effectiveWeather())) {
				return this.chainModify(1.5);
			}
		},
		onAllyModifySpDPriority: 4,
		onAllyModifySpD(spd, pokemon) {
			if (this.effectState.target.baseSpecies.baseSpecies !== 'Cherrim-Orion') return;
			if (['hail', 'snowscape'].includes(pokemon.effectiveWeather())) {
				return this.chainModify(1.5);
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, breakable: 1 },
		name: "Winter Gift",
		rating: 1,
		num: 0,
		shortDesc: "If user is Cherrim-Orion and Hail or Snow is active, it and allies' Sp. Atk and Sp. Def are 1.5x.",
	},
	cartographer: {
		onSwitchInPriority: -2,
		onStart(pokemon) {
			this.singleEvent('TerrainChange', this.effect, this.effectState, pokemon);
		},
		onTerrainChange(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Castform-Orion' || pokemon.transformed) return;
			let forme = null;
			switch (this.field.terrain) {
			case 'grassyterrain':
				if (pokemon.species.id !== 'castformoriongrassy') forme = 'Castform-Orion-Grassy';
				break;
			case 'psychicterrain':
				if (pokemon.species.id !== 'castformorionpsychic') forme = 'Castform-Orion-Psychic';
				break;
			case 'mistyterrain':
				if (pokemon.species.id !== 'castformorionmisty') forme = 'Castform-Orion-Misty';
				break;
			case 'electricterrain':
				if (pokemon.species.id !== 'castformorionelectric') forme = 'Castform-Orion-Electric';
				break;
			default:
				if (pokemon.species.id !== 'castformorion') forme = 'Castform-Orion';
				break;
			}
			if (pokemon.isActive && forme) {
				pokemon.formeChange(forme, this.effect, false, '0', '[msg]');
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1 },
		name: "Cartographer",
		rating: 2,
		num: 0,
		shortDesc: "Castform-Orion's type and stats change respective to the current terrain's type.",
	},
	deepchill: {
		onDamagingHit(damage, target, source, move) {
			if (move.category === 'Special') {
				if (this.randomChance(3, 10)) {
					source.trySetStatus('frz', target);
				}
			}
		},
		flags: {},
		name: "Deep Chill",
		rating: 2,
		num: 0,
		shortDesc: "30% to frostbite pokemon using Special moves against it.",
	},
	superconductive: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, pokemon) {
			if (pokemon.status === 'frb') {
				return this.chainModify(1.5);
			}
		},
		onDamage(damage, target, source, effect) {
			if (effect?.id === 'frb') {
				return damage / 2;
			}
		},
		flags: {},
		name: "Superconductive",
		rating: 3.5,
		num: 0,
		shortDesc: "If this Pokemon is frostbit, its Atk. is 1.5x; half damage from frostbite.",
	},
	forestking: {
		onStart(source) {
			if (!this.field.isTerrain('grassyterrain')) this.field.setTerrain('grassyterrain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, pokemon) {
			if (this.field.isTerrain('grassyterrain')) {
				return this.chainModify(1.33);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, pokemon) {
			if (this.field.isTerrain('grassyterrain')) {
				return this.chainModify(1.33);
			}
		},
		flags: {},
		name: "Forest King",
		rating: 4,
		num: 0,
		shortDesc: "Sets Grassy Terrain on start. 1.33x Atk and SpA in Grassy Terrain.",
	},
	orbit: {
		onStart(source) {
			if (!this.field.pseudoWeather.gravity) {
				this.add('-activate', source, 'ability: Orbit');
				this.field.addPseudoWeather('gravity');
			}
		},
		flags: {},
		name: "Orbit",
		rating: 4.5,
		num: 0,
		shortDesc: "On Switch-in, this Pokemon summons Gravity.",
	},
	flexible: {
		onBasePower(basePower, source, target, move) {
			if (!source.hasType(move.type)) {
				this.debug('Flexible boosts');
				return this.chainModify(1.3);
			}
		},
		flags: {},
		name: "Flexible",
		rating: 4.5,
		num: 0,
		shortDesc: "1.3x Power on non-STAB moves.",
	},
	rebellious: {
		onAfterEachBoost(boost, target, source, effect) {
			if (!source || target.isAlly(source)) {
				return;
			}
			if (source.abilityState.rebellious) return;
			let statsLowered = false;
			let i: BoostID;
			for (i in boost) {
				if (boost[i]! < 0) {
					statsLowered = true;
				}
			}
			if (statsLowered) {
				source.abilityState.rebellious = true;
			}
		},
		onBasePower(basePower, source, target, move) {
			if (source.abilityState.rebellious) {
				this.debug('Rebellious boosts');
				return this.chainModify(1.3);
			}
		},
		onSwitchOut(pokemon) {
			if (pokemon.abilityState.rebellious) pokemon.abilityState.rebellious = false;
		},
		flags: {},
		name: "Rebellious",
		rating: 3,
		num: 0,
		shortDesc: "If stats lowered by a foe, 1.3x damage until switch-out.",
	},
	gorging: {
		onBasePowerPriority: 19,
		onBasePower(basePower, attacker, defender, move) {
			if (move.drain) {
				return this.chainModify(1.3);
			}
		},
		flags: {},
		name: "Gorging",
		rating: 3.5,
		num: 0,
		shortDesc: "This Pokemon's draining attacks have 1.3x power.",
	},
	impulsive: {
		onBasePowerPriority: 19,
		onBasePower(basePower, attacker, defender, move) {
			return this.chainModify(1.4);
		},
		onAfterMove(source, target, move) {
			if (move.category === 'Physical') this.boost({ atk: -1 }, source, source);
			if (move.category === 'Special') this.boost({ spa: -1 }, source, source);
		},
		flags: {},
		name: "Impulsive",
		rating: 3.5,
		num: 0,
		shortDesc: "1.4x power to attacks. -1 Atk/SpA after using a Physical/Special move.",
	},
	vandal: {
		onBasePowerPriority: 19,
		onBasePower(basePower, attacker, defender, move) {
			if (defender.getItem().id) {
				return this.chainModify(1.3);
			}
		},
		flags: {},
		name: "Vandal",
		rating: 3.5,
		num: 0,
		shortDesc: "1.3x power against foes holding an item.",
	},
	feedback: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (move.category === 'Special') {
				this.damage(source.baseMaxhp / 8, source, target);
			}
		},
		flags: {},
		name: "Feedback",
		rating: 4,
		num: 0,
		shortDesc: "Pokemon using a Special move against this Pokemon lose 1/8 of their max HP.",
	},
	retribution: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (move.category === 'Special') {
				this.damage(source.baseMaxhp / 8, source, target);
			}
		},
		flags: {},
		name: "Retribution",
		rating: 4,
		num: 0,
		shortDesc: "Pokemon using a Special move against this Pokemon lose 1/8 of their max HP.",
	},
	forcefield: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (move.category === 'Special') {
				this.damage(source.baseMaxhp / 8, source, target);
			}
		},
		flags: {},
		name: "Forcefield",
		rating: 4,
		num: 0,
		shortDesc: "Pokemon using a Special move against this Pokemon lose 1/8 of their max HP.",
	},
	funeralpyre: {
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (['Fire', 'Ghost'].includes(move.type)) return this.chainModify(2);
		},
		flags: {},
		name: "Funeral Pyre",
		rating: 5,
		num: 0,
		shortDesc: "Fire and Ghost moves have 2x power.",
	},
};
