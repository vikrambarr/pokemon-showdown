export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	dig: {
		inherit: true,
		condition: {
			duration: 2,
			onImmunity(type, pokemon) {
				if (type === 'sandstorm' || type === 'hail') return false;
			},
			onInvulnerability(target, source, move) {
				if (['earthquake', 'magnitude', 'terraforce', 'anvilsmash', 'webwrecker'].includes(move.id)) {
					return;
				}
				return false;
			},
			onSourceModifyDamage(damage, source, target, move) {
				if (['earthquake', 'magnitude', 'terraforce', 'anvilsmash', 'webwrecker'].includes(move.id)) {
					return this.chainModify(2);
				}
			},
		},
	},
	grassyterrain: {
		inherit: true,
		condition: {
			effectType: 'Terrain',
			duration: 5,
			durationCallback(source, effect) {
				if (source?.hasItem('terrainextender')) {
					return 8;
				}
				return 5;
			},
			onBasePowerPriority: 6,
			onBasePower(basePower, attacker, defender, move) {
				const weakenedMoves = ['earthquake', 'bulldoze', 'magnitude', 'terraforce', 'anvilsmash', 'webwrecker'];
				if (weakenedMoves.includes(move.id) && defender.isGrounded() && !defender.isSemiInvulnerable()) {
					this.debug('move weakened by grassy terrain');
					return this.chainModify(0.5);
				}
				if (move.type === 'Grass' && attacker.isGrounded()) {
					this.debug('grassy terrain boost');
					return this.chainModify([5325, 4096]);
				}
			},
			onFieldStart(field, source, effect) {
				if (effect?.effectType === 'Ability') {
					this.add('-fieldstart', 'move: Grassy Terrain', '[from] ability: ' + effect.name, `[of] ${source}`);
				} else {
					this.add('-fieldstart', 'move: Grassy Terrain');
				}
			},
			onResidualOrder: 5,
			onResidualSubOrder: 2,
			onResidual(pokemon) {
				if (pokemon.isGrounded() && !pokemon.isSemiInvulnerable()) {
					this.heal(pokemon.baseMaxhp / 16, pokemon, pokemon);
				} else {
					this.debug(`Pokemon semi-invuln or not grounded; Grassy Terrain skipped`);
				}
			},
			onFieldResidualOrder: 27,
			onFieldResidualSubOrder: 7,
			onFieldEnd() {
				this.add('-fieldend', 'move: Grassy Terrain');
			},
		},
	},
	quash: {
		inherit: true,
		onHit(target) {
			if (this.gen < 9) {
				if (this.activePerHalf === 1) return false;
				const action = this.queue.willMove(target);
				if (!action) return false;

				action.priority = -7.1;
				this.queue.cancelMove(target);
				for (let i = this.queue.list.length - 1; i >= 0; i--) {
					if (this.queue.list[i].choice === 'residual') {
						this.queue.list.splice(i, 0, action);
						break;
					}
				}
				this.add('-activate', target, 'move: Quash');
			} else {
				if (this.activePerHalf === 1) return false;
				const action = this.queue.willMove(target);
				if (!action) return false;

				action.order = 201;
				this.add('-activate', target, 'move: Quash');
			}
		},
	},
	ambush: {
		num: 0,
		accuracy: 100,
		basePower: 40,
		category: "Physical",
		name: "Ambush",
		desc: "An attack that hits first and makes the target flinch. It only works the first turn the user is in battle.",
		shortDesc: "Hits first. First turn out only. 100% flinch chance.",
		pp: 10,
		priority: 3,
		flags: { contact: 1, protect: 1, mirror: 1 },
		onTry(source) {
			if (source.activeMoveActions > 1) {
				this.hint("Ambush only works on your first turn out.");
				return false;
			}
		},
		secondary: {
			chance: 100,
			volatileStatus: 'flinch',
		},
		target: "normal",
		type: "Dark",
	},
	bigbang: {
		num: 0,
		accuracy: 100,
		basePower: 105,
		category: "Physical",
		name: "Big Bang",
		desc: "The Pokémon unleashes a burst of cosmic energy that hits all in battle, and may leave a status condition.",
		shortDesc: "50% chance to burn, freeze, or paralyze target.",
		pp: 5,
		priority: 0,
		flags: { protect: 1, mirror: 1 },
		secondary: {
			chance: 50,
			onHit(target, source) {
				const result = this.random(3);
				if (result === 0) {
					target.trySetStatus('brn', source);
				} else if (result === 1) {
					target.trySetStatus('frz', source);
				} else {
					target.trySetStatus('par', source);
				}
			},
		},
		target: "allAdjacent",
		type: "Cosmic",
	},
	dinokick: {
		num: 0,
		accuracy: 100,
		basePower: 70,
		category: "Physical",
		name: "Dino Kick",
		desc: "The user kicks the opponent, destroying their item. Does less damage if opponent has no item.",
		shortDesc: "1.5x damage if foe holds an item. Removes item.",
		pp: 20,
		priority: 0,
		flags: { contact: 1, protect: 1, mirror: 1 },
		onBasePower(basePower, source, target, move) {
			const item = target.getItem();
			if (!this.singleEvent('TakeItem', item, target.itemState, target, target, move, item)) return;
			if (item.id) {
				return this.chainModify(1.5);
			}
		},
		onAfterHit(target, source) {
			if (source.hp) {
				const item = target.takeItem();
				if (item) {
					this.add('-enditem', target, item.name, '[from] move: Dino Kick', `[of] ${source}`);
				}
			}
		},
		secondary: undefined,
		target: "normal",
		type: "Fighting",
	},
	omniblast: {
		num: 0,
		accuracy: 100,
		basePower: 100,
		category: "Special",
		name: "Omni Blast",
		desc: "The user unleashes a bolt of digital energy. Struck foes may get paralyzed, burned, or frozen.",
		shortDesc: "50% chance to burn, freeze, or paralyze target.",
		pp: 5,
		priority: 0,
		flags: { protect: 1, mirror: 1, pulse: 1 },
		secondary: {
			chance: 20,
			onHit(target, source) {
				const result = this.random(3);
				if (result === 0) {
					target.trySetStatus('brn', source);
				} else if (result === 1) {
					target.trySetStatus('frz', source);
				} else {
					target.trySetStatus('par', source);
				}
			},
		},
		target: "normal",
		type: "Electric",
	},
	pagefault: {
		num: 0,
		accuracy: 100,
		basePower: 120,
		category: "Physical",
		name: "Page Fault",
		desc: "The user somersaults, striking with its blades for several turns. The user ends up confused.",
		shortDesc: "Lasts 2-3 turns. Confuses the user afterwards.",
		pp: 10,
		priority: 0,
		flags: { contact: 1, protect: 1, mirror: 1, metronome: 1, failinstruct: 1 },
		self: {
			volatileStatus: 'lockedmove',
		},
		onAfterMove(pokemon) {
			if (pokemon.volatiles['lockedmove']?.duration === 1) {
				pokemon.removeVolatile('lockedmove');
			}
		},
		target: "randomNormal",
		type: "Poison",
	},
	transcendentsword: {
		num: 0,
		accuracy: 100,
		basePower: 240,
		category: "Physical",
		name: "Transcendent Sword",
		desc: "The user unleashes a mighty thrust with their legendary Transcendent Sword, clearing all hazards.",
		shortDesc: "-1 evasion; clears terrain and hazards on both sides.",
		pp: 1,
		noPPBoosts: true,
		priority: 0,
		flags: { contact: 1, protect: 1, mirror: 1, slicing: 1 },
		onHit(target, source, move) {
			let success = false;
			if (!target.volatiles['substitute'] || move.infiltrates) success = !!this.boost({ evasion: -1 });
			const removeTarget = [
				'reflect', 'lightscreen', 'auroraveil', 'safeguard', 'mist', 'spikes', 'toxicspikes', 'stealthrock', 'hotcoals', 'stickyweb', 'permafrost', 'livewire', 'gmaxsteelsurge',
			];
			const removeAll = [
				'spikes', 'toxicspikes', 'stealthrock', 'hotcoals', 'stickyweb', 'permafrost', 'livewire', 'gmaxsteelsurge',
			];
			for (const targetCondition of removeTarget) {
				if (target.side.removeSideCondition(targetCondition)) {
					if (!removeAll.includes(targetCondition)) continue;
					this.add('-sideend', target.side, this.dex.conditions.get(targetCondition).name, '[from] move: Trancendent Sword', `[of] ${source}`);
					success = true;
				}
			}
			for (const sideCondition of removeAll) {
				if (source.side.removeSideCondition(sideCondition)) {
					this.add('-sideend', source.side, this.dex.conditions.get(sideCondition).name, '[from] move: Trancendent Sword', `[of] ${source}`);
					success = true;
				}
			}
			this.field.clearTerrain();
			return success;
		},
		secondary: undefined,
		target: "normal",
		type: "Steel",
	},
	kablow: {
		num: 0,
		accuracy: 100,
		basePower: 170,
		category: "Physical",
		name: "Kablow!",
		desc: "The user detonates to inflict damage on those around it. Rusty shrapnel is launched at the opponent.",
		shortDesc: "The user faints. Sets Spikes and Toxic Spikes layer.",
		pp: 5,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1, noparentalbond: 1 },
		onHit(target, source, move) {
			for (const side of source.side.foeSidesWithConditions()) {
				side.addSideCondition('spikes');
				side.addSideCondition('toxicspikes');
			}
		},
		selfdestruct: "always",
		secondary: undefined,
		target: "allAdjacent",
		type: "Steel",
	},
	granite: {
		num: 0,
		accuracy: 0,
		basePower: 0,
		category: "Status",
		name: "Granite",
		desc: "The user sets up a protective reinforcement for their side of the field. Lasts for 3 turns.",
		shortDesc: "Sets Reflect and Light Screen on user's side for 3 turns.",
		pp: 5,
		priority: 0,
		flags: { snatch: 1 },
		onHit(source) {
			const duration = source.item === 'lightclay' ? 7 : 4;
			if (source.side.addSideCondition('reflect')) source.side.sideConditions['reflect'].duration = duration;
			if (source.side.addSideCondition('lightscreen')) source.side.sideConditions['lightscreen'].duration = duration;
		},
		secondary: undefined,
		target: "self",
		type: "Rock",
	},
	tonic: {
		num: 0,
		accuracy: 100,
		basePower: 0,
		damage: 'level',
		category: "Special",
		name: "Tonic",
		desc: "The user drains life-force and shares it among your active mons. The power scales with the user's level.",
		shortDesc: "Does damage equal to the user's level. User recovers 50% of the damage dealt, split among alies.",
		onDamage(damage, target, source, effect) {
			if (damage) {
				const modifier = source.side.active.length;
				const healAmount = damage * 0.75;
				for (const pokemon of source.alliesAndSelf()) {
					this.heal(healAmount / modifier, pokemon, source, "drain");
				}
			}
		},
		pp: 10,
		priority: 0,
		flags: { contact: 1, protect: 1, mirror: 1 },
		secondary: undefined,
		target: "normal",
		type: "Water",
	},
	gale: {
		num: 0,
		accuracy: 100,
		basePower: 60,
		category: "Physical",
		name: "Gale",
		desc: "The user creates a shockwave eliminating traps and hazards. Raises the user's Speed stat.",
		shortDesc: "Free user from hazards/bind/Leech Seed; +1 Spe.",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1 },
		onAfterHit(target, pokemon, move) {
			if (!move.hasSheerForce) {
				for (const volatile of ['Leech Seed', 'Zealous Flock']) {
					if (pokemon.hp && pokemon.removeVolatile(this.dex.toID(volatile))) {
						this.add('-end', pokemon, volatile, '[from] move: Gale', `[of] ${pokemon}`);
					}
				}
				const sideConditions = [
					'spikes', 'toxicspikes', 'stealthrock', 'stickyweb', 'gmaxsteelsurge', 'hotcoals', 'permafrost', 'livewire',
				];
				for (const condition of sideConditions) {
					if (pokemon.hp && pokemon.side.removeSideCondition(condition)) {
						this.add('-sideend', pokemon.side, this.dex.conditions.get(condition).name, '[from] move: Gale', `[of] ${pokemon}`);
					}
				}
				if (pokemon.hp && pokemon.volatiles['partiallytrapped']) {
					pokemon.removeVolatile('partiallytrapped');
				}
			}
		},
		onAfterSubDamage(damage, target, pokemon, move) {
			if (!move.hasSheerForce) {
				for (const volatile of ['Leech Seed', 'Zealous Flock']) {
					if (pokemon.hp && pokemon.removeVolatile(this.dex.toID(volatile))) {
						this.add('-end', pokemon, volatile, '[from] move: Gale', `[of] ${pokemon}`);
					}
				}
				const sideConditions = [
					'spikes', 'toxicspikes', 'stealthrock', 'stickyweb', 'gmaxsteelsurge', 'hotcoals', 'permafrost', 'livewire',
				];
				for (const condition of sideConditions) {
					if (pokemon.hp && pokemon.side.removeSideCondition(condition)) {
						this.add('-sideend', pokemon.side, this.dex.conditions.get(condition).name, '[from] move: Gale', `[of] ${pokemon}`);
					}
				}
				if (pokemon.hp && pokemon.volatiles['partiallytrapped']) {
					pokemon.removeVolatile('partiallytrapped');
				}
			}
		},
		secondary: {
			chance: 100,
			self: {
				boosts: {
					spe: 1,
				},
			},
		},
		target: "normal",
		type: "Flying",
	},
	skydrop: {
		inherit: true,
		basePower: 75,
		isNonstandard: undefined,
		flags: { protect: 1, mirror: 1, nonsky: 1, metronome: 1 },
		volatileStatus: 'smackdown',
		condition: {
			noCopy: true,
			onStart(pokemon) {
				let applies = false;
				if (pokemon.hasType('Flying') || pokemon.hasAbility('levitate')) applies = true;
				if (pokemon.hasItem('ironball') || pokemon.volatiles['ingrain'] ||
					this.field.getPseudoWeather('gravity')) applies = false;
				if (pokemon.removeVolatile('fly') || pokemon.removeVolatile('bounce')) {
					applies = true;
					this.queue.cancelMove(pokemon);
					pokemon.removeVolatile('twoturnmove');
				}
				if (pokemon.volatiles['magnetrise']) {
					applies = true;
					delete pokemon.volatiles['magnetrise'];
				}
				if (pokemon.volatiles['telekinesis']) {
					applies = true;
					delete pokemon.volatiles['telekinesis'];
				}
				if (!applies) return false;
				this.add('-start', pokemon, 'Smack Down');
			},
			onRestart(pokemon) {
				if (pokemon.removeVolatile('fly') || pokemon.removeVolatile('bounce')) {
					this.queue.cancelMove(pokemon);
					pokemon.removeVolatile('twoturnmove');
					this.add('-start', pokemon, 'Smack Down');
				}
			},
		},
		onModifyMove(move, source) {},
		onMoveFail(target, source) {},
		onTry(source, target) {},
		onTryHit(target, source, move) {},
		onHit(target, source) {},
		desc: "This move can hit a target using Bounce, Fly, or Sky Drop, or is under the effect of Sky Drop. If this move hits a target under the effect of Bounce, Fly, Magnet Rise, or Telekinesis, the effect ends. If the target is a Flying type that has not used Roost this turn or a Pokemon with the Levitate Ability, it loses its immunity to Ground-type attacks and the Arena Trap Ability as long as it remains active. During the effect, Magnet Rise fails for the target and Telekinesis fails against the target.",
		shortDesc: "Removes the target's Ground immunity.",
	},
};
