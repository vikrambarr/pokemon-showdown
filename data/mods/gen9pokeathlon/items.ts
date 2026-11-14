export const Items: import('../../../sim/dex-items').ModdedItemDataTable = {
	electrodite: {
		name: "Electrodite",
		desc: "If held by a Electrode, this item allows it to Mega Evolve in battle.",
		spritenum: 596,
		megaStone: { "Electrode": "Electrode-Mega" },
		itemUser: ["Electrode"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	florgesite: {
		name: "Florgesite",
		desc: "If held by a Florges, this item allows it to Mega Evolve in battle.",
		spritenum: 615,
		megaStone: { "Florges": "Florges-Mega" },
		itemUser: ["Florges"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	frostysnorlaxite: {
		name: "Frosty Snorlaxite",
		desc: "If held by a Snorlax-Frost, this item allows it to Mega Evolve in battle.",
		spritenum: 623,
		megaStone: { "Snorlax-Frost": "Snorlax-Frost-Mega" },
		itemUser: ["Snorlax-Frost"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltablazikenite: {
		name: "Delta Blazikenite",
		desc: "If held by a Blaziken-Delta, this item allows it to Mega Evolve in battle.",
		spritenum: -3,
		megaStone: { "Blaziken-Delta": "Blaziken-Delta-Mega" },
		itemUser: ["Blaziken-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltasceptilite: {
		name: "Delta Sceptilite",
		desc: "If held by a Sceptile-Delta, this item allows it to Mega Evolve in battle.",
		spritenum: -3,
		megaStone: { "Sceptile-Delta": "Sceptile-Delta-Mega" },
		itemUser: ["Sceptile-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	sekrilite: {
		name: "Sekrilite",
		desc: "If held by a Sekrilon, this item allows it to Mega Evolve in battle.",
		spritenum: -3,
		megaStone: { "Sekrilon": "Sekrilon-Mega" },
		itemUser: ["Sekrilon"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	deltatyranitarite: {
		name: "Delta Tyranitarite",
		desc: "If held by a Tyranitar-Delta, this item allows it to Mega Evolve in battle.",
		spritenum: -3,
		megaStone: { "Tyranitar-Delta": "Tyranitar-Delta-Mega" },
		itemUser: ["Tyranitar-Delta"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	vigorherb: {
		name: "Vigor Herb",
		desc: "Holder's recharge turn is skipped. Single use.",
		onUpdate(pokemon) {
			if (pokemon.volatiles["mustrecharge"] && pokemon.useItem()) {
				pokemon.removeVolatile("mustrecharge");
				this.add("cant", pokemon, "recharge");
				return;
			}
		},
		spritenum: -3,
	},
	paddedhelmet: {
		name: "Padded Helmet",
		desc: "Holder takes half the recoil damage.",
		onModifyMovePriority: 1,
		onModifyMove(move) {
			if (move.recoil) move.recoil[1] *= 2;
		},
		spritenum: -3,
	},
	ejectbandage: {
		name: "Eject Bandage",
		shortDesc: "Holder heals 33% on switch out. Single use.",
		spritenum: -3,
		onSwitchOut(source) {
			if (source.hp < source.maxhp) {
				source.heal(source.maxhp / 3);
				source.useItem();
			}
		},
	},
	energydrink: {
		name: "Energy Drink",
		desc: "The holder was very tired and thus downed 17 cans of Red Bull, preventing it from falling asleep for the next 9 days.",
		shortDesc: "This Pokemon cannot fall asleep.",
		spritenum: -3,
		onUpdate(pokemon) {
			if (pokemon.status === 'slp') {
				this.add('-activate', pokemon, 'item: Energy Drink');
				pokemon.cureStatus();
			}
		},
		onSetStatus(status, target, source, effect) {
			if (status.id !== 'slp') return;
			if ((effect as Move)?.status) {
				this.add('-activate', target, 'item: Energy Drink');
			}
			return false;
		},
		onTryAddVolatile(status, target) {
			if (status.id === 'yawn') {
				this.add('-activate', target, 'item: Energy Drink');
				return null;
			}
		},
	},
	managel: {
		name: "Mana Gel",
		shortDesc: "The holder cannot have its stat changes cleared or stolen. Psych Up will fail when used against the holder.",
		spritenum: -3,
		onFoeModifyMove(move, source, target) {
			if (move.stealsBoosts) move.stealsBoosts = false;
		},
		onTryHit(pokemon, target, move) {
			if (move.id === 'psychup') return false;
		},
	},
	buddylantern: {
		name: "Buddy Lantern",
		shortDesc: "Holder deals 0.125x damage to allies.",
		spritenum: -3,
		onModifyDamage(damage, source, target, move) {
			if (target.isAlly(source)) {
				this.debug('Buddy Lantern neutralize');
				return this.chainModify(0.125);
			}
		},
	},
	doubledip: {
		name: "Double Dip",
		shortDesc: "If move misses, use move again with perfect accuracy. Single use.",
		spritenum: -3,
		onAccuracyMissPriority: 1,
		onAccuracyMiss(pokemon, target, move) {
			if (!move.ohko && move.category !== 'Status' && pokemon.useItem()) {
				move.accuracy = true;
				this.actions.useMove(move, pokemon);
			}
		},
		fling: {
			basePower: 60,
			effect(target, source) {
				if (!target.lastMove || target.volatiles['dynamax']) return false;
				const lastMove = target.lastMove;
				const moveSlot = target.getMoveData(lastMove.id);
				if (
					lastMove.flags['failinstruct'] || lastMove.isZ || lastMove.isMax ||
					lastMove.flags['charge'] || lastMove.flags['recharge'] ||
					target.volatiles['beakblast'] || target.volatiles['focuspunch'] || target.volatiles['shelltrap'] ||
					(moveSlot && moveSlot.pp <= 0)
				) {
					return false;
				}
				this.add('-singleturn', target, 'move: Instruct', `[of] ${source}`);
				this.queue.prioritizeAction(this.queue.resolveAction({
					choice: 'move',
					pokemon: target,
					moveid: target.lastMove.id,
					targetLoc: target.lastMoveTargetLoc!,
				})[0] as MoveAction);
			},
		},
	},
	brokenhourglass: {
		name: "Broken Hourglass",
		shortDesc: "Future moves land instantly at 1.3x power. Single use.",
		spritenum: -3,
		onModifyMovePriority: 1,
		onModifyMove(move, pokemon, target) {
			if (move.flags.futuremove) {
				move.ignoreImmunity = false;
				move.onTry = undefined;
			}
			if (move.id === 'wish') {
				move.slotCondition = undefined;
				move.condition = {};
			}
		},
		onTryMovePriority: -1,
		onTryMove(source, target, move) {
			if (move.id === 'wish' && source.hp !== source.baseMaxhp && source.useItem()) {
				this.heal(source.baseMaxhp * 1.3 / 2, source, source);
			}
			if (move.id === 'wish' && source.hp === source.baseMaxhp) {
				this.add('-fail', source, 'move: Wish');
				this.attrLastMove('[still]');
				return null;
			}
		},
		onBasePower(basePower, source, target, move) {
			if (move.flags.futuremove && move.category !== 'Status' && source.useItem()) {
				return this.chainModify(1.3);
			}
		},
		fling: {
			basePower: 30,
			effect(pokemon) {
				let activate = false;
				const boosts: SparseBoostsTable = {};
				let i: BoostID;
				for (i in pokemon.boosts) {
					activate = true;
					boosts[i] = 0;
				}
				if (activate && !pokemon.hasItem('managel')) {
					pokemon.setBoost(boosts);
					this.add('-clearboost', pokemon, '[silent]');
				}
			},
		},
	},
	anchor: {
		name: "Anchor",
		spritenum: -3,
		shortDesc: "Holder's Spe is 0.5x, cannot be forced to switched out. Dhelmise: 1.5x Atk.",
		fling: {
			basePower: 130,
		},
		onFoeModifyMove(move, pokemon, target) {
			if (move.forceSwitch) move.forceSwitch = false;
		},
		onModifyAtkPriority: 1,
		onModifyAtk(atk, pokemon) {
			if (pokemon.baseSpecies.baseSpecies === 'Dhelmise' || pokemon.m.fusion === 'Dhelmise') {
				return this.chainModify(1.5);
			}
		},
		onModifySpe(spe) {
			return this.chainModify(0.5);
		},
		itemUser: ['Dhelmise'],
	},
	tofagrifite: {
		name: "Tofagrifite",
		desc: "If held by a Tofagrif, this item allows it to Mega Evolve in battle.",
		spritenum: -3,
		megaStone: { "Tofagrif": "Tofagrif-Mega" },
		itemUser: ["Tofagrif"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	subarcticheracronite: {
		name: "Subarctic Heracronite",
		desc: "If held by a Heracross-Subarctic, this item allows it to Mega Evolve in battle.",
		spritenum: -3,
		megaStone: { "Heracross-Subarctic": "Heracross-Subarctic-Mega" },
		itemUser: ["Heracross-Subarctic"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	dryguaronite: {
		name: "Dryguaronite",
		desc: "If held by a Dryguaro, this item allows it to Mega Evolve in battle.",
		spritenum: -3,
		megaStone: { "Dryguaro": "Dryguaro-Mega" },
		itemUser: ["Dryguaro"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	utensitite: {
		name: "Utensitite",
		desc: "If held by a Utensitile, this item allows it to Mega Evolve in battle.",
		spritenum: -3,
		megaStone: { "Utensitile": "Utensitile-Mega" },
		itemUser: ["Utensitile"],
		onTakeItem(item, source) {
			return !item.megaStone?.[source.baseSpecies.baseSpecies];
		},
		num: 0,
	},
	bubbleclef: {
		name: "Bubble Clef",
		desc: "If held by an Odinalto, transforms into Odinalto-Coda. 1.2x power to Bug/Water.",
		spritenum: -3,
		itemUser: ["Odinalto", "Odinalto-Coda"],
		onBasePowerPriority: 15,
		onBasePower(basePower, user, target, move) {
			if (user.baseSpecies.name.startsWith('Odinalto') && ["Water", "Bug"].includes(move.type)) {
				return this.chainModify(1.2);
			}
		},
		onTakeItem(item, source) {
			if (source.baseSpecies.baseSpecies === 'Odinalto') return false;
			return true;
		},
		forcedForme: "Odinalto-Coda",
	},
};
