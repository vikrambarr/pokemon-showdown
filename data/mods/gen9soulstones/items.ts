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
		desc: "Holder does not take recoil damage.",
	},
	cosmicgem: {
		name: "Cosmic Gem",
		spritenum: -6,
		isGem: true,
		onSourceTryPrimaryHit(target, source, move) {
			if (target === source || move.category === 'Status') return;
			if (move.type === 'Cosmic' && source.useItem()) {
				source.addVolatile('gem');
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Holder's first successful Cosmic-type attack will have 1.4x power. Single use.",
	},
	soundgem: {
		name: "Sound Gem",
		spritenum: -6,
		isGem: true,
		onSourceTryPrimaryHit(target, source, move) {
			if (target === source || move.category === 'Status') return;
			if (move.type === 'Sound' && source.useItem()) {
				source.addVolatile('gem');
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Holder's first successful Sound-type attack will have 1.4x power. Single use.",
	},
	lightgem: {
		name: "Light Gem",
		spritenum: -6,
		isGem: true,
		onSourceTryPrimaryHit(target, source, move) {
			if (target === source || move.category === 'Status') return;
			if (move.type === 'Light' && source.useItem()) {
				source.addVolatile('gem');
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Holder's first successful Light-type attack will have 1.4x power. Single use.",
	},
	sharpcoral: {
		name: "Sharp Coral",
		spritenum: -6,
		fling: {
			basePower: 90,
		},
		onModifyAtkPriority: 1,
		onModifyAtk(atk, pokemon) {
			if (pokemon.baseSpecies.baseSpecies === 'Cubone-Orion' || pokemon.baseSpecies.baseSpecies === 'Marowak-Orion') {
				return this.chainModify(2);
			}
		},
		itemUser: ["Cubone-Orion", "Marowak-Orion"],
		num: 0,
		gen: 9,
		shortDesc: "If held by a Cubone-Orion or Marowak-Orion, its Attack is doubled.",
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
		gen: 9,
		shortDesc: "Holder's Light-type attacks have 1.2x power. Judgment is Light type.",
	},
	cosmicdust: {
		name: "Cosmic Dust",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onBasePowerPriority: 15,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Cosmic') {
				return this.chainModify([4915, 4096]);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Holder's Cosmic-type attacks have 1.2x power.",
	},
	musicbox: {
		name: "Music Box",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onBasePowerPriority: 15,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Sound') {
				return this.chainModify([4915, 4096]);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Holder's Sound-type attacks have 1.2x power.",
	},
	clearmirror: {
		name: "Clear Mirror",
		spritenum: -6,
		fling: {
			basePower: 10,
		},
		onBasePowerPriority: 15,
		onBasePower(basePower, user, target, move) {
			if (move.type === 'Light') {
				return this.chainModify([4915, 4096]);
			}
		},
		num: 0,
		gen: 9,
		shortDesc: "Holder's Light-type attacks have 1.2x power.",
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
		gen: 9,
		shortDesc: "Holder's Def is 1.1x.",
	},
	gengarites: {
		name: "Gengarite-S",
		spritenum: -6,
		megaStone: { "Gengar-Orion": "Gengar-Orion-Mega" },
		itemUser: ["Gengar-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Gengar-Orion, this item allows it to Mega Evolve in battle.",
	},
	dodrinites: {
		name: "Dodrinite-S",
		spritenum: -6,
		megaStone: { "Dodrio-Orion": "Dodrio-Orion-Mega" },
		itemUser: ["Dodrio-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Dodrio-Orion, this item allows it to Mega Evolve in battle.",
	},
	arbokinites: {
		name: "Arbokinite-S",
		spritenum: -6,
		megaStone: { "Arbok-Orion": "Arbok-Orion-Mega" },
		itemUser: ["Arbok-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Arbok-Orion, this item allows it to Mega Evolve in battle.",
	},
	starmites: {
		name: "Starmite-S",
		spritenum: -6,
		megaStone: { "Starmie-Orion": "Starmie-Orion-Mega" },
		itemUser: ["Starmie-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Starmie-Orion, this item allows it to Mega Evolve in battle.",
	},
	steelixites: {
		name: "Steelixite-S",
		spritenum: -6,
		megaStone: { "Steelix-Orion": "Steelix-Orion-Mega" },
		itemUser: ["Steelix-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Steelix-Orion, this item allows it to Mega Evolve in battle.",
	},
	xatunites: {
		name: "Xatunite-S",
		spritenum: -6,
		megaStone: { "Xatu-Orion": "Xatu-Orion-Mega" },
		itemUser: ["Xatu-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Xatu-Orion, this item allows it to Mega Evolve in battle.",
	},
	seismitoadites: {
		name: "Seismitoadite-S",
		spritenum: -6,
		megaStone: { "Seismitoad-Orion": "Seismitoad-Orion-Mega" },
		itemUser: ["Seismitoad-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Seismitoad-Orion, this item allows it to Mega Evolve in battle.",
	},
	golites: {
		name: "Golite-S",
		spritenum: -6,
		megaStone: { "Golurk-Orion": "Golurk-Orion-Mega" },
		itemUser: ["Golurk-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Golurk-Orion, this item allows it to Mega Evolve in battle.",
	},
	gyaradosites: {
		name: "Gyaradosite-S",
		spritenum: -6,
		megaStone: { "Gyarados-Orion": "Gyarados-Orion-Mega" },
		itemUser: ["Gyarados-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Gyarados-Orion, this item allows it to Mega Evolve in battle.",
	},
	avaluggites: {
		name: "Avaluggite-S",
		spritenum: -6,
		megaStone: { "Avalugg-Orion": "Avalugg-Orion-Mega" },
		itemUser: ["Avalugg-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Avalugg-Orion, this item allows it to Mega Evolve in battle.",
	},
	rapidashinites: {
		name: "Rapidashinite-S",
		spritenum: -6,
		megaStone: { "Rapidash-Orion": "Rapidash-Orion-Mega" },
		itemUser: ["Rapidash-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Rapidash-Orion, this item allows it to Mega Evolve in battle.",
	},
	aerodactylites: {
		name: "Aerodactylite-S",
		spritenum: -6,
		megaStone: { "Aerodactyl-Orion": "Aerodactyl-Orion-Mega" },
		itemUser: ["Aerodactyl-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Aerodactyl-Orion, this item allows it to Mega Evolve in battle.",
	},
	giganites: {
		name: "Giganite-S",
		spritenum: -6,
		megaStone: { "Gigalith-Orion": "Gigalith-Orion-Mega" },
		itemUser: ["Gigalith-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Gigalith-Orion, this item allows it to Mega Evolve in battle.",
	},
	gliscites: {
		name: "Gliscite-S",
		spritenum: -6,
		megaStone: { "Gliscor-Orion": "Gliscor-Orion-Mega" },
		itemUser: ["Gliscor-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Gliscor-Orion, this item allows it to Mega Evolve in battle.",
	},
	sudowooditex: {
		name: "Sudowoodite-X",
		spritenum: -6,
		megaStone: { "Sudowoodo-Orion": "Sudowoodo-Orion-Mega-X" },
		itemUser: ["Sudowoodo-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Sudowoodo-Orion, this item allows it to Mega Evolve in battle.",
	},
	sudowooditey: {
		name: "Sudowoodite-Y",
		spritenum: -6,
		megaStone: { "Sudowoodo-Orion": "Sudowoodo-Orion-Mega-Y" },
		itemUser: ["Sudowoodo-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Sudowoodo-Orion, this item allows it to Mega Evolve in battle.",
	},
	noctowlites: {
		name: "Noctowlite-S",
		spritenum: -6,
		megaStone: { "Noctowl-Orion": "Noctowl-Orion-Mega" },
		itemUser: ["Noctowl-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Noctowl-Orion, this item allows it to Mega Evolve in battle.",
	},
	electronites: {
		name: "Electronite-S",
		spritenum: -6,
		megaStone: { "Electrode-Orion": "Electrode-Orion-Mega" },
		itemUser: ["Electrode-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Electrode-Orion, this item allows it to Mega Evolve in battle.",
	},
	beedrillites: {
		name: "Beedrillite-S",
		spritenum: -6,
		megaStone: { "Beedrill-Orion": "Beedrill-Orion-Mega" },
		itemUser: ["Beedrill-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Beedrill-Orion, this item allows it to Mega Evolve in battle.",
	},
	machampites: {
		name: "Machampite-S",
		spritenum: -6,
		megaStone: { "Machamp-Orion": "Machamp-Orion-Mega" },
		itemUser: ["Machamp-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Machamp-Orion, this item allows it to Mega Evolve in battle.",
	},
	venusaurites: {
		name: "Venusaurite-S",
		spritenum: -6,
		megaStone: { "Venusaur-Orion": "Venusaur-Orion-Mega" },
		itemUser: ["Venusaur-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Venusaur-Orion, this item allows it to Mega Evolve in battle.",
	},
	sharpedonites: {
		name: "Sharpedonite-S",
		spritenum: -6,
		megaStone: { "Sharpedo-Orion": "Sharpedo-Orion-Mega" },
		itemUser: ["Sharpedo-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Sharpedo-Orion, this item allows it to Mega Evolve in battle.",
	},
	chandelites: {
		name: "Chandelite-S",
		spritenum: -6,
		megaStone: { "Chandelure-Orion": "Chandelure-Orion-Mega" },
		itemUser: ["Chandelure-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Chandelure-Orion, this item allows it to Mega Evolve in battle.",
	},
	glalitites: {
		name: "Glalitite-S",
		spritenum: -6,
		megaStone: { "Glalie-Orion": "Glalie-Orion-Mega" },
		itemUser: ["Glalie-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Glalie-Orion, this item allows it to Mega Evolve in battle.",
	},
	froslassites: {
		name: "Froslassite-S",
		spritenum: -6,
		megaStone: { "Froslass-Orion": "Froslass-Orion-Mega" },
		itemUser: ["Froslass-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Froslass-Orion, this item allows it to Mega Evolve in battle.",
	},
	infernapinites: {
		name: "Infernapinite-S",
		spritenum: -6,
		megaStone: { "Infernape-Orion": "Infernape-Orion-Mega" },
		itemUser: ["Infernape-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Infernape-Orion, this item allows it to Mega Evolve in battle.",
	},
	sablenites: {
		name: "Sablenite-S",
		spritenum: -6,
		megaStone: { "Sableye-Orion": "Sableye-Orion-Mega" },
		itemUser: ["Sableye-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Sableye-Orion, this item allows it to Mega Evolve in battle.",
	},
	bearticites: {
		name: "Bearticite-S",
		spritenum: -6,
		megaStone: { "Beartic-Orion": "Beartic-Orion-Mega" },
		itemUser: ["Beartic-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Beartic-Orion, this item allows it to Mega Evolve in battle.",
	},
	sceptilites: {
		name: "Sceptilite-S",
		spritenum: -6,
		megaStone: { "Sceptile-Orion": "Sceptile-Orion-Mega" },
		itemUser: ["Sceptile-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Sceptile-Orion, this item allows it to Mega Evolve in battle.",
	},
	tyranitarites: {
		name: "Tyranitarite-S",
		spritenum: -6,
		megaStone: { "Tyranitar-Orion": "Tyranitar-Orion-Mega" },
		itemUser: ["Tyranitar-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Tyranitar-Orion, this item allows it to Mega Evolve in battle.",
	},
	hippowdonites: {
		name: "Hippowdonite-S",
		spritenum: -6,
		megaStone: { "Hippowdon-Orion": "Hippowdon-Orion-Mega" },
		itemUser: ["Hippowdon-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Hippowdon-Orion, this item allows it to Mega Evolve in battle.",
	},
	ampharosites: {
		name: "Ampharosite-S",
		spritenum: -6,
		megaStone: { "Ampharos-Orion": "Ampharos-Orion-Mega" },
		itemUser: ["Ampharos-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Ampharos-Orion, this item allows it to Mega Evolve in battle.",
	},
	altarianites: {
		name: "Altarianite-S",
		spritenum: -6,
		megaStone: { "Altaria-Orion": "Altaria-Orion-Mega" },
		itemUser: ["Altaria-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Altaria-Orion, this item allows it to Mega Evolve in battle.",
	},
	heracronites: {
		name: "Heracronite-S",
		spritenum: -6,
		megaStone: { "Heracross-Orion": "Heracross-Orion-Mega" },
		itemUser: ["Heracross-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Heracross-Orion, this item allows it to Mega Evolve in battle.",
	},
	sawsbuckites: {
		name: "Sawsbuckite-S",
		spritenum: -6,
		megaStone: { "Sawsbuck-Orion": "Sawsbuck-Orion-Mega" },
		itemUser: ["Sawsbuck-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Sawsbuck-Orion, this item allows it to Mega Evolve in battle.",
	},
	aggronites: {
		name: "Aggronite-S",
		spritenum: -6,
		megaStone: { "Aggron-Orion": "Aggron-Orion-Mega" },
		itemUser: ["Aggron-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Aggron-Orion, this item allows it to Mega Evolve in battle.",
	},
	slowkingites: {
		name: "Slowkingite-S",
		spritenum: -6,
		megaStone: { "Slowking-Orion": "Slowking-Orion-Mega" },
		itemUser: ["Slowking-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Slowking-Orion, this item allows it to Mega Evolve in battle.",
	},
	corvinites: {
		name: "Corvinite-S",
		spritenum: -6,
		megaStone: { "Corviknight-Orion": "Corviknight-Orion-Mega" },
		itemUser: ["Corviknight-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Corviknight-Orion, this item allows it to Mega Evolve in battle.",
	},
	kingdranites: {
		name: "Kingdranite-S",
		spritenum: -6,
		megaStone: { "Kingdra-Orion": "Kingdra-Orion-Mega" },
		itemUser: ["Kingdra-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Kingdra-Orion, this item allows it to Mega Evolve in battle.",
	},
	butterfrites: {
		name: "Butterfrite-S",
		spritenum: -6,
		megaStone: { "Butterfree-Orion": "Butterfree-Orion-Mega" },
		itemUser: ["Butterfree-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Butterfree-Orion, this item allows it to Mega Evolve in battle.",
	},
	furretites: {
		name: "Furretite-S",
		spritenum: -6,
		megaStone: { "Furret-Orion": "Furret-Orion-Mega" },
		itemUser: ["Furret-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Furret-Orion, this item allows it to Mega Evolve in battle.",
	},
	gardevoirites: {
		name: "Gardevoirite-S",
		spritenum: -6,
		megaStone: { "Gardevoir-Orion": "Gardevoir-Orion-Mega" },
		itemUser: ["Gardevoir-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Gardevoir-Orion, this item allows it to Mega Evolve in battle.",
	},
	galladites: {
		name: "Galladite-S",
		spritenum: -6,
		megaStone: { "Gallade-Orion": "Gallade-Orion-Mega" },
		itemUser: ["Gallade-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Gallade-Orion, this item allows it to Mega Evolve in battle.",
	},
	dugtrioites: {
		name: "Dugtrioite-S",
		spritenum: -6,
		megaStone: { "Dugtrio-Orion": "Dugtrio-Orion-Mega" },
		itemUser: ["Dugtrio-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Dugtrio-Orion, this item allows it to Mega Evolve in battle.",
	},
	azumarillites: {
		name: "Azumarillite-S",
		spritenum: -6,
		megaStone: { "Azumarill-Orion": "Azumarill-Orion-Mega" },
		itemUser: ["Azumarill-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Azumarill-Orion, this item allows it to Mega Evolve in battle.",
	},
	meloettites: {
		name: "Meloettite-S",
		spritenum: -6,
		megaStone: { "Meloetta-Orion": "Meloetta-Orion-Mega" },
		itemUser: ["Meloetta-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Meloetta-Orion, this item allows it to Mega Evolve in battle.",
	},
	absolites: {
		name: "Absolite-S",
		spritenum: -6,
		megaStone: { "Absol-Orion": "Absol-Orion-Mega" },
		itemUser: ["Absol-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Absol-Orion, this item allows it to Mega Evolve in battle.",
	},
	metagrossites: {
		name: "Metagrossite-S",
		spritenum: -6,
		megaStone: { "Metagross-Orion": "Metagross-Orion-Mega" },
		itemUser: ["Metagross-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Metagross-Orion, this item allows it to Mega Evolve in battle.",
	},
	medichamites: {
		name: "Medichamite-S",
		spritenum: -6,
		megaStone: { "Medicham-Orion": "Medicham-Orion-Mega" },
		itemUser: ["Medicham-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Medicham-Orion, this item allows it to Mega Evolve in battle.",
	},
	pidgeotites: {
		name: "Pidgeotite-S",
		spritenum: -6,
		megaStone: { "Pidgeot-Orion": "Pidgeot-Orion-Mega" },
		itemUser: ["Pidgeot-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Pidgeot-Orion, this item allows it to Mega Evolve in battle.",
	},
	blissites: {
		name: "Blissite-S",
		spritenum: -6,
		megaStone: { "Blissey-Orion": "Blissey-Orion-Mega" },
		itemUser: ["Blissey-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Blissey-Orion, this item allows it to Mega Evolve in battle.",
	},
	tentacruelites: {
		name: "Tentacruelite-S",
		spritenum: -6,
		megaStone: { "Tentacruel-Orion": "Tentacruel-Orion-Mega" },
		itemUser: ["Tentacruel-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Tentacruel-Orion, this item allows it to Mega Evolve in battle.",
	},
	tsareenitex: {
		name: "Tsareenite-X",
		spritenum: -6,
		megaStone: { "Tsareena-Orion": "Tsareena-Orion-Mega-X" },
		itemUser: ["Tsareena-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Tsareena-Orion, this item allows it to Mega Evolve in battle.",
	},
	tsareenitey: {
		name: "Tsareenite-Y",
		spritenum: -6,
		megaStone: { "Tsareena-Orion": "Tsareena-Orion-Mega-Y" },
		itemUser: ["Tsareena-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Tsareena-Orion, this item allows it to Mega Evolve in battle.",
	},
	beheeyemites: {
		name: "Beheeyemite-S",
		spritenum: -6,
		megaStone: { "Beheeyem-Orion": "Beheeyem-Orion-Mega" },
		itemUser: ["Beheeyem-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Beheeyem-Orion, this item allows it to Mega Evolve in battle.",
	},
	sandaconites: {
		name: "Sandaconite-S",
		spritenum: -6,
		megaStone: { "Sandaconda-Orion": "Sandaconda-Orion-Mega" },
		itemUser: ["Sandaconda-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Sandaconda-Orion, this item allows it to Mega Evolve in battle.",
	},
	raichunites: {
		name: "Raichunite-S",
		spritenum: -6,
		megaStone: { "Raichu-Orion": "Raichu-Orion-Mega" },
		itemUser: ["Raichu-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Raichu-Orion, this item allows it to Mega Evolve in battle.",
	},
	cofagrinites: {
		name: "Cofagrinite-S",
		spritenum: -6,
		megaStone: { "Cofagrigus-Orion": "Cofagrigus-Orion-Mega" },
		itemUser: ["Cofagrigus-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Cofagrigus-Orion, this item allows it to Mega Evolve in battle.",
	},
	swampertites: {
		name: "Swampertite-S",
		spritenum: -6,
		megaStone: { "Swampert-Orion": "Swampert-Orion-Mega" },
		itemUser: ["Swampert-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Swampert-Orion, this item allows it to Mega Evolve in battle.",
	},
	gothitellites: {
		name: "Gothitellite-S",
		spritenum: -6,
		megaStone: { "Gothitelle-Orion": "Gothitelle-Orion-Mega" },
		itemUser: ["Gothitelle-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Gothitelle-Orion, this item allows it to Mega Evolve in battle.",
	},
	charizardites: {
		name: "Charizardite-S",
		spritenum: -6,
		megaStone: { "Charizard-Orion": "Charizard-Orion-Mega" },
		itemUser: ["Charizard-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Charizard-Orion, this item allows it to Mega Evolve in battle.",
	},
	wiggnites: {
		name: "Wiggnite-S",
		spritenum: -6,
		megaStone: { "Wigglytuff-Orion": "Wigglytuff-Orion-Mega" },
		itemUser: ["Wigglytuff-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Wigglytuff-Orion, this item allows it to Mega Evolve in battle.",
	},
	manectites: {
		name: "Manectite-S",
		spritenum: -6,
		megaStone: { "Manectric-Orion": "Manectric-Orion-Mega" },
		itemUser: ["Manectric-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Manectric-Orion, this item allows it to Mega Evolve in battle.",
	},
	mamoswinites: {
		name: "Mamoswinite-S",
		spritenum: -6,
		megaStone: { "Mamoswine-Orion": "Mamoswine-Orion-Mega" },
		itemUser: ["Mamoswine-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Mamoswine-Orion, this item allows it to Mega Evolve in battle.",
	},
	torterranites: {
		name: "Torterranite-S",
		spritenum: -6,
		megaStone: { "Torterra-Orion": "Torterra-Orion-Mega" },
		itemUser: ["Torterra-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Torterra-Orion, this item allows it to Mega Evolve in battle.",
	},
	lopunnites: {
		name: "Lopunnite-S",
		spritenum: -6,
		megaStone: { "Lopunny-Orion": "Lopunny-Orion-Mega" },
		itemUser: ["Lopunny-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Lopunny-Orion, this item allows it to Mega Evolve in battle.",
	},
	gothitellitetemporal: {
		name: "Gothitellite-Temporal",
		spritenum: -6,
		megaStone: { "Gothitelle-Temporal": "Gothitelle-Temporal-Mega" },
		itemUser: ["Gothitelle-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.GOthitelle, this item allows it to Mega Evolve in battle.",
	},
	donphanites: {
		name: "Donphanite-S",
		spritenum: -6,
		megaStone: { "Donphan-Orion": "Donphan-Orion-Mega" },
		itemUser: ["Donphan-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Donphan-Orion, this item allows it to Mega Evolve in battle.",
	},
	garchompites: {
		name: "Garchompite-S",
		spritenum: -6,
		megaStone: { "Garchomp-Orion": "Garchomp-Orion-Mega" },
		itemUser: ["Garchomp-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Garchomp-Orion, this item allows it to Mega Evolve in battle.",
	},
	ninetalites: {
		name: "Ninetalite-S",
		spritenum: -6,
		megaStone: { "Ninetales-Orion": "Ninetales-Orion-Mega" },
		itemUser: ["Ninetales-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Ninetales-Orion, this item allows it to Mega Evolve in battle.",
	},
	toxtricites: {
		name: "Toxtricite-S",
		spritenum: -6,
		megaStone: { "Toxtricity-Orion": "Toxtricity-Orion-Mega" },
		itemUser: ["Toxtricity-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Toxtricity-Orion, this item allows it to Mega Evolve in battle.",
	},
	dugtrioitetemporal: {
		name: "Dugtrioite-Temporal",
		spritenum: -6,
		megaStone: { "Dugtrio-Temporal": "Dugtrio-Temporal-Mega" },
		itemUser: ["Dugtrio-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Dugtrio, this item allows it to Mega Evolve in battle.",
	},
	luvdiscites: {
		name: "Luvdiscite-S",
		spritenum: -6,
		megaStone: { "Luvdisc-Orion": "Luvdisc-Orion-Mega" },
		itemUser: ["Luvdisc-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Luvdisc-Orion, this item allows it to Mega Evolve in battle.",
	},
	absolitetemporal: {
		name: "Absolite-Temporal",
		spritenum: -6,
		megaStone: { "Absol-Temporal": "Absol-Temporal-Mega" },
		itemUser: ["Absol-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Absol, this item allows it to Mega Evolve in battle.",
	},
	abomasites: {
		name: "Abomasite-S",
		spritenum: -6,
		megaStone: { "Abomasnow-Orion": "Abomasnow-Orion-Mega" },
		itemUser: ["Abomasnow-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Abomasnow-Orion, this item allows it to Mega Evolve in battle.",
	},
	sablenitetemporal: {
		name: "Sablenite-Temporal",
		spritenum: -6,
		megaStone: { "Sableye-Temporal": "Sableye-Temporal-Mega" },
		itemUser: ["Sableye-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Sableye, this item allows it to Mega Evolve in battle.",
	},
	garbodinites: {
		name: "Garbodinite-S",
		spritenum: -6,
		megaStone: { "Garbodor-Orion": "Garbodor-Orion-Mega" },
		itemUser: ["Garbodor-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Garbodor-Orion, this item allows it to Mega Evolve in battle.",
	},
	altarianitetemporal: {
		name: "Altarianite-Temporal",
		spritenum: -6,
		megaStone: { "Altaria-Temporal": "Altaria-Temporal-Mega" },
		itemUser: ["Altaria-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Altaria, this item allows it to Mega Evolve in battle.",
	},
	swampertitetemporal: {
		name: "Swampertite-Temporal",
		spritenum: -6,
		megaStone: { "Swampert-Temporal": "Swampert-Temporal-Mega" },
		itemUser: ["Swampert-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Swampert, this item allows it to Mega Evolve in battle.",
	},
	masqueritetemporal: {
		name: "Masquerite-Temporal",
		spritenum: -6,
		megaStone: { "Masquerain-Temporal": "Masquerain-Temporal-Mega" },
		itemUser: ["Masquerain-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Masquerain, this item allows it to Mega Evolve in battle.",
	},
	barbaraclites: {
		name: "Barbaraclite-S",
		spritenum: -6,
		megaStone: { "Barbaracle-Orion": "Barbaracle-Orion-Mega" },
		itemUser: ["Barbaracle-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Barbaracle-Orion, this item allows it to Mega Evolve in battle.",
	},
	falinkites: {
		name: "Falinkite-S",
		spritenum: -6,
		megaStone: { "Falinks-Orion": "Falinks-Orion-Mega" },
		itemUser: ["Falinks-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Falinks-Orion, this item allows it to Mega Evolve in battle.",
	},
	mismagites: {
		name: "Mismagite-S",
		spritenum: -6,
		megaStone: { "Mismagius-Orion": "Mismagius-Orion-Mega" },
		itemUser: ["Mismagius-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Mismagius-Orion, this item allows it to Mega Evolve in battle.",
	},
	scizorites: {
		name: "Scizorite-S",
		spritenum: -6,
		megaStone: { "Scizor-Orion": "Scizor-Orion-Mega" },
		itemUser: ["Scizor-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Scizor-Orion, this item allows it to Mega Evolve in battle.",
	},
	coalossalites: {
		name: "Coalossalite-S",
		spritenum: -6,
		megaStone: { "Coalossal-Orion": "Coalossal-Orion-Mega" },
		itemUser: ["Coalossal-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Coalossal-Orion, this item allows it to Mega Evolve in battle.",
	},
	giganitetemporal: {
		name: "Giganite-Temporal",
		spritenum: -6,
		megaStone: { "Gigalith-Temporal": "Gigalith-Temporal-Mega" },
		itemUser: ["Gigalith-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Gigalith, this item allows it to Mega Evolve in battle.",
	},
	dragites: {
		name: "Dragite-S",
		spritenum: -6,
		megaStone: { "Dragonite-Orion": "Dragonite-Orion-Mega" },
		itemUser: ["Dragonite-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Dragonite-Orion, this item allows it to Mega Evolve in battle.",
	},
	dragapultites: {
		name: "Dragapultite-S",
		spritenum: -6,
		megaStone: { "Dragapult-Orion": "Dragapult-Orion-Mega" },
		itemUser: ["Dragapult-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Dragapult-Orion, this item allows it to Mega Evolve in battle.",
	},
	banettites: {
		name: "Banettite-S",
		spritenum: -6,
		megaStone: { "Banette-Orion": "Banette-Orion-Mega" },
		itemUser: ["Banette-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Banette-Orion, this item allows it to Mega Evolve in battle.",
	},
	houndoominites: {
		name: "Houndoominite-S",
		spritenum: -6,
		megaStone: { "Houndoom-Orion": "Houndoom-Orion-Mega" },
		itemUser: ["Houndoom-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Houndoom-Orion, this item allows it to Mega Evolve in battle.",
	},
	empoleonites: {
		name: "Empoleonite-S",
		spritenum: -6,
		megaStone: { "Empoleon-Orion": "Empoleon-Orion-Mega" },
		itemUser: ["Empoleon-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Empoleon-Orion, this item allows it to Mega Evolve in battle.",
	},
	jumpinitetemporal: {
		name: "Jumpinite-Temporal",
		spritenum: -6,
		megaStone: { "Jumpluff-Temporal": "Jumpluff-Temporal-Mega" },
		itemUser: ["Jumpluff-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Jumpluff, this item allows it to Mega Evolve in battle.",
	},
	exploudinites: {
		name: "Exploudinite-S",
		spritenum: -6,
		megaStone: { "Exploud-Orion": "Exploud-Orion-Mega" },
		itemUser: ["Exploud-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Exploud-Orion, this item allows it to Mega Evolve in battle.",
	},
	centiskorites: {
		name: "Centiskorite-S",
		spritenum: -6,
		megaStone: { "Centiskorch-Orion": "Centiskorch-Orion-Mega" },
		itemUser: ["Centiskorch-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Centiskorch-Orion, this item allows it to Mega Evolve in battle.",
	},
	salamencites: {
		name: "Salamencite-S",
		spritenum: -6,
		megaStone: { "Salamence-Orion": "Salamence-Orion-Mega" },
		itemUser: ["Salamence-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Salamence-Orion, this item allows it to Mega Evolve in battle.",
	},
	grapploctites: {
		name: "Grapploctite-S",
		spritenum: -6,
		megaStone: { "Grapploct-Orion": "Grapploct-Orion-Mega" },
		itemUser: ["Grapploct-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Grapploct-Orion, this item allows it to Mega Evolve in battle.",
	},
	hatterenites: {
		name: "Hatterenite-S",
		spritenum: -6,
		megaStone: { "Hatterene-Orion": "Hatterene-Orion-Mega" },
		itemUser: ["Hatterene-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Hatterene-Orion, this item allows it to Mega Evolve in battle.",
	},
	chimechites: {
		name: "Chimechite-S",
		spritenum: -6,
		megaStone: { "Chimecho-Orion": "Chimecho-Orion-Mega" },
		itemUser: ["Chimecho-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Chimecho-Orion, this item allows it to Mega Evolve in battle.",
	},
	grimmsnarlitetemporal: {
		name: "Grimmsnarlite-Temporal",
		spritenum: -6,
		megaStone: { "Grimmsnarl-Temporal": "Grimmsnarl-Temporal-Mega" },
		itemUser: ["Grimmsnarl-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Grimmsnarl, this item allows it to Mega Evolve in battle.",
	},
	wyrdeeritetemporal: {
		name: "Wyrdeerite-Temporal",
		spritenum: -6,
		megaStone: { "Wyrdeer-Temporal": "Wyrdeer-Temporal-Mega" },
		itemUser: ["Wyrdeer-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Wyrdeer, this item allows it to Mega Evolve in battle.",
	},
	ursalunites: {
		name: "Ursalunite-S",
		spritenum: -6,
		megaStone: { "Ursaluna-Orion": "Ursaluna-Orion-Mega" },
		itemUser: ["Ursaluna-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a URsaluna-Orion, this item allows it to Mega Evolve in battle.",
	},
	emolgites: {
		name: "Emolgite-S",
		spritenum: -6,
		megaStone: { "Emolga-Orion": "Emolga-Orion-Mega" },
		itemUser: ["Emolga-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Emolga-Orion, this item allows it to Mega Evolve in battle.",
	},
	vespiquenites: {
		name: "Vespiquenite-S",
		spritenum: -6,
		megaStone: { "Vespiquen-Orion": "Vespiquen-Orion-Mega" },
		itemUser: ["Vespiquen-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Vespiquen-Orion, this item allows it to Mega Evolve in battle.",
	},
	blazikenites: {
		name: "Blazikenite-S",
		spritenum: -6,
		megaStone: { "Blaziken-Orion": "Blaziken-Orion-Mega" },
		itemUser: ["Blaziken-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Blaziken-Orion, this item allows it to Mega Evolve in battle.",
	},
	garganaclites: {
		name: "Garganaclite-S",
		spritenum: -6,
		megaStone: { "Garganacl-Orion": "Garganacl-Orion-Mega" },
		itemUser: ["Garganacl-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Garganacl-Orion, this item allows it to Mega Evolve in battle.",
	},
	wobbnites: {
		name: "Wobbnite-S",
		spritenum: -6,
		megaStone: { "Wobbuffet-Orion": "Wobbuffet-Orion-Mega" },
		itemUser: ["Wobbuffet-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Wobbuffet-Orion, this item allows it to Mega Evolve in battle.",
	},
	plusites: {
		name: "Plusite-S",
		spritenum: -6,
		megaStone: { "Plusle-Orion": "Plusle-Orion-Mega" },
		itemUser: ["Plusle-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Plusle-Orion, this item allows it to Mega Evolve in battle.",
	},
	minunites: {
		name: "Minunite-S",
		spritenum: -6,
		megaStone: { "Minun-Orion": "Minun-Orion-Mega" },
		itemUser: ["Minun-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Minun-Orion, this item allows it to Mega Evolve in battle.",
	},
	blastoisinites: {
		name: "Blastoisinite-S",
		spritenum: -6,
		megaStone: { "Blastoise-Orion": "Blastoise-Orion-Mega" },
		itemUser: ["Blastoise-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Blastoise-Orion, this item allows it to Mega Evolve in battle.",
	},
	cacturnitetemporal: {
		name: "Cacturnite-Temporal",
		spritenum: -6,
		megaStone: { "Cacturne-Temporal": "Cacturne-Temporal-Mega" },
		itemUser: ["Cacturne-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Cacturne-Orion, this item allows it to Mega Evolve in battle.",
	},
	ursalunitetemporal: {
		name: "Ursalunite-Temporal",
		spritenum: -6,
		megaStone: { "Ursaluna-Temporal": "Ursaluna-Temporal-Mega" },
		itemUser: ["Ursaluna-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Ursaluna, this item allows it to Mega Evolve in battle.",
	},
	drednites: {
		name: "Drednite-S",
		spritenum: -6,
		megaStone: { "Drednaw-Orion": "Drednaw-Orion-Mega" },
		itemUser: ["Drednaw-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Drednaw-Orion, this item allows it to Mega Evolve in battle.",
	},
	whimsicottitetemporal: {
		name: "Whimsicottite-Temporal",
		spritenum: -6,
		megaStone: { "Whimsicott-Temporal": "Whimsicott-Temporal-Mega" },
		itemUser: ["Whimsicott-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Whimsicott, this item allows it to Mega Evolve in battle.",
	},
	charizarditetemporal: {
		name: "Charizardite-Temporal",
		spritenum: -6,
		megaStone: { "Charizard-Temporal": "Charizard-Temporal-Mega" },
		itemUser: ["Charizard-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Charizard, this item allows it to Mega Evolve in battle.",
	},
	victreebelites: {
		name: "Victreebelite-S",
		spritenum: -6,
		megaStone: { "Victreebel-Orion": "Victreebel-Orion-Mega" },
		itemUser: ["Victreebel-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Victreebel-Orion, this item allows it to Mega Evolve in battle.",
	},
	delibirdites: {
		name: "Delibirdite-S",
		spritenum: -6,
		megaStone: { "Delibird-Orion": "Delibird-Orion-Mega" },
		itemUser: ["Delibird-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Delibird-Orion, this item allows it to Mega Evolve in battle.",
	},
	scizoritetemporal: {
		name: "Scizorite-Temporal",
		spritenum: -6,
		megaStone: { "Scizor-Temporal": "Scizor-Temporal-Mega" },
		itemUser: ["Scizor-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Scizor, this item allows it to Mega Evolve in battle.",
	},
	kleavoritetemporal: {
		name: "Kleavorite-Temporal",
		spritenum: -6,
		megaStone: { "Kleavor-Temporal": "Kleavor-Temporal-Mega" },
		itemUser: ["Kleavor-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Kleavor, this item allows it to Mega Evolve in battle.",
	},
	kangaskhanites: {
		name: "Kangaskhanite-S",
		spritenum: -6,
		megaStone: { "Kangaskhan-Orion": "Kangaskhan-Orion-Mega" },
		itemUser: ["Kangaskhan-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Kangaskhan-Orion, this item allows it to Mega Evolve in battle.",
	},
	pyukumites: {
		name: "Pyukumite-S",
		spritenum: -6,
		megaStone: { "Pyukumuku-Orion": "Pyukumuku-Orion-Mega" },
		itemUser: ["Pyukumuku-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Pyukumuku-Orion, this item allows it to Mega Evolve in battle.",
	},
	venusauritetemporal: {
		name: "Venusaurite-Temporal",
		spritenum: -6,
		megaStone: { "Venusaur-Temporal": "Venusaur-Temporal-Mega" },
		itemUser: ["Venusaur-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Venusaur, this item allows it to Mega Evolve in battle.",
	},
	mawilites: {
		name: "Mawilite-S",
		spritenum: -6,
		megaStone: { "Mawile-Orion": "Mawile-Orion-Mega" },
		itemUser: ["Mawile-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Mawile-Orion, this item allows it to Mega Evolve in battle.",
	},
	ampharositetemporal: {
		name: "Ampharosite-Temporal",
		spritenum: -6,
		megaStone: { "Ampharos-Temporal": "Ampharos-Temporal-Mega" },
		itemUser: ["Ampharos-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Ampharos, this item allows it to Mega Evolve in battle.",
	},
	snorlaxitetemporal: {
		name: "Snorlaxite-Temporal",
		spritenum: -6,
		megaStone: { "Snorlax-Temporal": "Snorlax-Temporal-Mega" },
		itemUser: ["Snorlax-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Snorlax, this item allows it to Mega Evolve in battle.",
	},
	furretitetemporal: {
		name: "Furretite-Temporal",
		spritenum: -6,
		megaStone: { "Furret-Temporal": "Furret-Temporal-Mega" },
		itemUser: ["Furret-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Furret, this item allows it to Mega Evolve in battle.",
	},
	magcargitetemporal: {
		name: "Magcargite-Temporal",
		spritenum: -6,
		megaStone: { "Magcargo-Temporal": "Magcargo-Temporal-Mega" },
		itemUser: ["Magcargo-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Magcargo, this item allows it to Mega Evolve in battle.",
	},
	reuniclites: {
		name: "Reuniclite-S",
		spritenum: -6,
		megaStone: { "Reuniclus-Orion": "Reuniclus-Orion-Mega" },
		itemUser: ["Reuniclus-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Reuniclus-Orion, this item allows it to Mega Evolve in battle.",
	},
	meowsticites: {
		name: "Meowsticite-S",
		spritenum: -6,
		megaStone: { "Meowstic-Orion": "Meowstic-Orion-Mega" },
		itemUser: ["Meowstic-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Meowstic-Orion, this item allows it to Mega Evolve in battle.",
	},
	staraptites: {
		name: "Staraptite-S",
		spritenum: -6,
		megaStone: { "Staraptor-Orion": "Staraptor-Orion-Mega" },
		itemUser: ["Staraptor-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Staraptor-Orion, this item allows it to Mega Evolve in battle.",
	},
	raticatites: {
		name: "Raticatite-S",
		spritenum: -6,
		megaStone: { "Raticate-Orion": "Raticate-Orion-Mega" },
		itemUser: ["Raticate-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Raticate-Orion, this item allows it to Mega Evolve in battle.",
	},
	baxcalibrites: {
		name: "Baxcalibrite-S",
		spritenum: -6,
		megaStone: { "Baxcalibur-Orion": "Baxcalibur-Orion-Mega" },
		itemUser: ["Baxcalibur-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Baxcalibur-Orion, this item allows it to Mega Evolve in battle.",
	},
	wiggnitetemporal: {
		name: "Wiggnite-Temporal",
		spritenum: -6,
		megaStone: { "Wigglytuff-Temporal": "Wigglytuff-Temporal-Mega" },
		itemUser: ["Wigglytuff-Temporal"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a T.Wigglytuff, this item allows it to Mega Evolve in battle.",
	},
	eelektrossites: {
		name: "Eelektrossite-S",
		spritenum: -6,
		megaStone: { "Eelektross-Orion": "Eelektross-Orion-Mega" },
		itemUser: ["Eelektross-Orion"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
		gen: 9,
		shortDesc: "If held by a Eelektross-Orion, this item allows it to Mega Evolve in battle.",
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
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Sound-type attack.",
	},
	frostorb: {
		name: "Frost Orb",
		spritenum: -6,
		fling: {
			basePower: 30,
			status: 'frb',
		},
		onResidualOrder: 28,
		onResidualSubOrder: 3,
		onResidual(pokemon) {
			pokemon.trySetStatus('frb', pokemon);
		},
		num: 0,
		gen: 9,
		shortDesc: "At the end of every turn, this item attempts to frostbite the holder.",
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
		gen: 9,
		shortDesc: "Halves damage taken from a supereffective Light-type attack. Single use.",
	},
};
