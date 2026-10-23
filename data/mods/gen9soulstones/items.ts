export const Items: import('../../../sim/dex-items').ModdedItemDataTable = {
	babiriberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Steel' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Steel-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Steel-type attack. Single use.",
	},
	chartiberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Rock' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Rock-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Rock-type attack. Single use.",
	},
	chilanberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (
				move.type === 'Normal' &&
				(!target.volatiles['substitute'] || move.flags['bypasssub'] || (move.infiltrates && this.gen >= 6))
			) {
				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from a Normal-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from a Normal-type attack. Single use.",
	},
	chopleberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Fighting' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Fighting-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Fighting-type attack. Single use.",
	},
	cobaberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Flying' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Flying-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Flying-type attack. Single use.",
	},
	colburberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Dark' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Dark-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Dark-type attack. Single use.",
	},
	habanberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Dragon' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Dragon-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Dragon-type attack. Single use.",
	},
	kasibberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Ghost' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Ghost-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Ghost-type attack. Single use.",
	},
	kebiaberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Poison' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Poison-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Poison-type attack. Single use.",
	},
	occaberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Fire' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Fire-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Fire-type attack. Single use.",
	},
	passhoberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Water' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Water-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Water-type attack. Single use.",
	},
	payapaberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Psychic' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Psychic-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Psychic-type attack. Single use.",
	},
	rindoberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Grass' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Grass-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Grass-type attack. Single use.",
	},
	roseliberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Fairy' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Fairy-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Fairy-type attack. Single use.",
	},
	shucaberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Ground' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Ground-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Ground-type attack. Single use.",
	},
	tangaberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Bug' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Bug-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Bug-type attack. Single use.",
	},
	wacanberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Electric' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Electric-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Electric-type attack. Single use.",
	},
	yacheberry: {
		inherit: true,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Ice' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.add('-enditem', target, this.effect, '[weaken]');
					if (target.ability === 'ripen') {
						this.debug('95% reduction');
						return this.chainModify(0.05);
					}
					this.debug('-75% reduction');
					return this.chainModify(0.25);
				}
			}
		},
		desc: "1/4 damage taken from supereffective Ice-type attack. Single use. If user has the Ripen ability, damage reduced by 95%.",
		shortDesc: "1/4 damage taken from supereffective Ice-type attack. Single use.",
	},
	adrenalineorb: {
		inherit: true,
		onAfterBoost(boost, target, source, effect) {
			if (target.boosts['spe'] === 6 || boost.atk === 0) {
				return;
			}
			if (effect.name === 'Intimidate' || effect.name === 'Dishearten') {
				target.useItem();
			}
		},
		num: 0,
		shortDesc: "Raises holder's Speed by 1 stage if it gets affected by Intimidate or Dishearten. Single use.",
		gen: 9,
	},
	rockyhelmet: {
		inherit: true,
		onDamagingHit(damage, target, source, move) {
			if (move.category === 'Physical') {
				this.damage(source.baseMaxhp / 8, source, target);
			}
		},
		shortDesc: "If holder is hit by a Physical move, the attacker loses 1/8 of its max HP.",
		gen: 9,
	},
	assaultarmor: {
		name: "Assault Armor",
		spritenum: -6,
		fling: {
			basePower: 80,
		},
		onModifyDefPriority: 1,
		onModifyDef(def) {
			return this.chainModify(1.5);
		},
		onDisableMove(pokemon) {
			for (const moveSlot of pokemon.moveSlots) {
				const move = this.dex.moves.get(moveSlot.id);
				if (move.category === 'Status' && move.id !== 'mefirst') {
					pokemon.disableMove(moveSlot.id);
				}
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Holder's Def is 1.5x, but it can only select damaging moves.",
	},
	bodyarmor: {
		name: "Body Armor",
		spritenum: -6,
		onModifyMovePriority: 1,
		onModifyMove(move) {
			if (move.recoil) move.recoil = undefined;
		},
		num: 0,
		desc: "Holder does not take recoil damage.",
	},
	arcanespellbook: {
		name: "Arcane Spellbook",
		spritenum: -6,
		fling: {
			basePower: 90,
		},
		onModifySpAPriority: 1,
		onModifySpA(atk, pokemon) {
			if (pokemon.baseSpecies.baseSpecies === 'Omanyte-Orion' || pokemon.baseSpecies.baseSpecies === 'Omastar-Orion') {
				return this.chainModify(2);
			}
		},
		itemUser: ["Omanyte-Orion", "Omastar-Orion"],
		num: 0,
		gen: 9,
		shortDesc: "If held by a Omanyte-Orion or Omastar-Orion, its Sp. Atk is doubled.",
	},
	focusingorb: {
		name: "Focusing Orb",
		spritenum: -6,
		fling: {
			basePower: 30,
		},
		onModifyDefPriority: 1,
		onModifyDef(def, pokemon) {
			if (pokemon.baseSpecies.baseSpecies === 'Clamperl-Orion') {
				return this.chainModify(2);
			}
		},
		onModifySpDPriority: 1,
		onModifySpD(def, pokemon) {
			if (pokemon.baseSpecies.baseSpecies === 'Clamperl-Orion') {
				return this.chainModify(2);
			}
		},
		itemUser: ["Clamperl-Orion"],
		num: 0,
		gen: 9,
		shortDesc: "If held by a Clamperl-Orion, its Def and Sp. Def is doubled.",
	},
	voidheart: {
		name: "Void Heart",
		spritenum: -6,
		fling: {
			basePower: 30,
		},
		onModifyAtkPriority: 1,
		onModifyAtk(atk, pokemon) {
			if (pokemon.baseSpecies.baseSpecies === 'Volbeat-Orion') {
				return this.chainModify(1.5);
			}
		},
		onModifyDefPriority: 1,
		onModifyDef(def, pokemon) {
			if (pokemon.baseSpecies.baseSpecies === 'Volbeat-Orion') {
				return this.chainModify(1.5);
			}
		},
		itemUser: ["Volbeat-Orion"],
		num: 0,
		gen: 9,
		shortDesc: "If held by a Volbeat-Orion, its Atk and Def are 1.5x.",
	},
	radiantorb: {
		name: "Radiant Orb",
		spritenum: -6,
		fling: {
			basePower: 30,
		},
		onModifySpAPriority: 1,
		onModifySpA(spa, pokemon) {
			if (pokemon.baseSpecies.baseSpecies === 'Illumise-Orion') {
				return this.chainModify(1.5);
			}
		},
		onModifySpDPriority: 1,
		onModifySpD(def, pokemon) {
			if (pokemon.baseSpecies.baseSpecies === 'Illumise-Orion') {
				return this.chainModify(1.5);
			}
		},
		itemUser: ["Illumise-Orion"],
		num: 0,
		gen: 9,
		shortDesc: "If held by a Illumise-Orion, its Sp. Atk and Sp. Def are 1.5x.",
	},
	headphones: {
		name: "Headphones",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onStart(target) {
			if (!target.ignoringItem()) {
				this.add('-item', target, 'Headphones');
			}
		},
		onDamagingHit(damage, target, source, move) {
			this.add('-enditem', target, 'Headphones');
			target.item = '';
			this.clearEffectState(target.itemState);
			this.runEvent('AfterUseItem', target, null, null, this.dex.items.get('headphones'));
		},
		onAfterSubDamage(damage, target, source, effect) {
			this.debug('effect: ' + effect.id);
			if (effect.effectType === 'Move') {
				this.add('-enditem', target, 'Headphones');
				target.item = '';
				this.clearEffectState(target.itemState);
				this.runEvent('AfterUseItem', target, null, null, this.dex.items.get('headphones'));
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Holder is immune to Sound-type attacks. Pops when holder is hit.",
	},
	stellarplate: {
		name: "Stellar Plate",
		spritenum: -6,
		onPlate: 'Cosmic',
		onBasePowerPriority: 15,
		onBasePower(basePower, user, target, move) {
			if (move?.type === 'Cosmic') {
				return this.chainModify([4915, 4096]);
			}
		},
		onTakeItem(item, pokemon, source) {
			if ((source?.baseSpecies.num === 493) || pokemon.baseSpecies.num === 493) {
				return false;
			}
			return true;
		},
		forcedForme: "Arceus-Cosmic",
		num: 0,
		gen: 9,
		shortDesc: "Holder's Cosmic-type attacks have 1.2x power. Judgment is Cosmic type.",
	},
	rhythmplate: {
		name: "Rhythm Plate",
		spritenum: -6,
		onPlate: 'Sound',
		onBasePowerPriority: 15,
		onBasePower(basePower, user, target, move) {
			if (move?.type === 'Sound') {
				return this.chainModify([4915, 4096]);
			}
		},
		onTakeItem(item, pokemon, source) {
			if ((source?.baseSpecies.num === 493) || pokemon.baseSpecies.num === 493) {
				return false;
			}
			return true;
		},
		forcedForme: "Arceus-Sound",
		num: 0,
		gen: 9,
		shortDesc: "Holder's Sound-type attacks have 1.2x power. Judgment is Sound type.",
	},
	holyplate: {
		name: "Holy Plate",
		spritenum: -6,
		onPlate: 'Light',
		onBasePowerPriority: 15,
		onBasePower(basePower, user, target, move) {
			if (move?.type === 'Light') {
				return this.chainModify([4915, 4096]);
			}
		},
		onTakeItem(item, pokemon, source) {
			if ((source?.baseSpecies.num === 493) || pokemon.baseSpecies.num === 493) {
				return false;
			}
			return true;
		},
		forcedForme: "Arceus-Light",
		num: 0,
		gen: 9,
		shortDesc: "Holder's Light-type attacks have 1.2x power. Judgment is Light type.",
	},
	dandelight: {
		name: "Dandelight",
		spritenum: -6,
		fling: {
			basePower: 30,
		},
		onModifyDefPriority: 1,
		onModifyDef(def, pokemon) {
			if (pokemon.baseSpecies.baseSpecies === 'Delcatty-Temporal') {
				return this.chainModify(1.25);
			}
		},
		onModifySpDPriority: 1,
		onModifySpD(def, pokemon) {
			if (pokemon.baseSpecies.baseSpecies === 'Delcatty-Temporal') {
				return this.chainModify(1.25);
			}
		},
		onTryHealPriority: 1,
		onTryHeal(damage, target, source, effect) {
			const heals = ['drain', 'leechseed', 'ingrain', 'aquaring', 'strengthsap'];
			if (heals.includes(effect.id)) {
				return this.chainModify(1.15);
			}
		},
		itemUser: ["Delcatty-Temporal"],
		num: 0,
		gen: 9,
		shortDesc: "If held by a Delcatty-Temporal, 1.25x Def. and Sp.Def, 15% increased healing from draining.",
	},
	wisevest: {
		name: "Wise Vest",
		spritenum: -6,
		fling: {
			basePower: 80,
		},
		onModifySpDPriority: 1,
		onModifySpD(spd) {
			return this.chainModify(1.1);
		},
		num: 0,
		gen: 9,
		shortDesc: "Holder's Sp. Def is 1.1x.",
	},
	musclearmor: {
		name: "Muscle Armor",
		spritenum: -6,
		fling: {
			basePower: 80,
		},
		onModifyDefPriority: 1,
		onModifyDef(def) {
			return this.chainModify(1.1);
		},
		num: 0,
		gen: 9,
		shortDesc: "Holder's Def is 1.1x.",
	},
	normalshield: {
		name: "Normal Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Normal' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Normal-type attack.",
	},
	fireshield: {
		name: "Fire Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Fire' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Fire-type attack.",
	},
	watershield: {
		name: "Water Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Water' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Water-type attack.",
	},
	grassshield: {
		name: "Grass Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Grass' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Grass-type attack.",
	},
	electricshield: {
		name: "Electric Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Electric' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Electric-type attack.",
	},
	iceshield: {
		name: "Ice Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Ice' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Ice-type attack.",
	},
	poisonshield: {
		name: "Poison Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Poison' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Poison-type attack.",
	},
	fightingshield: {
		name: "Fighting Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Fighting' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Fighting-type attack.",
	},
	groundshield: {
		name: "Ground Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Ground' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Ground-type attack.",
	},
	flyingshield: {
		name: "Flying Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Flying' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Flying-type attack.",
	},
	psychicshield: {
		name: "Psychic Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Psychic' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Psychic-type attack.",
	},
	bugshield: {
		name: "Bug Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Bug' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Bug-type attack.",
	},
	rockshield: {
		name: "Rock Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Rock' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Rock-type attack.",
	},
	ghostshield: {
		name: "Ghost Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Ghost' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Ghost-type attack.",
	},
	dragonshield: {
		name: "Dragon Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Dragon' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Dragon-type attack.",
	},
	steelshield: {
		name: "Steel Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Steel' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Steel-type attack.",
	},
	darkshield: {
		name: "Dark Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Dark' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Dark-type attack.",
	},
	fairyshield: {
		name: "Fairy Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Fairy' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Fairy-type attack.",
	},
	cosmicshield: {
		name: "Cosmic Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Cosmic' && target.getMoveHitData(move).typeMod > 0) {
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Cosmic-type attack.",
	},
	lightshield: {
		name: "Light Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Light' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Light-type attack.",
	},
	soundshield: {
		name: "Sound Shield",
		spritenum: -6,
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Sound' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;
				this.debug('-50% reduction');
				return this.chainModify(0.5);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Sound-type attack.",
	},
	hivisjacket: {
		name: "Hi-Vis Jacket",
		spritenum: -6,
		fling: {
			basePower: 60,
		},
		onDamagingHitOrder: 2,
		onDamagingHit(damage, target, source, move) {
			if (move.category === 'Special') {
				this.damage(source.baseMaxhp / 8, source, target);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "If holder is hit by a Special move, the attacker loses 1/8 of its max HP.",
	},
	normalsword: {
		name: "Normal Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Normal' && type === 'Dragon') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Normal-type moves hit Dragon for supereffective.",
	},
	firesword: {
		name: "Fire Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Fire' && type === 'Dark') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Fire-type moves hit Dark for supereffective.",
	},
	watersword: {
		name: "Water Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Water' && type === 'Cosmic') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Water-type moves hit Cosmic for supereffective.",
	},
	grasssword: {
		name: "Grass Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Grass' && type === 'Fairy') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Grass-type moves hit Fairy for supereffective.",
	},
	electricsword: {
		name: "Electric Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Electric' && type === 'Psychic') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Electric-type moves hit Psychic for supereffective.",
	},
	icesword: {
		name: "Ice Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Ice' && type === 'Bug') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Ice-type moves hit Bug for supereffective.",
	},
	poisonsword: {
		name: "Poison Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Poison' && type === 'Fighting') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Poison-type moves hit Fighting for supereffective.",
	},
	fightingsword: {
		name: "Fighting Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Fighting' && type === 'Fire') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Fighting-type moves hit Fire for supereffective.",
	},
	groundsword: {
		name: "Ground Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Ground' && type === 'Sound') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Ground-type moves hit Sound for supereffective.",
	},
	flyingsword: {
		name: "Flying Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Flying' && type === 'Ghost') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Flying-type moves hit Ghost for supereffective.",
	},
	psychicsword: {
		name: "Psychic Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Psychic' && type === 'Normal') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Psychic-type moves hit Normal for supereffective.",
	},
	bugsword: {
		name: "Bug Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Bug' && type === 'Electric') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Bug-type moves hit Electric for supereffective.",
	},
	rocksword: {
		name: "Rock Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Rock' && type === 'Light') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Rock-type moves hit Light for supereffective.",
	},
	ghostsword: {
		name: "Ghost Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Ghost' && type === 'Steel') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Ghost-type moves hit Steel for supereffective.",
	},
	dragonsword: {
		name: "Dragon Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Dragon' && type === 'Flying') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Dragon-type moves hit Flying for supereffective.",
	},
	steelsword: {
		name: "Steel Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Steel' && type === 'Poison') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Steel-type moves hit Poison for supereffective.",
	},
	darksword: {
		name: "Dark Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Dark' && type === 'Grass') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Dark-type moves hit Grass for supereffective.",
	},
	fairysword: {
		name: "Fairy Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Fairy' && type === 'Water') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Fairy-type moves hit Water for supereffective.",
	},
	cosmicsword: {
		name: "Cosmic Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Cosmic' && type === 'Ground') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Cosmic-type moves hit Ground for supereffective.",
	},
	lightsword: {
		name: "Light Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Light' && type === 'Ice') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Light-type moves hit Ice for supereffective.",
	},
	soundsword: {
		name: "Sound Sword",
		spritenum: -6,
		fling: {
			basePower: 130,
		},
		onFoeEffectiveness(typeMod, target, type, move) {
			if (move.type === 'Sound' && type === 'Rock') return 1;
		},
		num: 0,
		gen: 9,
		shortDesc: "User's Sound-type moves hit Rock for supereffective.",
	},
	liquidoozerune: {
		name: "Liquid Ooze Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('liquidooze', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Liquid Ooze.",
	},
	aftermathrune: {
		name: "Aftermath Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('aftermath', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Aftermath.",
	},
	sandveilrune: {
		name: "Sand Veil Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('sandveil', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Sand Veil.",
	},
	snowcloakrune: {
		name: "Snow Cloak Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('snowcloak', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Snow Cloak.",
	},
	vitalspiritrune: {
		name: "Vital Spirit Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('vitalspirit', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Vital Spirit.",
	},
	synchronizerune: {
		name: "Synchronize Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('synchronize', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Synchronize.",
	},
	unnerverune: {
		name: "Unnerve Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('unnerve', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Unnerve.",
	},
	poisonpointrune: {
		name: "Poison Point Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('poisonpoint', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Poison Point.",
	},
	naturalcurerune: {
		name: "Natural Cure Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('naturalcure', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Natural Cure.",
	},
	icebodyrune: {
		name: "Ice Body Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('icebody', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Ice Body.",
	},
	clayformrune: {
		name: "Clay Form Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('clayform', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Clay Form.",
	},
	synthesizerune: {
		name: "Synthesize Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('synthesize', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Synthesize.",
	},
	raindishrune: {
		name: "Rain Dish Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('raindish', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Rain Dish.",
	},
	battlearmorrune: {
		name: "Battle Armor Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('battlearmor', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Battle Armor.",
	},
	healerrune: {
		name: "Healer Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('healer', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Healer.",
	},
	flamebodyrune: {
		name: "Flame Body Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('flamebody', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Flame Body.",
	},
	moldbreakerrune: {
		name: "Mold Breaker Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('moldbreaker', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Mold Breaker.",
	},
	shielddustrune: {
		name: "Shield Dust Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('shielddust', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Shield Dust.",
	},
	infiltratorrune: {
		name: "Infiltrator Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('infiltrator', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Infiltrator.",
	},
	analyticrune: {
		name: "Analytic Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('analytic', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Analytic.",
	},
	staticrune: {
		name: "Static Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('static', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Static.",
	},
	compoundeyesrune: {
		name: "Compound Eyes Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('compoundeyes', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Compound Eyes.",
	},
	toughclawsrune: {
		name: "Tough Claws Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('toughclaws', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Tough Claws.",
	},
	rivalryrune: {
		name: "Rivalry Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('rivalry', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Rivalry.",
	},
	sniperrune: {
		name: "Sniper Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('sniper', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Sniper.",
	},
	impenetrablerune: {
		name: "Impenetrable Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('impenetrable', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Impenetrable.",
	},
	telepathyrune: {
		name: "Telepathy Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('telepathy', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Telepathy.",
	},
	gooeyrune: {
		name: "Gooey Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('gooey', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Gooey.",
	},
	innerfocusrune: {
		name: "Inner Focus Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('innerfocus', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Inner Focus.",
	},
	prismarmorrune: {
		name: "Prism Armor Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('prismarmor', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Prism Armor.",
	},
	arenatraprune: {
		name: "Arena Trap Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('arenatrap', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Arena Trap.",
	},
	clearbodyrune: {
		name: "Clear Body Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('clearbody', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Clear Body.",
	},
	pastelveilrune: {
		name: "Pastel Veil Rune",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onSwitchInPriority: 101,
		onSwitchIn(pokemon) {
			if (!pokemon.ignoringItem()) {
				pokemon.setAbility('pastelveil', pokemon);
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		shortDesc: "Changes user's ability to Pastel Veil.",
	},
	topographymap: {
		name: "Topography Map",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onStart(target) {
			for (const moveSlot of target.moveSlots) {
				const moveid = moveSlot.id;
				const move = this.dex.moves.get(moveid);
				if (move.terrain) {
					this.actions.useMove(move, this.effectState.target);
					break;
				}
			}
		},
		onTakeItem(item, source) {
			if (!this.activeMove) return false;
			if (['knockoff', 'thief', 'covet', 'turbulence', 'spoil', 'powerwash', 'quakeslam', 'disturb', 'mindmeld']
				.includes(this.activeMove.id)) return false;
		},
		num: 0,
		gen: 9,
		itemUser: ["Castform-Orion"],
		shortDesc: "Castform-Orion only: On start uses the first terrain move it knows.",
	},
	oliberry: {
		name: "Oli Berry",
		spritenum: -6,
		isBerry: true,
		naturalGift: {
			basePower: 80,
			type: "Cosmic",
		},
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Cosmic' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.debug('-50% reduction');
					this.add('-enditem', target, this.effect, '[weaken]');
					return this.chainModify(0.5);
				}
			}
		},
		onEat() { },
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Cosmic-type attack. Single use.",
	},
	patotoberry: {
		name: "Patoto Berry",
		spritenum: -6,
		isBerry: true,
		naturalGift: {
			basePower: 80,
			type: "Sound",
		},
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Sound' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.debug('-50% reduction');
					this.add('-enditem', target, this.effect, '[weaken]');
					return this.chainModify(0.5);
				}
			}
		},
		onEat() { },
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Sound-type attack. Single use.",
	},
	avocaberry: {
		name: "Avoca Berry",
		spritenum: -6,
		isBerry: true,
		naturalGift: {
			basePower: 80,
			type: "Light",
		},
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Light' && target.getMoveHitData(move).typeMod > 0) {
				const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
				if (hitSub) return;

				if (target.eatItem()) {
					this.debug('-50% reduction');
					this.add('-enditem', target, this.effect, '[weaken]');
					return this.chainModify(0.5);
				}
			}
		},
		onEat() { },
		num: 0,
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Light-type attack. Single use.",
	},
};
