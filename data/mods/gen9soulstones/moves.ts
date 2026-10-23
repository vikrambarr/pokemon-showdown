export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	dive: {
		inherit: true,
		condition: {
			duration: 2,
			onImmunity(type, pokemon) {
				if (type === 'sandstorm' || type === 'hail') return false;
			},
			onInvulnerability(target, source, move) {
				if (['surf', 'whirlpool', 'tidalwave'].includes(move.id)) {
					return;
				}
				return false;
			},
			onSourceModifyDamage(damage, source, target, move) {
				if (move.id === 'surf' || move.id === 'whirlpool' || move.id === 'tidalwave') {
					return this.chainModify(2);
				}
			},
		},
	},
	fly: {
		inherit: true,
		accuracy: 100,
		condition: {
			duration: 2,
			onInvulnerability(target, source, move) {
				if (['gust', 'twister', 'skyuppercut', 'thunder', 'hurricane', 'smackdown', 'thousandarrows'].includes(move.id)) {
					return;
				}
				return false;
			},
			onSourceModifyDamage(damage, source, target, move) {
				if (move.id === 'gust' || move.id === 'twister' || move.id === 'dragongale') {
					return this.chainModify(2);
				}
			},
		},
	},
	bounce: {
		inherit: true,
		accuracy: 100,
		basePower: 80,
		pp: 10,
		condition: {
			duration: 2,
			onInvulnerability(target, source, move) {
				if (['gust', 'twister', 'skyuppercut', 'thunder', 'hurricane', 'smackdown', 'thousandarrows'].includes(move.id)) {
					return;
				}
				return false;
			},
			onSourceBasePower(basePower, target, source, move) {
				if (move.id === 'gust' || move.id === 'twister' || move.id === 'dragongale') {
					return this.chainModify(2);
				}
			},
		},
	},
	geomancy: {
		inherit: true,
		flags: { nonsky: 1, metronome: 1, nosleeptalk: 1, failinstruct: 1 },
		onTryMove(attacker, defender, move) {},
		volatileStatus: 'geomancy',
		onTry(source, target, move) {
			if (source.volatiles['geomancy']) return false;
			if (source.volatiles['trapped']) {
				delete move.volatileStatus;
			}
		},
		condition: {
			onStart(pokemon) {
				this.add('-start', pokemon, 'move: Geomancy');
			},
			onTrapPokemon(pokemon) {
				pokemon.tryTrap();
			},
			onResidualOrder: 7,
			onResidual(pokemon) {
				this.heal(pokemon.baseMaxhp / 16);
			},
			onDragOut(pokemon) {
				this.add('-activate', pokemon, 'move: Geomancy');
				return null;
			},
		},
		boosts: {
			def: 1,
			spd: 1,
		},
		desc: "Raises the user's Defense and Sp. Def by 1. Ingrains User.",
		shortDesc: "Raises the user's Defense and Sp. Def by 1. Ingrains User.",
	},
	aurawheel: {
		inherit: true,
		basePower: 90,
		onTry(source) {},
		onModifyType(move, pokemon) {},
		onEffectiveness(typeMod, target, type, move) {
			return typeMod + this.dex.getEffectiveness('Dark', type);
		},
		type: "Light",
		desc: "Combines Dark in its type effectiveness.",
		shortDesc: "Combines Dark in its type effectiveness.",
	},
	laserfocus: {
		inherit: true,
		name: "Laser Focus",
		pp: 20,
		priority: 0,
		flags: { snatch: 1, metronome: 1 },
		sideCondition: 'laserfocus',
		condition: {
			duration: 4,
			onSideStart(side) {
				this.add('-sidestart', side, 'move: Laser Focus');
			},
			onModifyCritRatio(critRatio) {
				return 5;
			},
			onSideResidualOrder: 26,
			onSideResidualSubOrder: 2,
			onSideEnd(side) {
				this.add('-sideend', side, 'move: Laser Focus');
			},
		},
		target: "self",
		type: "Light",
		desc: "For 4 turns, allies have increased crit ratio.",
		shortDesc: "For 4 turns, allies have increased crit ratio.",
	},
	lusterpurge: {
		inherit: true,
		basePower: 140,
		secondary: undefined,
		onTry(source) {
			if (source.moveSlots.length < 2) return false;
			let hasLastResort = false;
			for (const moveSlot of source.moveSlots) {
				if (moveSlot.id === 'lastresort') {
					hasLastResort = true;
					continue;
				}
				if (!moveSlot.used) return false;
			}
			return hasLastResort;
		},
		type: "Light",
		desc: "Fails unless each known move has been used.",
		shortDesc: "Fails unless each known move has been used.",
	},
	prismaticlaser: {
		inherit: true,
		basePower: 80,
		flags: { protect: 1, mirror: 1, metronome: 1 },
		self: undefined,
		secondary: {
			chance: 20,
			onHit(target, source) {
				const status = this.sample(['brn', 'par', 'frz']);
				target.trySetStatus(status, source);
			},
		},
		target: "normal",
		type: "Light",
		desc: "20% chance to paralyze or burn or frostbite target.",
		shortDesc: "20% chance to paralyze or burn or frostbite target.",
	},
	lunardance: {
		inherit: true,
		flags: { snatch: 1, metronome: 1 },
		boosts: {
			spa: 1,
			spd: 1,
		},
		onTryHit(source) {},
		selfdestruct: undefined,
		slotCondition: undefined,
		condition: undefined,
		type: "Cosmic",
		desc: "Raises the user's Sp. Atk and Sp. Def by 1.",
		shortDesc: "Raises the user's Sp. Atk and Sp. Def by 1.",
	},
	meteorassault: {
		inherit: true,
		accuracy: 90,
		basePower: 110,
		pp: 10,
		flags: { protect: 1, mirror: 1, failinstruct: 1, gravity: 1 },
		hasCrashDamage: true,
		onMoveFail(target, source, move) {
			this.damage(source.baseMaxhp / 2, source, source, this.dex.conditions.get('Meteor Assault'));
		},
		self: undefined,
		type: "Cosmic",
		desc: "User is hurt by 50% of its max HP if it misses.",
		shortDesc: "User is hurt by 50% of its max HP if it misses.",
	},
	meteorbeam: {
		inherit: true,
		accuracy: 80,
		flags: { protect: 1, mirror: 1, metronome: 1 },
		secondary: {
			chance: 20,
			status: 'brn',
		},
		onTryMove(attacker, defender, move) {},
		type: "Cosmic",
		desc: "20% chance to burn the target.",
		shortDesc: "20% chance to burn the target.",
	},
	wish: {
		inherit: true,
		type: "Cosmic",
	},
	relicsong: {
		inherit: true,
		basePower: 80,
		secondary: undefined,
		onAfterMoveSecondarySelf(pokemon) {},
		target: "normal",
		type: "Sound",
		desc: "No additional effect.",
		shortDesc: "No additional effect.",
	},
	uproar: {
		inherit: true,
		basePower: 120,
		self: {
			volatileStatus: 'lockedmove',
		},
		onTryHit(target) {},
		condition: {},
		type: "Sound",
		shortDesc: "Lasts 2-3 turns. Confuses the user afterwards.",
	},
	darkvoid: {
		inherit: true,
		accuracy: 90,
		basePower: 95,
		category: "Special",
		flags: { protect: 1, mirror: 1, metronome: 1 },
		secondary: {
			chance: 10,
			status: 'slp',
		},
		onTry(source, target, move) {},
		desc: "10% to sleep target.",
		shortDesc: "10% to sleep target.",
	},
	magneticflux: {
		inherit: true,
		onHitSide(side, source, move) {
			const targets = side.allies().filter(ally => (
				ally.hasType(['Steel', 'Electric']) &&
				(!ally.volatiles['maxguard'] || this.runEvent('TryHit', ally, source, move))
			));
			if (!targets.length) return false;

			let didSomething = false;
			for (const target of targets) {
				didSomething = this.boost({ def: 1, spd: 1 }, target, source, move, false, true) || didSomething;
			}
			return didSomething;
		},
		desc: "Raises the Defense and Special Defense of Steel and Electric-type Pokemon on the user's side by 1 stage.",
		shortDesc: "Raises Def, Sp. Def of allies with Steel or Electric-type by 1.",
	},
	magnitude: {
		inherit: true,
		pp: 15,
		damage: 'level',
		onModifyMove(move, pokemon) {},
		onUseMoveMessage(pokemon, target, move) {},
		desc: "Damage equal to the user's level.",
		shortDesc: "Damage equal to the user's level.",
	},
	return: {
		inherit: true,
		basePower: 100,
		pp: 10,
		category: "Special",
		basePowerCallback(pokemon, target, move) { return 100; },
		onModifyMove(move, pokemon) {
			if (pokemon.getStat('atk', false, true) > pokemon.getStat('spa', false, true)) move.category = 'Physical';
		},
		desc: "Physical if user's Atk > Sp. Atk.",
		shortDesc: "Physical if user's Atk > Sp. Atk.",
	},
	frustration: {
		inherit: true,
		basePower: 100,
		pp: 10,
		category: "Special",
		basePowerCallback(pokemon, target, move) { return 100; },
		onModifyMove(move, pokemon) {
			if (pokemon.getStat('atk', false, true) > pokemon.getStat('spa', false, true)) move.category = 'Physical';
		},
		desc: "Physical if user's Atk > Sp. Atk.",
		shortDesc: "Physical if user's Atk > Sp. Atk.",
	},
	belch: {
		inherit: true,
		basePower: 65,
		onDisableMove(pokemon) {},
		onTry(source) {},
		basePowerCallback(pokemon, target, move) {
			if (pokemon.ateBerry) {
				this.debug('BP doubled from berry eaten');
				return move.basePower * 2;
			}
			return move.basePower;
		},
		shortDesc: "Power doubles if the user ate a berry.",
	},
	dreameater: {
		inherit: true,
		basePower: 50,
		flags: { protect: 1, mirror: 1, heal: 1, metronome: 1 },
		onTryImmunity(target) {},
		onModifyMove(move, pokemon, target) {
			if (!target) return;
			if (target.status === "slp") {
				move.drain = [1, 2];
			}
		},
		basePowerCallback(pokemon, target, move) {
			if (target.status === 'slp' || target.hasAbility('comatose')) {
				this.debug('BP doubled from sleep');
				return move.basePower * 2;
			}
			return move.basePower;
		},
		shortDesc: "If target asleep; 2x Power and recovers 50% of damage dealt.",
	},
	gearup: {
		inherit: true,
		onHitSide(side, source, move) {
			const targets = side.allies().filter(ally => (
				ally.hasType(['Steel', 'Electric']) &&
				(!ally.volatiles['maxguard'] || this.runEvent('TryHit', ally, source, move))
			));
			if (!targets.length) return false;

			let didSomething = false;
			for (const target of targets) {
				didSomething = this.boost({ atk: 1, spa: 1 }, target, source, move, false, true) || didSomething;
			}
			return didSomething;
		},
		desc: "Raises the Attack and Special Attack of Steel and Electric-type Pokemon on the user's side by 1 stage.",
		shortDesc: "Raises Atk, Sp. Atk of allies with Steel or Electric-type by 1.",
	},
	fishiousrend: {
		inherit: true,
		basePower: 70,
		basePowerCallback(pokemon, target, move) {
			if (target.newlySwitched || this.queue.willMove(target)) {
				this.debug('Fish Rend damage boost');
				return move.basePower * 1.5;
			}
			this.debug('Fish Rend NOT boosted');
			return move.basePower;
		},
		desc: "1.5x power if the user moves before the target.",
		shortDesc: "1.5x power if user moves before the target.",
	},
	attackorder: {
		inherit: true,
		basePower: 20,
		pp: 10,
		basePowerCallback(pokemon, target, move) {
			const bp = move.basePower + 20 * pokemon.positiveBoosts();
			this.debug(`BP: ${bp}`);
			return bp;
		},
		critRatio: undefined,
		desc: "Power is equal to 20+(X*20), where X is the user's total stat stage changes that are greater than 0.",
		shortDesc: " + 20 power for each of the user's stat boosts.",
	},
	rollingkick: {
		inherit: true,
		accuracy: 90,
		basePower: 40,
		pp: 20,
		secondary: undefined,
		basePowerCallback(pokemon, target, move) {
			let bp = move.basePower;
			const fireballData = pokemon.volatiles['rollingkick'];
			if (fireballData?.hitCount) {
				bp *= 2 ** fireballData.contactHitCount;
			}
			if (fireballData && pokemon.status !== 'slp') {
				fireballData.hitCount++;
				fireballData.contactHitCount++;
				if (fireballData.hitCount < 5) {
					fireballData.duration = 2;
				}
			}
			if (pokemon.volatiles['defensecurl']) {
				bp *= 2;
			}
			this.debug(`BP: ${bp}`);
			return bp;
		},
		flags: { contact: 1, protect: 1, mirror: 1, metronome: 1, failinstruct: 1, noparentalbond: 1 },
		onModifyMove(move, pokemon, target) {
			if (pokemon.volatiles['rollingkick'] || pokemon.status === 'slp' || !target) return;
			pokemon.addVolatile('rollingkick');
			if (move.sourceEffect) pokemon.lastMoveTargetLoc = pokemon.getLocOf(target);
		},
		onAfterMove(source, target, move) {
			const fireballData = source.volatiles["rollingkick"];
			if (
				fireballData?.hitCount === 5 &&
				fireballData.contactHitCount < 5
			) {
				source.addVolatile("rolloutstorage");
				source.volatiles["rolloutstorage"].contactHitCount =
					fireballData.contactHitCount;
			}
		},
		condition: {
			duration: 1,
			onLockMove: 'rollingkick',
			onStart() {
				this.effectState.hitCount = 0;
				this.effectState.contactHitCount = 0;
			},
			onResidual(target) {
				if (target.lastMove?.id === 'struggle') {
					delete target.volatiles['rollingkick'];
				}
			},
		},
		desc: "If this move is successful, the user is locked into this move and cannot make another move until it misses, 5 turns have passed, or the attack cannot be used. Power doubles with each successful hit of this move and doubles again if Defense Curl was used previously by the user. If this move is called by Sleep Talk, the move is used for one turn.",
		shortDesc: "Power doubles with each hit. Repeats for 5 turns.",
	},
	flameburst: {
		inherit: true,
		accuracy: true,
		name: "Flame Burst",
		pp: 15,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1, bullet: 1, defrost: 1 },
		onHit(target, source, move) {},
		onAfterSubDamage(damage, target, source, move) {},
		target: "allAdjacentFoes",
		desc: "No additional effect.",
		shortDesc: "No additional effect.",
	},
	aeroblast: {
		inherit: true,
		accuracy: 100,
		basePower: 80,
		category: "Physical",
		pp: 15,
		flags: { protect: 1, mirror: 1, distance: 1, metronome: 1, wind: 1 },
		condition: {
			duration: 4,
			onStart(target) {
				this.add('-start', target, 'Aeroblast', '[silent]');
			},
			onDisableMove(pokemon) {
				for (const moveSlot of pokemon.moveSlots) {
					if (this.dex.moves.get(moveSlot.id).flags['sound']) {
						pokemon.disableMove(moveSlot.id);
					}
				}
			},
			onBeforeMovePriority: 6,
			onBeforeMove(pokemon, target, move) {
				if (!move.isZOrMaxPowered && move.flags['sound']) {
					this.add('cant', pokemon, 'move: Aeroblast');
					return false;
				}
			},
			onModifyMove(move, pokemon, target) {
				if (!move.isZOrMaxPowered && move.flags['sound']) {
					this.add('cant', pokemon, 'move: Aeroblast');
					return false;
				}
			},
			onResidualOrder: 22,
			onEnd(target) {
				this.add('-end', target, 'Aeroblast', '[silent]');
			},
		},
		secondary: {
			chance: 100,
			onHit(target) {
				target.addVolatile('aeroblast');
			},
		},
		critRatio: undefined,
		desc: "For 4 turns, the target cannot use sound-based moves.",
		shortDesc: "For 4 turns, the target cannot use sound moves.",
	},
	highhorsepower: {
		inherit: true,
		accuracy: 100,
		basePower: 55,
		pp: 15,
		basePowerCallback(pokemon, target, move) {
			if (!pokemon.item) {
				this.debug("BP doubled for no item");
				return move.basePower * 2;
			}
			return move.basePower;
		},
		desc: "Power doubles if the user has no held item.",
		shortDesc: "Power doubles if the user has no held item.",
	},
	snaptrap: {
		inherit: true,
		basePower: 40,
		pp: 20,
		flags: { contact: 1, protect: 1, mirror: 1, metronome: 1 },
		volatileStatus: undefined,
		type: "Steel",
		basePowerCallback(pokemon, target, move) {
			if (target.beingCalledBack || target.switchFlag) {
				this.debug('Snap Trap damage boost');
				return move.basePower * 2;
			}
			return move.basePower;
		},
		beforeTurnCallback(pokemon) {
			for (const target of pokemon.foes()) {
				target.addVolatile('snaptrap');
				const data = target.volatiles['snaptrap'];
				if (!data.sources) {
					data.sources = [];
				}
				data.sources.push(pokemon);
			}
		},
		onModifyMove(move, source, target) {
			if (target?.beingCalledBack || target?.switchFlag) move.accuracy = true;
		},
		condition: {
			duration: 1,
			onBeforeSwitchOut(pokemon) {
				this.debug('Snap Trap start');
				let alreadyAdded = false;
				pokemon.removeVolatile('destinybond');
				for (const source of this.effectState.sources) {
					if (!source.isAdjacent(pokemon) || !this.queue.cancelMove(source) || !source.hp) continue;
					if (!alreadyAdded) {
						this.add('-activate', pokemon, 'move: Snap Trap');
						alreadyAdded = true;
					}
					if (source.canMegaEvo || source.canUltraBurst || source.canTerastallize) {
						for (const [actionIndex, action] of this.queue.entries()) {
							if (action.pokemon === source) {
								if (action.choice === 'megaEvo') {
									this.actions.runMegaEvo(source);
								} else if (action.choice === 'terastallize') {
									this.actions.terastallize(source);
								} else {
									continue;
								}
								this.queue.list.splice(actionIndex, 1);
								break;
							}
						}
					}
					this.actions.runMove('snaptrap', source, source.getLocOf(pokemon));
				}
			},
		},
		desc: "If an opposing Pokemon switches out this turn, this move hits that Pokemon before it leaves the field, even if it was not the original target. If the user moves after an opponent using Flip Turn, Parting Shot, Teleport, U-turn, or Volt Switch, but not Baton Pass, it will hit that opponent before it leaves the field. Power doubles and no accuracy check is done if the user hits an opponent switching out, and the user's turn is over; if an opponent faints from this, the replacement Pokemon does not become active until the end of the turn.",
		shortDesc: "If a foe is switching out, hits it at 2x power.",
	},
	eggbomb: {
		inherit: true,
		accuracy: 100,
		basePower: 90,
		onTryHit(target, source, move) {
			if (source.isAlly(target)) {
				move.basePower = 0;
				move.infiltrates = true;
			}
		},
		onTryMove(source, target, move) {
			if (source.isAlly(target) && source.volatiles['healblock']) {
				this.attrLastMove('[still]');
				this.add('cant', source, 'move: Heal Block', move);
				return false;
			}
		},
		onHit(target, source, move) {
			if (source.isAlly(target)) {
				if (!this.heal(Math.floor(target.baseMaxhp * 0.5))) {
					return this.NOT_FAIL;
				}
			}
		},
		desc: "If the target is an ally, this move restores 1/2 of its maximum HP, rounded down, instead of dealing damage.",
		shortDesc: "If the target is an ally, heals 50% of its max HP.",
	},
	poltergeist: {
		inherit: true,
		onTry(source, target) {},
		onTryHit(target, source, move) {},
		onBasePower(basePower, source, target, move) {
			if (!target.getItem().id) return this.chainModify(0.5);
		},
		shortDesc: "0.5x power if the target has no held item.",
	},
	steelroller: {
		inherit: true,
		onTry() {},
		onHit() {
			this.field.clearTerrain();
		},
		onAfterSubDamage() {
			this.field.clearTerrain();
		},
		onBasePower(basePower, source, target, move) {
			if (this.field.terrain) return this.chainModify(0.5);
		},
		desc: "Half power if there is no terrain active. Ends the effects of Electric Terrain, Grassy Terrain, Misty Terrain, and Psychic Terrain.",
		shortDesc: "0.5x power if there is no terrain active. Ends the terrain.",
	},
	burningbulwark: {
		inherit: true,
		pp: 5,
		condition: {
			duration: 1,
			onStart(target) {
				this.add('-singleturn', target, 'move: Protect');
			},
			onTryHitPriority: 3,
			onTryHit(target, source, move) {
				if (this.checkMoveBypassesProtect(move, source, target, false)) return;
				if (move.smartTarget) {
					move.smartTarget = false;
				} else {
					this.add('-activate', target, 'move: Protect');
				}
				const lockedmove = source.getVolatile('lockedmove');
				if (lockedmove) {
					if (source.volatiles['lockedmove'].duration === 2) {
						delete source.volatiles['lockedmove'];
					}
				}
				if (move.category === 'Physical') {
					source.trySetStatus('brn', target);
				}
				return this.NOT_FAIL;
			},
			onHit(target, source, move) {
				if (move.isZOrMaxPowered && move.category === 'Physical') {
					source.trySetStatus('brn', target);
				}
			},
		},
		desc: "The user is protected from most attacks made by other Pokemon during this turn, and Pokemon using physical moves against the user become burned. Non-damaging moves go through this protection. This move has a 1/X chance of being successful, where X starts at 1 and triples each time this move is successfully used. X resets to 1 if this move fails, if the user's last move used is not Baneful Bunker, Burning Bulwark, Detect, Endure, King's Shield, Max Guard, Obstruct, Protect, Quick Guard, Silk Trap, Spiky Shield, or Wide Guard, or if it was one of those moves and the user's protection was broken. Fails if the user moves last this turn.",
		shortDesc: "Protects from damaging attacks. Physical: burn.",
	},
	grassyterrain: {
		inherit: true,
		condition: {
			inherit: true,
			onBasePower(basePower, attacker, defender, move) {
				const weakenedMoves = ['earthquake', 'bulldoze', 'magnitude'];
				if (weakenedMoves.includes(move.id) && defender.isGrounded() && !defender.isSemiInvulnerable()) {
					this.debug('move weakened by grassy terrain');
					return this.chainModify(0.5);
				}
				if (move.type === 'Grass' && attacker.isGrounded()) {
					this.debug('grassy terrain boost');
					return this.chainModify(1.5);
				}
			},
		},
	},
	electricterrain: {
		inherit: true,
		condition: {
			inherit: true,
			onBasePower(basePower, attacker, defender, move) {
				if (move.type === 'Electric' && attacker.isGrounded() && !attacker.isSemiInvulnerable()) {
					this.debug('electric terrain boost');
					return this.chainModify(1.5);
				}
			},
		},
	},
	psychicterrain: {
		inherit: true,
		condition: {
			inherit: true,
			onBasePower(basePower, attacker, defender, move) {
				if (move.type === 'Psychic' && attacker.isGrounded() && !attacker.isSemiInvulnerable()) {
					this.debug('psychic terrain boost');
					return this.chainModify(1.5);
				}
			},
		},
	},
	thousandarrows: {
		inherit: true,
		onModifyMove(move, pokemon, target) {
			if (target?.hasType('Cosmic') && move.type === 'Ground') {
				move.ignoreImmunity = false;
			}
		},
		onEffectiveness(typeMod, target, type, move) {
			if (move.type !== 'Ground') return;
			if (!target) return;
			if (!target.runImmunity('Ground')) {
				if (target.hasType('Flying')) return 0;
			}
		},
	},
	submerge: {
		num: 0,
		basePower: 80,
		accuracy: 100,
		category: "Physical",
		name: "Submerge",
		pp: 10,
		priority: 0,
		flags: { contact: 1, charge: 1, protect: 1, mirror: 1,
			nonsky: 1, allyanim: 1, metronome: 1, nosleeptalk: 1, noassist: 1, failinstruct: 1 },
		onTryMove(attacker, defender, move) {
			if (attacker.removeVolatile(move.id)) {
				return;
			}
			if (attacker.hasAbility('gulpmissile') && attacker.species.name === 'Cramorant' && !attacker.transformed) {
				const forme = attacker.hp <= attacker.maxhp / 2 ? 'cramorantgorging' : 'cramorantgulping';
				attacker.formeChange(forme, move);
			}
			this.add('-prepare', attacker, move.name);
			if (!this.runEvent('ChargeMove', attacker, defender, move)) {
				return;
			}
			attacker.addVolatile('twoturnmove', defender);
			return null;
		},
		condition: {
			duration: 2,
			onImmunity(type, pokemon) {
				if (type === 'sandstorm' || type === 'hail') return false;
			},
			onInvulnerability(target, source, move) {
				if (['surf', 'whirlpool', 'tidalwave'].includes(move.id)) {
					return;
				}
				return false;
			},
			onSourceModifyDamage(damage, source, target, move) {
				if (move.id === 'surf' || move.id === 'whirlpool' || move.id === 'tidalwave') {
					return this.chainModify(2);
				}
			},
		},
		target: "normal",
		type: "Water",
		contestType: "Tough",
		shortDesc: "Dives underwater turn 1, strikes turn 2.",
	},
	blackhole: {
		num: 0,
		basePower: 90,
		accuracy: 100,
		category: "Special",
		name: "Black Hole",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		volatileStatus: 'blackhole',
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
				this.add('-start', pokemon, 'Black Hole');
			},
			onRestart(pokemon) {
				if (pokemon.removeVolatile('fly') || pokemon.removeVolatile('bounce')) {
					this.queue.cancelMove(pokemon);
					pokemon.removeVolatile('twoturnmove');
					this.add('-start', pokemon, 'Black Hole');
				}
			},
		},
		target: "allAdjacentFoes",
		type: "Cosmic",
		contestType: "Tough",
		shortDesc: "Grounds target.",
	},
	blackout: {
		num: 0,
		basePower: 0,
		accuracy: true,
		category: "Status",
		name: "Blackout",
		pp: 15,
		priority: 0,
		flags: { metronome: 1 },
		pseudoWeather: 'blackout',
		condition: {
			duration: 5,
			onFieldStart(field, source) {
				this.add('-fieldstart', 'move: Blackout', `[of] ${source}`);
			},
			onBasePowerPriority: 1,
			onBasePower(basePower, attacker, defender, move) {
				if (move.type === 'Light') {
					this.debug('blackout weaken');
					return this.chainModify([1352, 4096]);
				}
			},
			onFieldResidualOrder: 27,
			onFieldResidualSubOrder: 3,
			onFieldEnd() {
				this.add('-fieldend', 'move: Blackout');
			},
		},
		target: "all",
		type: "Dark",
		contestType: "Tough",
		shortDesc: "For 5 turns, Light-type attacks have 1/3 power.",
	},
	dragonmagic: {
		num: 0,
		basePower: 0,
		accuracy: 75,
		category: "Status",
		name: "Dragon Magic",
		pp: 20,
		priority: 0,
		flags: { metronome: 1, sound: 1, protect: 1, mirror: 1 },
		secondary: {
			chance: 100,
			onHit(target, source) {
				const status = this.sample(['psn', 'par', 'slp', 'brn', 'frz']);
				target.trySetStatus(status, source);
			},
		},
		target: "normal",
		type: "Dragon",
		contestType: "Tough",
		shortDesc: "100% to inflict random status condition",
	},
	changelings: {
		num: 0,
		basePower: 0,
		accuracy: true,
		category: "Status",
		name: "Changelings",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		onHit(target, source) {
			const targetBoosts: SparseBoostsTable = {};
			const sourceBoosts: SparseBoostsTable = {};

			const statIDs: BoostID[] = ['atk', 'def', 'spa', 'spd', 'spe'];
			for (const stat of statIDs) {
				targetBoosts[stat] = target.boosts[stat];
				sourceBoosts[stat] = source.boosts[stat];
			}

			source.setBoost(targetBoosts);
			target.setBoost(sourceBoosts);

			this.add('-swapboost', source, target, 'atk, def, spa, spd, spe', '[from] move: Changelings');
		},
		target: "normal",
		type: "Fairy",
		contestType: "Tough",
		shortDesc: "Swaps stat stages with target.",
	},
	peekaboo: {
		num: 0,
		basePower: 40,
		accuracy: 100,
		category: "Special",
		name: "Peekaboo",
		pp: 10,
		priority: 3,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1 },
		onTry(source) {
			if (source.activeMoveActions > 1) {
				this.hint("Peekaboo only works on your first turn out.");
				return false;
			}
		},
		secondary: {
			chance: 100,
			volatileStatus: 'flinch',
		},
		target: "normal",
		type: "Fairy",
		contestType: "Tough",
		shortDesc: "Hits first. First turn out only. 100% flinch chance.",
	},
	wildimagination: {
		num: 0,
		basePower: 0,
		accuracy: true,
		category: "Status",
		name: "Wild Imagination",
		pp: 30,
		priority: 0,
		flags: { metronome: 1, snatch: 1 },
		onHit(pokemon) {
			const goodStat = pokemon.getBestStat(true, true);

			let badStat: StatIDExceptHP = 'atk';
			let badStatVal = pokemon.getStat(goodStat, true, true);
			const stats: StatIDExceptHP[] = ['atk', 'def', 'spa', 'spd', 'spe'];
			for (const i of stats) {
				if (pokemon.getStat(i, true, true) < badStatVal) {
					badStat = i;
					badStatVal = pokemon.getStat(i, true, true);
				}
			}

			if (pokemon.boosts[goodStat] >= 6 && pokemon.boosts[badStat] <= -6) return false;
			this.boost({ [goodStat]: 1, [badStat]: 1 }, pokemon);
		},
		target: "adjacentAllyOrSelf",
		type: "Fairy",
		contestType: "Tough",
		shortDesc: "Raises user's lowest and highest stats by 1 stage.",
	},
	fireball: {
		accuracy: 90,
		basePower: 40,
		basePowerCallback(pokemon, target, move) {
			let bp = move.basePower;
			const fireballData = pokemon.volatiles['fireball'];
			if (fireballData?.hitCount) {
				bp *= 2 ** fireballData.contactHitCount;
			}
			if (fireballData && pokemon.status !== 'slp') {
				fireballData.hitCount++;
				fireballData.contactHitCount++;
				if (fireballData.hitCount < 5) {
					fireballData.duration = 2;
				}
			}
			if (pokemon.volatiles['defensecurl']) {
				bp *= 2;
			}
			this.debug(`BP: ${bp}`);
			return bp;
		},
		category: "Physical",
		name: "Fire Ball",
		pp: 20,
		priority: 0,
		flags: { contact: 1, protect: 1, mirror: 1, metronome: 1, failinstruct: 1, noparentalbond: 1 },
		onModifyMove(move, pokemon, target) {
			if (pokemon.volatiles['fireball'] || pokemon.status === 'slp' || !target) return;
			pokemon.addVolatile('fireball');
			if (move.sourceEffect) pokemon.lastMoveTargetLoc = pokemon.getLocOf(target);
		},
		onAfterMove(source, target, move) {
			const fireballData = source.volatiles["fireball"];
			if (
				fireballData?.hitCount === 5 &&
				fireballData.contactHitCount < 5
			) {
				source.addVolatile("rolloutstorage");
				source.volatiles["rolloutstorage"].contactHitCount =
					fireballData.contactHitCount;
			}
		},
		condition: {
			duration: 1,
			onLockMove: 'fireball',
			onStart() {
				this.effectState.hitCount = 0;
				this.effectState.contactHitCount = 0;
			},
			onResidual(target) {
				if (target.lastMove?.id === 'struggle') {
					delete target.volatiles['fireball'];
				}
			},
		},
		target: "normal",
		type: "Fire",
		desc: "If this move is successful, the user is locked into this move and cannot make another move until it misses, 5 turns have passed, or the attack cannot be used. Power doubles with each successful hit of this move and doubles again if Defense Curl was used previously by the user. If this move is called by Sleep Talk, the move is used for one turn.",
		shortDesc: "Power doubles with each hit. Repeats for 5 turns.",
	},
	edenfruit: {
		num: 0,
		basePower: 0,
		accuracy: true,
		category: "Status",
		name: "Eden Fruit",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, snatch: 1 },
		volatileStatus: 'edenfruit',
		onTry(source, target, move) {
			if (source.volatiles['edenfruit']) return false;
			if (source.volatiles['trapped']) {
				delete move.volatileStatus;
			}
		},
		condition: {
			onStart(pokemon) {
				this.add('-start', pokemon, 'move: Geomancy');
			},
			onTrapPokemon(pokemon) {
				pokemon.tryTrap();
			},
			onResidualOrder: 7,
			onResidual(pokemon) {
				this.heal(pokemon.baseMaxhp / 16);
			},
			onDragOut(pokemon) {
				this.add('-activate', pokemon, 'move: Eden Fruit');
				return null;
			},
		},
		boosts: {
			def: 1,
			spd: 1,
		},
		target: "self",
		type: "Grass",
		contestType: "Tough",
		shortDesc: "Raises the user's Defense and Sp. Def by 1. Ingrains User.",
	},
	continentalrift: {
		num: 0,
		basePower: 100,
		accuracy: 90,
		category: "Physical",
		name: "Continental Rift",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1 },
		onModifyMove(move, pokemon, target) {
			if (!target) return;
			const atk = pokemon.getStat('atk', false, true);
			const spa = pokemon.getStat('spa', false, true);
			const def = target.getStat('def', false, true);
			const spd = target.getStat('spd', false, true);
			const physical = Math.floor(Math.floor(Math.floor(Math.floor(2 * pokemon.level / 5 + 2) * 90 * atk) / def) / 50);
			const special = Math.floor(Math.floor(Math.floor(Math.floor(2 * pokemon.level / 5 + 2) * 90 * spa) / spd) / 50);
			if (physical < special || (physical === special && this.randomChance(1, 2))) {
				move.category = 'Special';
			}
		},
		ignoreAbility: true,
		target: "normal",
		type: "Ground",
		contestType: "Tough",
		shortDesc: "Ignores the Abilities of other Pokemon. Special if would be stronger.",
	},
	seismicshift: {
		num: 0,
		basePower: 1,
		accuracy: 100,
		category: "Special",
		name: "Seismic Shift",
		pp: 20,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		basePowerCallback(pokemon, target) {
			const targetWeight = target.getWeight();
			let bp;
			if (targetWeight >= 2000) {
				bp = 120;
			} else if (targetWeight >= 1000) {
				bp = 100;
			} else if (targetWeight >= 500) {
				bp = 80;
			} else if (targetWeight >= 250) {
				bp = 60;
			} else if (targetWeight >= 100) {
				bp = 40;
			} else {
				bp = 20;
			}
			this.debug(`BP: ${bp}`);
			return bp;
		},
		target: "normal",
		type: "Ground",
		contestType: "Tough",
		shortDesc: "More power the heavier the target.",
	},
	frozenheart: {
		num: 0,
		basePower: 0,
		accuracy: true,
		category: "Status",
		name: "Frozen Heart",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, snatch: 1 },
		onHit(target, source, move) {
			this.add('-activate', source, 'move: Aromatherapy');
			let success = false;
			const allies = [...target.side.pokemon, ...target.side.allySide?.pokemon || []];
			for (const ally of allies) {
				if (ally !== source && !this.suppressingAbility(ally)) {
					if (ally.hasAbility('goodasgold')) {
						this.add('-immune', ally, '[from] ability: Good as Gold');
						continue;
					}
					if (ally.volatiles['substitute'] && !move.infiltrates) continue;
				}
				if (ally.cureStatus()) success = true;
			}
			return success;
		},
		target: "allySide",
		type: "Ice",
		contestType: "Tough",
		shortDesc: "Cures the user's party of all status conditions.",
	},
	hallowedground: {
		num: 0,
		basePower: 0,
		accuracy: true,
		category: "Status",
		name: "Hallowed Ground",
		pp: 10,
		priority: 0,
		flags: { snatch: 1, nonsky: 1, noassist: 1, failcopycat: 1 },
		stallingMove: true,
		sideCondition: 'hallowedground',
		onTry(source) {
			if (source.activeMoveActions > 1) {
				this.hint("Hallowed Ground only works on your first turn out.");
				return false;
			}
			return !!this.queue.willAct();
		},
		condition: {
			duration: 1,
			onSideStart(target, source) {
				this.add('-singleturn', source, 'Hallowed Ground');
			},
			onTryHitPriority: 3,
			onTryHit(target, source, move) {
				if (move.target === 'self') return;
				if (this.checkMoveBypassesProtect(move, source, target, false)) return;
				this.add('-activate', target, 'move: Hallowed Ground', move.name);
				const lockedmove = source.getVolatile('lockedmove');
				if (lockedmove) {
					if (source.volatiles['lockedmove'].duration === 2) {
						delete source.volatiles['lockedmove'];
					}
				}
				return this.NOT_FAIL;
			},
		},
		target: "allySide",
		type: "Light",
		contestType: "Tough",
		shortDesc: "Protects allies from damaging attacks. Turn 1 only.",
	},
	luminousblade: {
		num: 0,
		basePower: 125,
		accuracy: 100,
		category: "Physical",
		name: "Luminous Blade",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1, slicing: 1 },
		onTryMove(attacker, defender, move) {
			if (attacker.removeVolatile(move.id)) {
				return;
			}
			this.add('-prepare', attacker, move.name);
			if (['sunnyday', 'desolateland'].includes(attacker.effectiveWeather(undefined, true))) {
				this.attrLastMove('[still]');
				this.addMove('-anim', attacker, move.name, defender);
				return;
			}
			if (!this.runEvent('ChargeMove', attacker, defender, move)) {
				return;
			}
			attacker.addVolatile('twoturnmove', defender);
			return null;
		},
		target: "normal",
		type: "Light",
		contestType: "Tough",
		shortDesc: "Charges turn 1. Hits turn 2. No charge in sunlight.",
	},
	repentance: {
		num: 0,
		basePower: 0,
		accuracy: true,
		category: "Status",
		name: "Repentance",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, sound: 1, snatch: 1 },
		onHit(target) {
			if (target.hp <= target.maxhp / 2 || target.boosts.spa >= 6 || target.maxhp === 1) {
				return false;
			}
			this.directDamage(target.maxhp / 2);
			this.boost({ spa: 12 }, target);
		},
		target: "self",
		type: "Light",
		contestType: "Tough",
		shortDesc: "User loses 50% max HP. Maximizes Sp. Atk.",
	},
	curbstomp: {
		num: 0,
		basePower: 1,
		accuracy: 100,
		category: "Physical",
		name: "Curb Stomp",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1 },
		basePowerCallback(pokemon, target) {
			const targetWeight = target.getWeight();
			const pokemonWeight = pokemon.getWeight();
			let bp;
			if (pokemonWeight >= targetWeight * 5) {
				bp = 120;
			} else if (pokemonWeight >= targetWeight * 4) {
				bp = 100;
			} else if (pokemonWeight >= targetWeight * 3) {
				bp = 80;
			} else if (pokemonWeight >= targetWeight * 2) {
				bp = 60;
			} else {
				bp = 40;
			}
			this.debug(`BP: ${bp}`);
			return bp;
		},
		target: "normal",
		type: "Normal",
		contestType: "Tough",
		shortDesc: "More power the heavier the user than the target.",
	},
	genesis: {
		num: 0,
		basePower: 100,
		accuracy: 90,
		category: "Special",
		name: "Genesis",
		pp: 5,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		onAfterMoveSecondarySelf(pokemon, target, move) {
			if (!target || target.fainted || target.hp <= 0) {
				if (this.field.weather && this.field.weatherState.duration) this.field.weatherState.duration += 1;
				if (this.field.terrain && this.field.terrainState.duration) this.field.terrainState.duration += 1;
			};
		},
		target: "normal",
		type: "Normal",
		contestType: "Tough",
		shortDesc: "Extends weather/terrain duration by 1 turn on KO.",
	},
	powernap: {
		num: 0,
		basePower: 0,
		accuracy: true,
		category: "Status",
		name: "Power Nap",
		pp: 5,
		priority: 0,
		flags: { metronome: 1, snatch: 1 },
		onHit(target, source) {
			this.add('-activate', source, 'move: Heal Bell');
			let success = false;
			const allies = [...target.side.pokemon, ...target.side.allySide?.pokemon || []];
			for (const ally of allies) {
				if (ally !== source && !this.suppressingAbility(ally)) {
					if (ally.hasAbility('goodasgold')) {
						this.add('-immune', ally, '[from] ability: Good as Gold');
						continue;
					}
				}
				if (ally.cureStatus()) success = true;
			}
			return success;
		},
		target: "allyTeam",
		type: "Normal",
		contestType: "Tough",
		shortDesc: "Cures the user's party of all status conditions.",
	},
	shutdown: {
		num: 0,
		basePower: 40,
		accuracy: 100,
		category: "Physical",
		name: "Shutdown",
		pp: 10,
		priority: 3,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1 },
		onTry(source) {
			if (source.activeMoveActions > 1) {
				this.hint("Shutdown only works on your first turn out.");
				return false;
			}
		},
		secondary: {
			chance: 100,
			volatileStatus: 'flinch',
		},
		target: "normal",
		type: "Normal",
		contestType: "Tough",
		shortDesc: "Hits first. First turn out only. 100% flinch chance.",
	},
	checkmate: {
		num: 0,
		basePower: 50,
		accuracy: 100,
		category: "Special",
		name: "Checkmate",
		pp: 25,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		onAfterMoveSecondarySelf(pokemon, target, move) {
			if (!target || target.fainted || target.hp <= 0) this.boost({ spa: 2 }, pokemon, pokemon, move);
		},
		target: "normal",
		type: "Psychic",
		contestType: "Tough",
		shortDesc: "Raises user's Sp. Atk by 2 if this KOes the target.",
	},
	gemstorm: {
		num: 0,
		basePower: 110,
		accuracy: 70,
		category: "Special",
		name: "Gem Storm",
		pp: 5,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		onModifyMove(move) {
			if (this.field.isWeather('sandstorm')) move.accuracy = true;
		},
		target: "allAdjacentFoes",
		type: "Rock",
		contestType: "Tough",
		shortDesc: "Can't miss in Sandstorm.",
	},
	schizophrenia: {
		num: 0,
		basePower: 0,
		accuracy: true,
		category: "Status",
		name: "Schizophrenia",
		pp: 30,
		priority: 0,
		flags: { metronome: 1, sound: 1, snatch: 1 },
		onHit(pokemon) {
			const goodStat = pokemon.getBestStat(true, true);

			let badStat: StatIDExceptHP = 'atk';
			let badStatVal = pokemon.getStat(goodStat, true, true);
			const stats: StatIDExceptHP[] = ['atk', 'def', 'spa', 'spd', 'spe'];
			for (const i of stats) {
				if (pokemon.getStat(i, true, true) < badStatVal) {
					badStat = i;
					badStatVal = pokemon.getStat(i, true, true);
				}
			}

			if (pokemon.boosts[goodStat] >= 6 && pokemon.boosts[badStat] <= -6) return false;
			this.boost({ [goodStat]: 1, [badStat]: 1 }, pokemon);
		},
		target: "adjacentAllyOrSelf",
		type: "Sound",
		contestType: "Tough",
		shortDesc: "Raises user's lowest and highest stats by 1 stage.",
	},
	staccato: {
		num: 0,
		basePower: 40,
		accuracy: 100,
		category: "Special",
		name: "Staccato",
		pp: 30,
		priority: 3,
		flags: { metronome: 1, protect: 1, mirror: 1, sound: 1 },
		onTry(source) {
			if (source.activeMoveActions > 1) {
				this.hint("Staccato only works on your first turn out.");
				return false;
			}
		},
		secondary: {
			chance: 100,
			volatileStatus: 'flinch',
		},
		target: "normal",
		type: "Sound",
		contestType: "Tough",
		shortDesc: "Hits first. First turn out only. 100% flinch chance.",
	},
	wail: {
		num: 0,
		basePower: 75,
		accuracy: 100,
		category: "Physical",
		name: "Wail",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1, sound: 1 },
		onBasePower(basePower, source) {
			if (source.statsLoweredThisTurn) {
				this.debug('wail buff');
				return this.chainModify(2);
			}
		},
		target: "normal",
		type: "Sound",
		contestType: "Tough",
		shortDesc: "2x power if the user had a stat lowered this turn.",
	},
	concoction: {
		num: 0,
		basePower: 100,
		accuracy: 90,
		category: "Physical",
		name: "Concoction",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		onModifyMove(move, pokemon, target) {
			if (!target) return;
			const atk = pokemon.getStat('atk', false, true);
			const spa = pokemon.getStat('spa', false, true);
			const def = target.getStat('def', false, true);
			const spd = target.getStat('spd', false, true);
			const physical = Math.floor(Math.floor(Math.floor(Math.floor(2 * pokemon.level / 5 + 2) * 90 * atk) / def) / 50);
			const special = Math.floor(Math.floor(Math.floor(Math.floor(2 * pokemon.level / 5 + 2) * 90 * spa) / spd) / 50);
			if (physical < special || (physical === special && this.randomChance(1, 2))) {
				move.category = 'Special';
			}
		},
		target: "normal",
		type: "Poison",
		contestType: "Tough",
		shortDesc: "Special if would be stronger.",
	},
	bombardment: {
		num: 0,
		basePower: 100,
		accuracy: 90,
		category: "Physical",
		name: "Bombardment",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1, bullet: 1 },
		onModifyMove(move, pokemon, target) {
			if (!target) return;
			const atk = pokemon.getStat('atk', false, true);
			const spa = pokemon.getStat('spa', false, true);
			const def = target.getStat('def', false, true);
			const spd = target.getStat('spd', false, true);
			const physical = Math.floor(Math.floor(Math.floor(Math.floor(2 * pokemon.level / 5 + 2) * 90 * atk) / def) / 50);
			const special = Math.floor(Math.floor(Math.floor(Math.floor(2 * pokemon.level / 5 + 2) * 90 * spa) / spd) / 50);
			if (physical < special || (physical === special && this.randomChance(1, 2))) {
				move.category = 'Special';
			}
		},
		target: "normal",
		type: "Steel",
		contestType: "Tough",
		shortDesc: "Special if would be stronger.",
	},
	gravitypress: {
		num: 0,
		basePower: 1,
		accuracy: 100,
		category: "Physical",
		name: "Gravity Press",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1 },
		basePowerCallback(pokemon, target) {
			const targetWeight = target.getWeight();
			const pokemonWeight = pokemon.getWeight();
			let bp;
			if (pokemonWeight >= targetWeight * 5) {
				bp = 120;
			} else if (pokemonWeight >= targetWeight * 4) {
				bp = 100;
			} else if (pokemonWeight >= targetWeight * 3) {
				bp = 80;
			} else if (pokemonWeight >= targetWeight * 2) {
				bp = 60;
			} else {
				bp = 40;
			}
			this.debug(`BP: ${bp}`);
			return bp;
		},
		target: "normal",
		type: "Cosmic",
		contestType: "Tough",
		shortDesc: "More power the heavier the user than the target.",
	},
	flatulence: {
		num: 0,
		basePower: 50,
		accuracy: 90,
		category: "Physical",
		name: "Flatulence",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1 },
		basePowerCallback(pokemon, target, move) {
			if (pokemon.ateBerry) {
				this.debug('BP doubled from berry eaten');
				return move.basePower * 2;
			}
			return move.basePower;
		},
		target: "normal",
		type: "Poison",
		contestType: "Tough",
		shortDesc: "Power doubles if the user ate a berry.",
	},
	duneblast: {
		num: 0,
		basePower: 50,
		accuracy: 100,
		category: "Special",
		name: "Dune Blast",
		pp: 25,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		onAfterMoveSecondarySelf(pokemon, target, move) {
			if (!target || target.fainted || target.hp <= 0) this.boost({ spa: 2 }, pokemon, pokemon, move);
		},
		target: "normal",
		type: "Ground",
		contestType: "Tough",
		shortDesc: "Raises user's Sp. Atk by 2 if this KOes the target.",
	},
	stonegaze: {
		num: 0,
		basePower: 40,
		accuracy: 100,
		category: "Special",
		name: "Stone Gaze",
		pp: 10,
		priority: 3,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		onTry(source) {
			if (source.activeMoveActions > 1) {
				this.hint("Stone Gaze only works on your first turn out.");
				return false;
			}
		},
		secondary: {
			chance: 100,
			volatileStatus: 'flinch',
		},
		target: "normal",
		type: "Rock",
		contestType: "Tough",
		shortDesc: "Hits first. First turn out only. 100% flinch chance.",
	},
	zephyrpurge: {
		num: 0,
		basePower: 140,
		accuracy: 100,
		category: "Special",
		name: "Zephyr Purge",
		pp: 5,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		onTry(source) {
			if (source.moveSlots.length < 2) return false;
			let hasZephyrSurge = false;
			for (const moveSlot of source.moveSlots) {
				if (moveSlot.id === 'zephyrsurge') {
					hasZephyrSurge = true;
					continue;
				}
				if (!moveSlot.used) return false;
			}
			return hasZephyrSurge;
		},
		target: "normal",
		type: "Flying",
		contestType: "Tough",
		shortDesc: "Fails unless each known move has been used.",
	},
	glitch: {
		num: 0,
		basePower: 95,
		accuracy: 100,
		category: "Special",
		name: "Glitch",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		onEffectiveness(typeMod, target, type) {
			return -1 * typeMod;
		},
		target: "normal",
		type: "Bug",
		contestType: "Tough",
		shortDesc: "Inverts type chart for damage calculation.",
	},
	piddle: {
		num: 0,
		basePower: 0,
		accuracy: 100,
		category: "Status",
		name: "Piddle",
		pp: 20,
		priority: 0,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1 },
		onHit(target, source, move) {
			const success = this.boost({ def: -1, spd: -1 }, target, source);
			if (!success && !target.hasAbility('mirrorarmor')) {
				delete move.selfSwitch;
			}
		},
		selfSwitch: true,
		target: "normal",
		type: "Poison",
		contestType: "Tough",
		shortDesc: "Lowers target's Def, Sp. Def by 1. User switches.",
	},
	wraithpulse: {
		num: 0,
		basePower: 70,
		accuracy: 100,
		category: "Special",
		name: "Wraith Pulse",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1, pulse: 1 },
		basePowerCallback(pokemon, target, move) {
			if (target.newlySwitched || this.queue.willMove(target)) {
				this.debug('damage boost');
				return move.basePower * 1.5;
			}
			this.debug('NOT boosted');
			return move.basePower;
		},
		target: "normal",
		type: "Ghost",
		contestType: "Tough",
		shortDesc: "1.5x power if user moves before the target.",
	},
	wyrmsrage: {
		num: 0,
		basePower: 65,
		accuracy: 100,
		category: "Physical",
		name: "Wyrm's Rage",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1 },
		basePowerCallback(pokemon, target, move) {
			if (pokemon.moveLastTurnResult === false) {
				this.debug('doubling BP due to previous move failure');
				return move.basePower * 2;
			}
			return move.basePower;
		},
		target: "normal",
		type: "Dragon",
		contestType: "Tough",
		shortDesc: "Power doubles if the user's last move failed.",
	},
	huntdown: {
		num: 0,
		basePower: 40,
		accuracy: 100,
		category: "Physical",
		name: "Hunt Down",
		pp: 20,
		priority: 0,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1 },
		basePowerCallback(pokemon, target, move) {
			if (target.beingCalledBack || target.switchFlag) {
				this.debug('Hunt Down damage boost');
				return move.basePower * 2;
			}
			return move.basePower;
		},
		beforeTurnCallback(pokemon) {
			for (const target of pokemon.foes()) {
				target.addVolatile('huntdown');
				const data = target.volatiles['huntdown'];
				if (!data.sources) {
					data.sources = [];
				}
				data.sources.push(pokemon);
			}
		},
		onModifyMove(move, source, target) {
			if (target?.beingCalledBack || target?.switchFlag) move.accuracy = true;
		},
		condition: {
			duration: 1,
			onBeforeSwitchOut(pokemon) {
				this.debug('Hunt Down start');
				let alreadyAdded = false;
				pokemon.removeVolatile('destinybond');
				for (const source of this.effectState.sources) {
					if (!source.isAdjacent(pokemon) || !this.queue.cancelMove(source) || !source.hp) continue;
					if (!alreadyAdded) {
						this.add('-activate', pokemon, 'move: Hunt Down');
						alreadyAdded = true;
					}
					if (source.canMegaEvo || source.canUltraBurst || source.canTerastallize) {
						for (const [actionIndex, action] of this.queue.entries()) {
							if (action.pokemon === source) {
								if (action.choice === 'megaEvo') {
									this.actions.runMegaEvo(source);
								} else if (action.choice === 'terastallize') {
									this.actions.terastallize(source);
								} else {
									continue;
								}
								this.queue.list.splice(actionIndex, 1);
								break;
							}
						}
					}
					this.actions.runMove('huntdown', source, source.getLocOf(pokemon));
				}
			},
		},
		target: "normal",
		type: "Flying",
		contestType: "Tough",
		shortDesc: "If a foe is switching out, hits it at 2x power.",
	},
	icydeluge: {
		num: 0,
		basePower: 70,
		accuracy: 100,
		category: "Physical",
		name: "Icy Deluge",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1 },
		basePowerCallback(pokemon, target, move) {
			if (target.newlySwitched || this.queue.willMove(target)) {
				this.debug('Icy Deluge damage boost');
				return move.basePower * 1.5;
			}
			this.debug('Icy Deluge NOT boosted');
			return move.basePower;
		},
		target: "normal",
		type: "Ice",
		contestType: "Tough",
		shortDesc: "1.5x if user moves before the target.",
	},
	chillingblast: {
		num: 0,
		basePower: 50,
		accuracy: 100,
		category: "Special",
		name: "Chilling Blast",
		pp: 25,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		onAfterMoveSecondarySelf(pokemon, target, move) {
			if (!target || target.fainted || target.hp <= 0) this.boost({ spa: 2 }, pokemon, pokemon, move);
		},
		target: "normal",
		type: "Ice",
		contestType: "Tough",
		shortDesc: "Raises user's Sp. Atk by 2 if this KOes the target.",
	},
	fanaticism: {
		num: 0,
		basePower: 75,
		accuracy: 100,
		category: "Physical",
		name: "Fanaticism",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1 },
		basePowerCallback(pokemon, target, move) {
			if (pokemon.moveLastTurnResult === false) {
				this.debug('doubling BP due to previous move failure');
				return move.basePower * 2;
			}
			return move.basePower;
		},
		target: "normal",
		type: "Light",
		contestType: "Tough",
		shortDesc: "Power doubles if the user's last move failed.",
	},
	refurbish: {
		num: 0,
		basePower: 0,
		accuracy: true,
		category: "Status",
		name: "Refurbish",
		pp: 30,
		priority: 0,
		flags: { metronome: 1, snatch: 1 },
		onHit(pokemon) {
			const goodStat = pokemon.getBestStat(true, true);

			let badStat: StatIDExceptHP = 'atk';
			let badStatVal = pokemon.getStat(goodStat, true, true);
			const stats: StatIDExceptHP[] = ['atk', 'def', 'spa', 'spd', 'spe'];
			for (const i of stats) {
				if (pokemon.getStat(i, true, true) < badStatVal) {
					badStat = i;
					badStatVal = pokemon.getStat(i, true, true);
				}
			}

			if (pokemon.boosts[goodStat] >= 6 && pokemon.boosts[badStat] <= -6) return false;
			this.boost({ [goodStat]: 1, [badStat]: 1 }, pokemon);
		},
		target: "adjacentAllyOrSelf",
		type: "Steel",
		contestType: "Tough",
		shortDesc: "Raises user's lowest and highest stats by 1 stage.",
	},
	nebulastrike: {
		num: 0,
		basePower: 75,
		accuracy: 100,
		category: "Physical",
		name: "Nebula Strike",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1 },
		basePowerCallback(pokemon, target, move) {
			if (pokemon.moveLastTurnResult === false) {
				this.debug('doubling BP due to previous move failure');
				return move.basePower * 2;
			}
			return move.basePower;
		},
		target: "normal",
		type: "Cosmic",
		contestType: "Tough",
		shortDesc: "Power doubles if the user's last move failed.",
	},
	bitterbastion: {
		num: 908,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Bitter Bastion",
		pp: 5,
		priority: 4,
		flags: { metronome: 1, noassist: 1, failcopycat: 1 },
		stallingMove: true,
		volatileStatus: 'bitterbastion',
		onPrepareHit(pokemon) {
			return !!this.queue.willAct() && this.runEvent('StallMove', pokemon);
		},
		onHit(pokemon) {
			pokemon.addVolatile('stall');
		},
		condition: {
			duration: 1,
			onStart(target) {
				this.add('-singleturn', target, 'move: Protect');
			},
			onTryHitPriority: 3,
			onTryHit(target, source, move) {
				if (this.checkMoveBypassesProtect(move, source, target, false)) return;
				if (move.smartTarget) {
					move.smartTarget = false;
				} else {
					this.add('-activate', target, 'move: Protect');
				}
				const lockedmove = source.getVolatile('lockedmove');
				if (lockedmove) {
					if (source.volatiles['lockedmove'].duration === 2) {
						delete source.volatiles['lockedmove'];
					}
				}
				if (move.category === 'Special') {
					source.trySetStatus('frz', target);
				}
				return this.NOT_FAIL;
			},
			onHit(target, source, move) {
				if (move.isZOrMaxPowered && move.category === 'Special') {
					source.trySetStatus('frz', target);
				}
			},
		},
		target: "self",
		type: "Ice",
		shortDesc: "Protects from damaging attacks. Special move: frostbite.",
	},
	powercycle: {
		num: 0,
		basePower: 90,
		accuracy: 100,
		category: "Special",
		name: "Power Cycle",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1 },
		secondary: {
			chance: 100,
			self: {
				boosts: {
					spe: 1,
				},
			},
		},
		onTry(source) {
			if (source.species.baseSpecies === 'Morpeko-Orion') {
				return;
			}
			this.attrLastMove('[still]');
			this.add('-fail', source, 'move: Power Cycle');
			this.hint("Only a Pokemon whose form is Morpeko-Orion or Morpeko-Orion-Unpowered can use this move.");
			return null;
		},
		onModifyType(move, pokemon) {
			if (pokemon.species.name === 'Morpeko-Orion-Unpowered') {
				move.type = 'Dark';
			} else {
				move.type = 'Light';
			}
		},
		target: "normal",
		type: "Light",
		desc: "Has a 100% chance to raise the user's Speed by 1 stage. If the user is a Morpeko-Orion in Powered Mode, this move is Light type. If the user is a Morpeko-Orion in Unpowered Mode, this move is Dark type. This move cannot be used successfully unless the user's current form, while considering Transform, is Powered or Unpowered Mode Morpeko-Orion.",
		shortDesc: "Morpeko-Orion: Light; Unpowered: Dark; 100% +1 Spe.",
	},
	infernalblade: {
		num: 0,
		accuracy: 100,
		basePower: 120,
		category: "Physical",
		name: "Infernal Blade",
		pp: 10,
		priority: 0,
		flags: { contact: 1, charge: 1, protect: 1, mirror: 1, metronome: 1, nosleeptalk: 1, failinstruct: 1, slicing: 1 },
		onTryMove(attacker, defender, move) {
			if (attacker.removeVolatile(move.id)) {
				return;
			}
			this.add('-prepare', attacker, move.name);
			if (['sunnyday', 'desolateland'].includes(attacker.effectiveWeather(undefined, true))) {
				this.attrLastMove('[still]');
				this.addMove('-anim', attacker, move.name, defender);
				return;
			}
			if (!this.runEvent('ChargeMove', attacker, defender, move)) {
				return;
			}
			attacker.addVolatile('twoturnmove', defender);
			return null;
		},
		target: "normal",
		type: "Fire",
		contestType: "Cool",
		shortDesc: "Charges turn 1. Hits turn 2. No charge in sunlight.",
	},
	moonstoneray: {
		num: 0,
		basePower: 120,
		accuracy: 90,
		category: "Special",
		name: "Moonstone Ray",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1, charge: 1 },
		onTryMove(attacker, defender, move) {
			if (attacker.removeVolatile(move.id)) {
				return;
			}
			this.add('-prepare', attacker, move.name);
			this.boost({ spa: 1 }, attacker, attacker, move);
			if (!this.runEvent('ChargeMove', attacker, defender, move)) {
				return;
			}
			attacker.addVolatile('twoturnmove', defender);
			return null;
		},
		target: "normal",
		type: "Rock",
		contestType: "Tough",
		shortDesc: "Raises user's Sp. Atk by 1 on turn 1. Hits turn 2.",
	},
};
