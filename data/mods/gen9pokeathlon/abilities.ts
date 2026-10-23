export const Abilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {
	lernean: {
		onUpdate(pokemon) {
			if (!pokemon.hp || pokemon.transformed) return;
			const formeOrder = ['-Nine', '-Eight', '-Seven', '-Six', ''];
			const targetForme = Math.ceil((pokemon.hp / pokemon.maxhp) * 5) - 1;
			let formeIndex = formeOrder.indexOf('-' + pokemon.species.name.split('-').pop()!);
			if (formeIndex === -1) formeIndex = 4;
			if (formeIndex > targetForme) {
				for (const name of ['Hydreigon-Mega', 'Hydroupa']) {
					if (pokemon.species.name.startsWith(name)) {
						pokemon.formeChange(name + formeOrder[targetForme], this.effect, true);
					}
					if (pokemon.m.fusion?.startsWith(name)) {
						pokemon.fusionChange(name + formeOrder[targetForme], this.effect);
					}
				}
			}
		},
		onModifyMove(move, pokemon, target) {
			if (
				!['Hydreigon-Mega', 'Hydroupa'].some(item => pokemon.species.name.includes(item) || pokemon.m.fusion?.includes(item)) ||
				move.category === "Status" || !move.basePower
			) return;

			this.effectState.move = { ...move };

			delete move.secondaries;
			delete move.secondary;
			delete move.self?.boosts;

			if (move.id === 'clangoroussoulblaze') delete move.selfBoost;

			for (const name of ['Hydreigon-Mega', 'Hydroupa']) {
				const formes = [name + '', name + '-Six', name + '-Seven', name + '-Eight', name + '-Nine'];

				let index = formes.indexOf(pokemon.species.name);
				if (index === -1) index = formes.indexOf(pokemon.m.fusion);
				if (index >= 0) {
					move.multihit = 5 + index;
					break;
				}
			}
		},
		onBasePower(basePower, pokemon, target, move) {
			if (
				!['Hydreigon-Mega', 'Hydroupa'].some(item => pokemon.species.name.includes(item) || pokemon.m.fusion?.includes(item))
			) return;
			for (const name of ['Hydreigon-Mega', 'Hydroupa']) {
				const formes = [name + '', name + '-Six', name + '-Seven', name + '-Eight', name + '-Nine'];

				const index = formes.indexOf(pokemon.species.name);
				if (index >= 0) {
					const nhits = 5 + index;
					return this.chainModify((1.15 + (0.075 * (nhits - 5))) / nhits);
				}
			}
		},
		onSourceDamagingHit(damage, target, pokemon, move) {
			if (
				['Hydreigon-Mega', 'Hydroupa'].some(item => pokemon.species.name.includes(item) || pokemon.m.fusion?.includes(item))
			) {
				if (move.multihit && typeof (move.multihit) === 'number' && Math.floor(move.multihit - 1) === move.hit) {
					move = { ...this.effectState.move };
				}
			}
		},
		flags: {
			failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1,
			breakable: 1, notransform: 1,
		},
		name: "Lernean",
		shortDesc: "Grows heads when it loses HP. Moves become multihit.",
		rating: 4.5,
		num: 0,
	},
	pressure: {
		inherit: true,
		onDeductPP(target, source) {
			if (target.isAlly(source)) return;
			if (target.hasAbility('vacuumbubble')) return;
			return 1;
		},
	},
	consumerexchange: {
		onSourceDamagingHit(damage, target, source, move) {
			if (this.effectState.exchange !== false) {
				const yourItem = target.takeItem(source);
				const myItem = source.takeItem();

				if (target.item || source.item || (!yourItem && !myItem)) {
					if (yourItem) target.item = yourItem.id;
					if (myItem) source.item = myItem.id;
					return false;
				}
				if (
					(myItem && !this.singleEvent('TakeItem', myItem, source.itemState, target, source, move, myItem)) ||
					(yourItem && !this.singleEvent('TakeItem', yourItem, target.itemState, source, target, move, yourItem))
				) {
					if (yourItem) target.item = yourItem.id;
					if (myItem) source.item = myItem.id;
					return false;
				}
				this.add('-activate', source, 'ability: Consumer Exchange', `[of] ${target}`);
				if (myItem) {
					target.setItem(myItem);
					this.add('-item', target, myItem, '[from] ability: Consumer Exchange');
				} else {
					this.add('-enditem', target, yourItem, '[silent]', '[from] ability: Consumer Exchange');
				}
				if (yourItem) {
					source.setItem(yourItem);
					this.add('-item', source, yourItem, '[from] ability: Consumer Exchange');
				} else {
					this.add('-enditem', source, myItem, '[silent]', '[from] ability: Consumer Exchange');
				}

				this.effectState.exchange = false;
			}
		},
		onStart(pokemon) {
			this.effectState.exchange = true;
		},
		flags: {},
		name: "Consumer Exchange",
		desc: "The first successful attack used by this Pokémon every time it is sent out onto the field will cause it to switch items with its opponent. Fails if the move misses, has no effect, or if the target's item cannot be removed.",
		shortDesc: "First successful attack after switching in swaps items.",
		rating: 3,
		num: 0,
	},
	windywall: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Flying') {
				this.add('-immune', target, '[from] ability: Windy Wall');
				return null;
			}
		},
		flags: { breakable: 1 },
		name: "Windy Wall",
		shortDesc: "This Pokemon is immune to Flying-type moves.",
		rating: 3.5,
		num: 0,
	},
	musclememory: {
		onBeforeSwitchOut(pokemon) {
			this.effectState.muscleStats = pokemon.boosts;
		},
		onStart(pokemon) {
			if (this.effectState.muscleStats) {
				this.boost(this.effectState.muscleStats, pokemon, pokemon);
			}
		},
		flags: {},
		name: "Muscle Memory",
		shortDesc: "This Pokemon's stat boosts remain after switching.",
		rating: 4,
		num: 0,
	},
	bushido: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (defender.newlySwitched || this.queue.willMove(defender)) {
				this.debug('Bushido damage boost');
				return this.chainModify(1.3);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (defender.newlySwitched || this.queue.willMove(defender)) {
				this.debug('Bushido damage boost');
				return this.chainModify(1.3);
			}
		},
		flags: {},
		name: "Bushido",
		shortDesc: "When this Pokemon moves first, its attacks have 1.3x power.",
		rating: 4,
		num: 0,
	},
	sandydefense: {
		onModifySpD(spd, pokemon) {
			if (this.field.isWeather('sandstorm')) {
				return this.chainModify(1.5);
			}
		},
		onModifyDef(def, pokemon) {
			if (this.field.isWeather('sandstorm')) {
				return this.chainModify(1.5);
			}
		},
		onImmunity(type, pokemon) {
			if (type === 'sandstorm') return false;
		},
		flags: { breakable: 1 },
		name: "Sandy Defense",
		shortDesc: "This Pokemon's Defense and Special Defense are boosted 1.5 in sandstorm.",
		rating: 3,
		num: 0,
	},
	inertia: {
		onAnyModifyPriority(priority, pokemon) {
			if (pokemon.activeMoveActions === 0) return priority - 1;
		},
		flags: {},
		name: "Inertia",
		shortDesc: "On every Pokemon's first turn, its moves have -1 priority. Includes user.",
		rating: 4.5,
		num: 0,
	},
	multishot: {
		onModifyMove(move, pokemon, target) {
			if (move.category !== "Special" || !move.basePower) return;
			move.multihit = [2, 5];
		},
		onBasePower(basePower, pokemon, target, move) {
			if (move.category === "Special") return this.chainModify([3, 10]);
		},
		flags: {},
		name: "Multishot",
		shortDesc: "This Pokemon's special moves become multihit with 0.3x power.",
		rating: 4.5,
		num: 0,
	},
	ivywall: {
		onImmunity(type, pokemon) {
			if (type === 'powder') return false;
		},
		onTryHitPriority: 1,
		onTryHit(target, source, move) {
			if (move.flags['powder'] && target !== source && this.dex.getImmunity('powder', target)) {
				this.add('-immune', target, '[from] ability: Ivy Wall');
				return null;
			}
		},
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Grass' || move.type === 'Water' || move.type === 'Electric' || move.type === 'Ground') {
				this.debug('Ivy Wall weaken');
				return this.chainModify(0.5);
			}
		},
		flags: { breakable: 1 },
		name: "Ivy Wall",
		shortDesc: "This Pokémon takes on the resistances and immunities of the Grass type.",
		rating: 3,
		num: 0,
	},
	kablooey: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball', 'laserpulse',
			];
			if (move.type === 'Normal' && !noModifyType.includes(move.id) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Electric';
				move.typeChangerBoosted = this.effect;
			}
		},
		onResidualOrder: 28,
		onResidualSubOrder: 2,
		onResidual(pokemon) {
			if (pokemon.volatiles["mustrecharge"]) {
				pokemon.removeVolatile("mustrecharge");
				this.add("cant", pokemon, "recharge");
				return;
			} else {
				this.actions.useMove("Self-Destruct", pokemon);
			}
		},
		flags: {},
		name: "Kablooey",
		shortDesc: "This Pokemon attempts to Self-Destruct at the end of each turn.",
		rating: 3,
		num: 0,
	},
	counterclockwise: {
		onChangeBoost(boost, target, source, effect) {
			if (effect?.id === 'zpower') return;
			[boost.atk, boost.spa] = [boost.spa, boost.atk];
		},
		flags: {},
		name: "Counterclockwise",
		shortDesc: "This Pokemon's SpA boosts are swapped with its Atk boosts.",
		rating: 4,
		num: 0,
	},
	undeterred: {
		onDamage(damage, target, source, effect) {
			if (effect && ['stealthrock', 'spikes', 'gmaxsteelsurge', 'hotcoals'].includes(effect.id)) {
				return false;
			}
		},
		onTryBoost(boost, target, source, effect) {
			if (source && target === source) return;
			if (effect && effect.id !== 'stickyweb') return;
			let i: BoostID;
			for (i in boost) {
				if (boost[i]! < 0) {
					delete boost[i];
				}
			}
		},
		onSetStatus(status, target, source, effect) {
			if (effect && ['toxicspikes', 'permafrost', 'livewire'].includes(effect.id)) {
				return false;
			}
		},
		flags: {},
		name: "Undeterred",
		shortDesc: "This Pokemon is immune to all entry hazards.",
		rating: 4,
		num: 0,
	},
	necromancy: {
		onStart(target) {
			let zombie;
			const log = this.dex.deepClone(this.log);
			log.reverse();
			for (const line of log) {
				if (zombie) break;
				if (line.includes('|faint|')) {
					const faintName = line.slice(12);
					const player = line.slice(7, 9);
					const side = player === 'p1' ? this.p1 : player === 'p2' ? this.p2 : player === 'p3' ? this.p3 : this.p4;
					if (side) {
						for (const mon of side.pokemon) {
							if (mon.name === faintName) zombie = mon;
						}
					}
				}
			}
			if (zombie) {
				const species = this.runEvent('ModifySpecies', target, null, this.effect, zombie.species);
				const newSpecies: Species = this.dex.deepClone(species);

				const moves = zombie.moveSlots;

				this.add('-activate', target, 'ability: Necromancy');
				this.add('-message', `${target.name} has gained control over the body of ${zombie.name}!`);

				const newType: string[] = [];

				for (const type of [...target.getTypes(), ...zombie.getTypes()]) {
					if (!newType.includes(type)) {
						newType.push(type);
					}
				}

				while (target.moveSlots.length < 4 && moves[target.moveSlots.length]) {
					target.moveSlots.push(moves[target.moveSlots.length]);
				}

				newSpecies.baseStats['atk'] += target.species.baseStats['atk'];
				newSpecies.baseStats['def'] += target.species.baseStats['def'];
				newSpecies.baseStats['spa'] += target.species.baseStats['spa'];
				newSpecies.baseStats['spd'] += target.species.baseStats['spd'];
				newSpecies.baseStats['spe'] += target.species.baseStats['spe'];

				target.setSpecies({ ...newSpecies, types: [...newType] });
				this.add('-start', target, 'typechange', target.types.join('/'));
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1,
			breakable: 1, notransform: 1 },
		name: "Necromancy",
		shortDesc: "This Pokemon can control the body of the last Pokemon who fainted.",
		rating: 4,
		num: 0,
	},
	cleansweep: {
		onStart(pokemon) {
			if (pokemon.hp === pokemon.maxhp) {
				let success = false;
				const removeAll = [
					'spikes', 'toxicspikes', 'stealthrock', 'stickyweb', 'gmaxsteelsurge', 'hotcoals', 'permafrost', 'livewire',
				];
				const sides = [pokemon.side, ...pokemon.side.foeSidesWithConditions()];
				for (const side of sides) {
					for (const sideCondition of removeAll) {
						if (side.removeSideCondition(sideCondition)) {
							this.add('-sideend', side, this.dex.conditions.get(sideCondition).name);
							success = true;
						}
					}
				}
				if (success) this.add('-activate', pokemon, 'ability: Clean Sweep');
				return success;
			}
		},
		name: "Clean Sweep",
		shortDesc: "If this Pokemon is at full HP, it clears all hazards on switch-in.",
		rating: 4,
		num: 0,
	},
	starfall: {
		onStart(pokemon) {
			const sideConditions = [
				'spikes', 'toxicspikes', 'stealthrock', 'livewire', 'permafrost', 'hotcoals', 'stickyweb', 'gmaxsteelsurge',
			];
			this.prng.shuffle(sideConditions);
			for (const condition of sideConditions) {
				if (pokemon.hp && pokemon.side.removeSideCondition(condition)) {
					this.add('-sideend', pokemon.side, this.dex.conditions.get(condition).name, '[from] ability: Starfall', `[of] ${pokemon}`);
					return;
				}
			}
		},
		name: "Starfall",
		shortDesc: "Clears one random hazard on switch-in.",
		rating: 4,
		num: 0,
	},
	zealousflock: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (!source.getVolatile('zealousflock')) source.addVolatile('zealousflock', target);
		},
		condition: {
			onStart(pokemon, source) {
				this.add('-start', pokemon, 'Zealous Flock', `[of] ${source}`);
			},
			onResidualOrder: 12,
			onResidual(pokemon) {
				this.damage(pokemon.baseMaxhp / 16);
			},
		},
		name: "Zealous Flock",
		shortDesc: "If the User is hit by an attack, the attacker loses 1/16 HP per turn until switched out.",
		rating: 4,
		num: 0,
	},
	multitasker: {
		onModifyMove(move, pokemon) {
			if (move.category === "Status") return;
			move.overrideDefensiveStat = move.category === "Physical" ? 'def' : 'spd';
			move.category = pokemon.getStat('atk', false, true) > pokemon.getStat('spa', false, true) ? 'Physical' : 'Special';
		},
		name: "Multitasker",
		shortDesc: "Pokemon will always use highest attacking stat.",
		rating: 4,
		num: 0,
	},
	glutinousrice: {
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Fighting') {
				this.debug("Glutinous Rice reduction");
				return this.chainModify(0.25);
			}
		},
		flags: { breakable: 1 },
		name: "Glutinous Rice",
		shortDesc: "Takes 1/4 damage from Fighting-type attacks.",
		rating: 2,
		num: 0,
	},
	clairvoyance: {
		onChargeMove(pokemon, target, move) {
			this.debug('clairvoyance - remove charge turn for ' + move.id);
			this.attrLastMove('[still]');
			this.addMove('-anim', pokemon, move.name, target);
			return false;
		},
		flags: { breakable: 1 },
		name: "Clairvoyance",
		shortDesc: "Charge moves do not require a charge turn",
		rating: 5,
		num: 0,
	},
	spittingfire: {
		onModifyMovePriority: -1,
		onModifyMove(move) {
			if (move.type === 'Fire') {
				move.flags.sound = 1;
				move.flags.bypasssub = 1;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.flags.sound) return this.chainModify([4915, 4096]);
		},
		flags: { breakable: 1 },
		name: "Spitting Fire",
		shortDesc: "Fire-type moves become sound-based. Sound-based moves have 1.2x power.",
		rating: 3,
		num: 0,
	},
	hueshift: {
		onPrepareHit(source, target, move) {
			if (move.hasBounced || move.flags['futuremove'] || move.sourceEffect === 'snatch') return;
			const type = move.type;
			if (type && type !== '???' && source.getTypes().join() !== type) {
				if (!source.setType(type)) return;
				this.add('-start', source, 'typechange', type, '[from] ability: Hue Shift');
			}
		},
		onSwitchIn() {},
		flags: {},
		name: "Hue Shift",
		desc: "This Pokemon's type changes to match the type of the move it is about to use. This effect comes after all effects that change a move's type.",
		shortDesc: "This Pokemon's type changes to match the type of the move it is about to use.",
		rating: 4,
		num: 0,
	},
	burstingspores: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target, true)) {
				this.damage(source.baseMaxhp / 8, source, target);
				this.heal(source.baseMaxhp / 8, target, source, 'drain');
			}
		},
		flags: {},
		name: "Bursting Spores",
		shortDesc: "Pokemon making contact with this Pokemon take 1/8 max HP recoil. User is healed for same amount.",
		rating: 2,
		num: 0,
	},
	belligerentquills: {
		onSourceDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target, true) && !move.multihit) {
				this.damage(target.baseMaxhp / 16, target, source);
			}
		},
		flags: {},
		name: "Belligerent Quills",
		shortDesc: "When dealing contact-based damage, deals an additional 1/16 max HP.",
		rating: 4,
		num: 0,
	},
	aquaguard: {
		onFoeBeforeMove(source, target, move) {
			if (source !== target && move.category !== "Status") {
				source.addVolatile('gastroacid');
			}
		},
		onFoeAfterMove(source, target, move) {
			source.removeVolatile('gastroacid');
			this.add('-ability', source, source.getAbility(), '[silent]');
		},
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			source.removeVolatile('gastroacid');
			this.add('-ability', source, source.getAbility(), '[silent]');
		},
		flags: {},
		name: "Aqua Guard",
		shortDesc: "Ignores opposing Pokemon's abilities when taking damage.",
		rating: 3,
		num: 0,
	},
	sweettooth: {
		onAfterUseItem(item, pokemon) {
			if (pokemon !== this.effectState.target || !item.isBerry) return;
			if (pokemon.species.id === 'caramitti') pokemon.formeChange('Caramitti-Crazed', this.effect, true);
			if (this.dex.toID(pokemon.m.fusion) === 'caramitti') pokemon.fusionChange('Caramitti-Crazed', this.effect);
		},
		onEatItem(item, pokemon) {
			if (pokemon.species.id === 'caramitti') pokemon.formeChange('Caramitti-Crazed', this.effect, true);
			if (this.dex.toID(pokemon.m.fusion) === 'caramitti') pokemon.fusionChange('Caramitti-Crazed', this.effect);
		},
		flags: {},
		name: "Sweet Tooth",
		shortDesc: "After consuming a berry, changes Caramitti's form to Crazed.",
		rating: 2.5,
		num: 0,
	},
	luckycharm: {
		onStart(pokemon) {
			this.add('-activate', pokemon, 'ability: Lucky Charm');
			pokemon.side.addSideCondition('luckycharm');
		},
		onSwitchOut(pokemon) {
			pokemon.side.removeSideCondition('luckycharm');
		},
		flags: { breakable: 1 },
		name: "Lucky Charm",
		shortDesc: "User's side is protected from critical hits and move secondaries.",
		rating: 2.5,
		num: 0,
	},
	crystalmana: {
		onTerrainChange(pokemon) {
			if (this.field.terrain) {
				this.boost({ def: 1, spd: 1 });
				pokemon.abilityState.preTerrain = this.field.terrain;
			}
		},
		onStart(pokemon) {
			if (this.field.terrain && !pokemon.abilityState.preTerrain) {
				this.boost({ def: 1, spd: 1 });
			}
			pokemon.abilityState.preTerrain = undefined;
		},
		flags: {},
		name: "Crystal Mana",
		shortDesc: "Raises Def and Sp.Def by 1 stage upon terrain change.",
		rating: 2.5,
		num: 0,
	},
	adaptivearmor: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (target.abilityState.type === undefined) {
				target.abilityState.type = move.type;
				this.add('-activate', target, 'ability: Adaptive Armor');
				this.add('-start', target, `adaptive${target.abilityState.type}`, '[from] ability: Adaptive Armor');
			}
		},
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === target.abilityState.type) {
				this.debug('Adaptive Armor neutralize');
				return this.chainModify(0.5);
			}
		},
		onSwitchOut(pokemon) {
			this.add('-end', pokemon, `adaptive${pokemon.abilityState.type}`, '[from] ability: Adaptive Armor');
			pokemon.abilityState.type = undefined;
		},
		flags: { breakable: 1 },
		name: "Adaptive Armor",
		shortDesc: "Takes half damage from moves with the type of first move user is hit by.",
		rating: 2.5,
		num: 0,
	},
	momentum: {
		onStart(target) {
			target.abilityState.boostArray = [];
		},
		onAfterBoost(boost, target, source, effect) {
			for (const stat in boost) {
				const statBoost = boost[stat as keyof BoostsTable];
				if (statBoost && statBoost !== 0) {
					boost[stat as keyof BoostsTable] = statBoost / Math.abs(statBoost);
				}
			}

			target.abilityState.boost = boost;
		},
		onResidualOrder: 28,
		onResidualSubOrder: 2,
		onResidual(pokemon) {
			if (!pokemon.abilityState.boostArray[0]) pokemon.abilityState.boostArray.push({});
			if (pokemon.statsLoweredThisTurn || pokemon.statsRaisedThisTurn) {
				pokemon.abilityState.boostArray.push(pokemon.abilityState.boost);
			} else {
				pokemon.abilityState.boostArray.push({});
			}
			const boost = pokemon.abilityState.boostArray[0];
			this.boost(boost, pokemon, pokemon);
			pokemon.abilityState.boostArray.shift();
		},
		flags: { breakable: 1 },
		name: "Momentum",
		shortDesc: "The last stat changes in a turn are repeated next turn at 1 stage.",
		rating: 2.5,
		num: 0,
	},
	pixiepower: {
		onBasePowerPriority: 19,
		onBasePower(basePower, source, target, move) {
			if (move.type === 'Fairy') {
				this.debug('Pixie Power Boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Pixie Power",
		rating: 3.5,
		num: 0,
		shortDesc: "This Pokemon's Fairy-Type moves have 1.5x power.",
	},
	windyspirit: {
		onAllyBasePowerPriority: 22,
		onAllyBasePower(basePower, attacker, defender, move) {
			if (move.flags.wind) {
				this.debug('Windy Spirit boost');
				return this.chainModify(1.3);
			}
		},
		flags: {},
		name: "Windy Spirit",
		rating: 3.5,
		num: 0,
		shortDesc: "This Pokemon's wind-based attacks have 1.3x power.",
	},
	strangeanatomy: {
		onDamagingHit(damage, target, source, move) {
			const sourceAbility = source.getAbility();
			if (sourceAbility.flags['cantsuppress'] || sourceAbility.id === 'strangeanatomy') {
				return;
			}
			if (this.checkMoveMakesContact(move, source, target, !source.isAlly(target))) {
				source.setAbility('strangeanatomy', target);
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, source, target, move) {
			if (!source.abilityState.strangeCounter || move.category !== 'Physical' || !move.basePower) return;
			return Math.max(basePower - source.abilityState.strangeCounter * 5, 1);
		},
		onResidual(target, source, effect) {
			if (!target.abilityState.strangeCounter) target.abilityState.strangeCounter = 0;
			target.abilityState.strangeCounter += 1;
		},
		flags: {},
		name: "Strange Anatomy",
		rating: 4,
		num: 0,
		shortDesc: "Replaces ability on contact. Reduces BP of Physical moves by 5 each turn.",
	},
	tailgunrailgun: {
		onStart(target) {
			let tailgun = false;
			for (const move of target.moveSlots) {
				const moveType = this.dex.moves.get(move.id).type;
				if (moveType === 'Electric' && move.pp === move.maxpp) tailgun = true;
				if (moveType === 'Electric' && move.pp !== move.maxpp) { tailgun = false; break; }
			}
			if (tailgun) this.actions.useMove('charge', target, { target });
		},
		flags: {},
		name: "Tailgun Railgun",
		rating: 4,
		num: 0,
		shortDesc: "If all Electric-type moves have full PP, uses Charge.",
	},
	hiddenambush: {
		onBasePowerPriority: 23,
		onBasePower(basePower, source, target, move) {
			if (move.flags.charge) return this.chainModify(1.5);
		},
		flags: {},
		name: "Hidden Ambush",
		rating: 4,
		num: 0,
		shortDesc: "Boosts moves that require a charge turn by 50%.",
	},
	vacuumbubble: {
		onModifyMove(move, pokemon, target) {
			move.ignoreDefensive = true;
		},
		onBeforeMove(source, target, move) {
			if (target.item) {
				target.speciesState.item = target.getItem();
				target.setItem('');
			}
		},
		onAfterMove(source, target, move) {
			if (target.speciesState.item) {
				target.setItem(target.speciesState.item);
				target.speciesState.item = null;
			}
		},
		flags: {},
		name: "Vacuum Bubble",
		rating: 4,
		num: 0,
		shortDesc: "Ignores foe's items and defensive boosts when attacking. Immune to Pressure.",
	},
	hivemind: {
		onSwitchOut(pokemon) {
			if (pokemon.species.id === 'zorblobsplit') pokemon.formeChange('Zorblob');
			this.effectState.split = false;
		},
		onSourceModifyDamage(damage, source, target, move) {
			if (target.species.id === 'zorblob' && damage > target.baseMaxhp / 4) {
				this.debug('Hive Mind weaken');
				this.effectState.split = true;
				return this.chainModify(0.5);
			}
		},
		onUpdate(pokemon) {
			if (this.effectState.split && pokemon.species.id === 'zorblob') {
				pokemon.formeChange('Zorblob-Split', this.effect, false);
			}
		},
		flags: {
			failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1,
			breakable: 1, notransform: 1,
		},
		name: "Hive Mind",
		rating: 4,
		num: 0,
		shortDesc: "If Zorblob: 1/2 damage taken and transforms to Split after taking 1/4 max HP damage.",
	},
	coatofarms: {
		onBeforeSwitchIn(target) {
			if (!target.species.name.includes('Tanukief')) return;
			target.abilityState.coatType = target.species.name.includes('Tanukief-') ?
				target.species.name.replace('Tanukief-', '') : 'Normal';
			if (!target.addType(target.abilityState.coatType)) return;
		},
		onSwitchIn(target) {
			this.add('-start', target, 'typeadd', target.abilityState.coatType, '[from] ability: Coat of Arms');
		},
		flags: {
			failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1,
			breakable: 1, notransform: 1,
		},
		name: "Coat of Arms",
		rating: 4,
		num: 0,
		shortDesc: "Gains additional type based on form.",
	},
	retribution: {
		onSourceAfterFaint(length, target, source, effect) {
			if (effect?.effectType === 'Move') {
				source.abilityState.retribution = source.abilityState.retribution ? source.abilityState.retribution + 1 : 1;
				this.add('-activate', source, 'ability: Retribution');
				this.add('-end', source, `retribution${source.abilityState.retribution - 1}`, '[silent]');
				this.add('-start', source, `retribution${source.abilityState.retribution}`, '[silent]');
			}
		},
		onModifyCritRatio(critRatio, source, target) {
			if (source.abilityState.retribution) return critRatio + source.abilityState.retribution;
		},
		onEnd(pokemon) {
			this.add('-end', pokemon, `retribution${pokemon.abilityState.retribution}`, '[silent]');
		},
		flags: {},
		name: "Retribution",
		rating: 4,
		num: 0,
		shortDesc: "+1 crit ratio on KO.",
	},
	asabove: {
		onAnyModifyBoost(boosts, pokemon) {
			if (!this.effectState.target.abilityState.distortion) return;
			let i: BoostID;
			for (i in boosts) {
				boosts[i]! *= -1;
			}
		},
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			target.abilityState.distortion = false;
			this.add('-end', target, 'As Above');
		},
		onSwitchInPriority: 1,
		onSwitchIn(pokemon) {
			pokemon.abilityState.distortion = true;
			this.add('-ability', pokemon, 'As Above');
		},
		flags: { breakable: 1 },
		name: "As Above",
		rating: 4,
		num: 0,
		shortDesc: "While on field, stat changes have the opposite effect. Breaks upon any hit.",
	},
	caeciliandefense: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			target.addVolatile('caeciliandefense');
			this.add('-start', target, `caeciliandefense`, '[silent]');
		},
		onModifyMove(move, pokemon, target) {
			if (pokemon.volatiles['caeciliandefense']) move.overrideOffensiveStat = 'def';
		},
		onAfterMoveSecondarySelf(source, target, move) {
			if (source.volatiles['caeciliandefense']) {
				source.removeVolatile('caeciliandefense');
				this.add('-end', source, `caeciliandefense`, '[silent]');
			}
		},
		flags: {},
		name: "Caecilian Defense",
		rating: 4,
		num: 0,
		shortDesc: "When attacked, user uses Def. as offensive stat until the user's next move.",
	},
	naturalanomaly: {
		onSourceModifyDamage(damage, source, target, move) {
			if (['Flying', 'Poison', 'Bug', 'Fire', 'Ice'].includes(move.type)) {
				this.debug('Natural Anomaly weaken');
				return this.chainModify(0.5);
			}
		},
		flags: { breakable: 1 },
		name: "Natural Anomaly",
		shortDesc: "This Pokemon takes halved damage from Grass-type's weaknesses.",
		rating: 3,
		num: 0,
	},
	sweetcollateral: {
		onBasePowerPriority: 30,
		onBasePower(basePower, attacker, defender, move) {
			const basePowerAfterMultiplier = this.modify(basePower, this.event.modifier);
			this.debug(`Base Power: ${basePowerAfterMultiplier}`);
			if (basePowerAfterMultiplier <= 65) {
				this.debug('Sweet Collat boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Sweet Collateral",
		rating: 3.5,
		num: 0,
		shortDesc: "This Pokemon's moves of 65 power or less have 1.5x power, including Struggle.",
	},
	concentrate: {
		onModifyDamage(damage, source, target, move) {
			if (target.getMoveHitData(move).crit) {
				this.debug('Concentrate boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Concentrate",
		rating: 3.5,
		num: 0,
		shortDesc: "If this Pokemon strikes with a critical hit, the damage is multiplied by 1.5.",
	},
	moneyequalspower: {
		onBasePower(basePower, source, target, move) {
			if (source.side.sideConditions['scatteredcoins']) {
				return this.chainModify(1.3);
			}
		},
		onSourceDamagingHit(damage, target, source, move) {
			source.side.removeSideCondition('scatteredcoins');
		},
		flags: {},
		name: "Money Equals Power",
		rating: 3.5,
		num: 0,
		shortDesc: "If coins are scattered, 1.3x Power. Removes scattered coins after attacking.",
	},
	dualmastery: {
		onBasePower(basePower, source, target, move) {
			if (move.category === source.abilityState.dualMastery) {
				return this.chainModify(1.3);
			}
		},
		onSourceDamagingHit(damage, target, source, move) {
			this.add('-end', source, source.abilityState.dualMastery, '[silent]');
			source.abilityState.dualMastery = move.category === "Physical" ? "Special" : "Physical";
			this.add('-start', source, source.abilityState.dualMastery, '[silent]');
		},
		flags: {},
		name: "Dual Mastery",
		rating: 3.5,
		num: 0,
		shortDesc: "x1.3 power to Special moves after using a Physical move, and vice versa.",
	},
	zeitwinder: {
		onAfterMove(source, target, move) {
			if (!move.flags.futuremove) return;
			if (target.side.slotConditions[target.position]?.['futuremove']) {
				let moveData = target.side.slotConditions[target.position]['futuremove'].moveData;
				moveData = {
					...moveData,
					onHit(pokemon: Pokemon) {
						if (pokemon.getAbility().flags['cantsuppress']) return;
						pokemon.addVolatile('gastroacid');
						pokemon.clearBoosts();
					},
				};
				target.side.slotConditions[target.position]['futuremove'].moveData = moveData;
			}
		},
		onSourceDamagingHit(damage, target, source, move) {
			if (move.flags['futuremove'] && !target.getAbility().flags['cantsuppress']) {
				target.addVolatile('gastroacid');
				target.clearBoosts();
			}
		},
		flags: {},
		name: "Zeitwinder",
		rating: 3.5,
		num: 0,
		shortDesc: "User's future moves suppress the target's ability and clears their stat changes when they hit.",
	},
	cadenza: {
		onTryHit(target, source, move) {
			if (target !== source && move.flags.sound) {
				if (!this.boost({ spa: 1 })) {
					this.add('-immune', target, '[from] ability: Cadenza');
				}
				return null;
			}
		},
		flags: { breakable: 1 },
		name: "Cadenza",
		rating: 3,
		num: 0,
		shortDesc: "This Pokemon is immune to Sound moves; +1 Sp.Atk when hit by one.",
	},
	voltaicsiphon: {
		onDamagingHitOrder: 1,
		onSourceDamagingHit(damage, target, source, move) {
			if (move.drain) {
				source.addVolatile('charge');
			}
		},
		flags: {},
		name: "Voltaic Siphon",
		rating: 1,
		num: 0,
		shortDesc: "This Pokemon gains the Charge effect when it succesfully uses a draining move.",
	},
	rampagingdespair: {
		onSourceAfterFaint(length, target, source, effect) {
			if (effect?.effectType !== 'Move') {
				return;
			}
			if (source.species.id === 'mazetsubo' && source.hp && !source.transformed && source.side.foePokemonLeft()) {
				this.add('-activate', source, 'ability: Rampaging Despair');
				source.formeChange('Mazetsubo-Despair', this.effect, true);
			}
		},
		onModifyMove(move, pokemon, target) {
			if (pokemon.species.id === 'mazetsubodespair' && move.target === 'normal') move.target = 'allAdjacentFoes';
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "Rampaging Despair",
		rating: 3.5,
		num: 0,
		shortDesc: "If Mazetsubo: transforms into Mazetsubo-Despair on KO, gaining spread on single-targetting moves.",
	},
};
