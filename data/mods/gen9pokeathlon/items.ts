export const Items: import('../../../sim/dex-items').ModdedItemDataTable = {
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
		num: 0,
	},
	paddedhelmet: {
		name: "Padded Helmet",
		desc: "Holder takes half the recoil damage.",
		onModifyMovePriority: 1,
		onModifyMove(move) {
			if (move.recoil) move.recoil[1] *= 2;
		},
		num: 0,
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
		num: 0,
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
		num: 0,
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
		num: 0,
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
		num: 0,
	},
	doubledip: {
		name: "Double Dip",
		shortDesc: "If move misses, use move again with perfect accuracy. Single use.",
		spritenum: -3,
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
		num: 0,
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
		num: 0,
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
		num: 0,
		itemUser: ['Dhelmise'],
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
		num: 0,
	},
};
