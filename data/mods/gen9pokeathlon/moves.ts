const removeAllUniversal = [
	'spikes', 'toxicspikes', 'stealthrock', 'stickyweb', 'gmaxsteelsurge', 'hotcoals', 'permafrost', 'livewire',
];
const removeTargetUniversal = ['reflect', 'lightscreen', 'auroraveil', 'safeguard', 'mist', ...removeAllUniversal];
const removeVolatileUniversal = ['Leech Seed', 'Zealous Flock'];

export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	courtchange: {
		inherit: true,
		onHitField(target, source) {
			const sideConditions = [
				'tailwind', 'waterpledge', 'firepledge', 'grasspledge', 'luckychant', 'gmaxcannonade', 'gmaxvinelash', 'gmaxwildfire', 'gmaxvolcalith',
			].concat(removeTargetUniversal);
			let success = false;
			if (this.gameType === "freeforall") {
				const sides = [this.sides[0], this.sides[3]!, this.sides[1], this.sides[2]!];
				const temp: { [k: number]: typeof source.side.sideConditions } = { 0: {}, 1: {}, 2: {}, 3: {} };
				for (const side of sides) {
					for (const id in side.sideConditions) {
						if (!sideConditions.includes(id)) continue;
						temp[side.n][id] = side.sideConditions[id];
						delete side.sideConditions[id];
						success = true;
					}
				}
				for (let i = 0; i < 4; i++) {
					const sourceSideConditions = temp[sides[i].n];
					const targetSide = sides[(i + 1) % 4];
					for (const id in sourceSideConditions) {
						targetSide.sideConditions[id] = sourceSideConditions[id];
						targetSide.sideConditions[id].target = targetSide;
					}
				}
			} else {
				const sourceSideConditions = source.side.sideConditions;
				const targetSideConditions = source.side.foe.sideConditions;
				const sourceTemp: typeof sourceSideConditions = {};
				const targetTemp: typeof targetSideConditions = {};
				for (const id in sourceSideConditions) {
					if (!sideConditions.includes(id)) continue;
					sourceTemp[id] = sourceSideConditions[id];
					delete sourceSideConditions[id];
					success = true;
				}
				for (const id in targetSideConditions) {
					if (!sideConditions.includes(id)) continue;
					targetTemp[id] = targetSideConditions[id];
					delete targetSideConditions[id];
					success = true;
				}
				for (const id in sourceTemp) {
					targetSideConditions[id] = sourceTemp[id];
					targetSideConditions[id].target = source.side.foe;
				}
				for (const id in targetTemp) {
					sourceSideConditions[id] = targetTemp[id];
					sourceSideConditions[id].target = source.side;
				}
			}
			if (!success) return false;
			this.add('-swapsideconditions');
			this.add('-activate', source, 'move: Court Change');
		},
	},
	defog: {
		inherit: true,
		onHit(target, source, move) {
			let success = false;
			if (!target.volatiles['substitute'] || move.infiltrates) success = !!this.boost({ evasion: -1 });
			const removeAll = removeAllUniversal;
			const removeTarget = removeTargetUniversal;
			for (const targetCondition of removeTarget) {
				if (target.side.removeSideCondition(targetCondition)) {
					if (!removeAll.includes(targetCondition)) continue;
					this.add('-sideend', target.side, this.dex.conditions.get(targetCondition).name, '[from] move: Defog', `[of] ${source}`);
					success = true;
				}
			}
			for (const sideCondition of removeAll) {
				if (source.side.removeSideCondition(sideCondition)) {
					this.add('-sideend', source.side, this.dex.conditions.get(sideCondition).name, '[from] move: Defog', `[of] ${source}`);
					success = true;
				}
			}
			this.field.clearTerrain();
			return success;
		},
	},
	mortalspin: {
		inherit: true,
		onAfterHit(target, pokemon, move) {
			if (!move.hasSheerForce) {
				for (const volatile of removeVolatileUniversal) {
					if (pokemon.hp && pokemon.removeVolatile(this.dex.toID(volatile))) {
						this.add('-end', pokemon, volatile, '[from] move: Mortal Spin', `[of] ${pokemon}`);
					}
				}
				const sideConditions = removeAllUniversal;
				for (const condition of sideConditions) {
					if (pokemon.hp && pokemon.side.removeSideCondition(condition)) {
						this.add('-sideend', pokemon.side, this.dex.conditions.get(condition).name, '[from] move: Mortal Spin', `[of] ${pokemon}`);
					}
				}
				if (pokemon.hp && pokemon.volatiles['partiallytrapped']) {
					pokemon.removeVolatile('partiallytrapped');
				}
			}
		},
		onAfterSubDamage(damage, target, pokemon, move) {
			if (!move.hasSheerForce) {
				for (const volatile of removeVolatileUniversal) {
					if (pokemon.hp && pokemon.removeVolatile(this.dex.toID(volatile))) {
						this.add('-end', pokemon, volatile, '[from] move: Mortal Spin', `[of] ${pokemon}`);
					}
				}
				const sideConditions = removeAllUniversal;
				for (const condition of sideConditions) {
					if (pokemon.hp && pokemon.side.removeSideCondition(condition)) {
						this.add('-sideend', pokemon.side, this.dex.conditions.get(condition).name, '[from] move: Mortal Spin', `[of] ${pokemon}`);
					}
				}
				if (pokemon.hp && pokemon.volatiles['partiallytrapped']) {
					pokemon.removeVolatile('partiallytrapped');
				}
			}
		},
	},
	rapidspin: {
		inherit: true,
		onAfterHit(target, pokemon, move) {
			if (!move.hasSheerForce) {
				for (const volatile of removeVolatileUniversal) {
					if (pokemon.hp && pokemon.removeVolatile(this.dex.toID(volatile))) {
						this.add('-end', pokemon, volatile, '[from] move: Rapid Spin', `[of] ${pokemon}`);
					}
				}
				const sideConditions = removeAllUniversal;
				for (const condition of sideConditions) {
					if (pokemon.hp && pokemon.side.removeSideCondition(condition)) {
						this.add('-sideend', pokemon.side, this.dex.conditions.get(condition).name, '[from] move: Rapid Spin', `[of] ${pokemon}`);
					}
				}
				if (pokemon.hp && pokemon.volatiles['partiallytrapped']) {
					pokemon.removeVolatile('partiallytrapped');
				}
			}
		},
		onAfterSubDamage(damage, target, pokemon, move) {
			if (!move.hasSheerForce) {
				for (const volatile of removeVolatileUniversal) {
					if (pokemon.hp && pokemon.removeVolatile(this.dex.toID(volatile))) {
						this.add('-end', pokemon, volatile, '[from] move: Rapid Spin', `[of] ${pokemon}`);
					}
				}
				const sideConditions = removeAllUniversal;
				for (const condition of sideConditions) {
					if (pokemon.hp && pokemon.side.removeSideCondition(condition)) {
						this.add('-sideend', pokemon.side, this.dex.conditions.get(condition).name, '[from] move: Rapid Spin', `[of] ${pokemon}`);
					}
				}
				if (pokemon.hp && pokemon.volatiles['partiallytrapped']) {
					pokemon.removeVolatile('partiallytrapped');
				}
			}
		},
	},
	tidyup: {
		inherit: true,
		onHit(pokemon) {
			let success = false;
			for (const active of this.getAllActive()) {
				if (active.removeVolatile('substitute')) success = true;
			}
			const removeAll = removeAllUniversal;
			const sides = [pokemon.side, ...pokemon.side.foeSidesWithConditions()];
			for (const side of sides) {
				for (const sideCondition of removeAll) {
					if (side.removeSideCondition(sideCondition)) {
						this.add('-sideend', side, this.dex.conditions.get(sideCondition).name);
						success = true;
					}
				}
			}
			if (success) this.add('-activate', pokemon, 'move: Tidy Up');
			return !!this.boost({ atk: 1, spe: 1 }, pokemon, pokemon, null, false, true) || success;
		},
	},
	payday: {
		inherit: true,
		onHit(target, source, move) {
			source.side.addSideCondition(this.dex.conditions.get('scatteredcoins'));
		},
	},
	makeitrain: {
		inherit: true,
		onHit(target, source, move) {
			source.side.addSideCondition(this.dex.conditions.get('scatteredcoins'));
		},
	},
	gmaxgoldrush: {
		inherit: true,
		onHit(target, source, move) {
			source.side.addSideCondition(this.dex.conditions.get('scatteredcoins'));
		},
	},
	leechseed: {
		inherit: true,
		onTryImmunity(target) {
			return !target.hasType('Grass') && !target.hasAbility('Ivy Wall');
		},
	},
	fling: {
		inherit: true,
		condition: {
			onUpdate(pokemon) {
				if (pokemon.item !== 'boomerang') {
					const item = pokemon.getItem();
					pokemon.setItem('');
					pokemon.lastItem = item.id;
					pokemon.usedItemThisTurn = true;
					this.add('-enditem', pokemon, item.name, '[from] move: Fling');
					this.runEvent('AfterUseItem', pokemon, null, null, item);
					pokemon.removeVolatile('fling');
				}
			},
		},
	},
	pollenpuff: {
		inherit: true,
		onHit(target, source, move) {
			if (source.isAlly(target)) {
				if (!this.heal(Math.floor(target.baseMaxhp * (source.ability === 'cannoneer' ? 0.75 : 0.5)))) {
					if (target.volatiles['healblock'] && target.hp !== target.maxhp) {
						this.attrLastMove('[still]');
						this.add('cant', source, 'move: Heal Block', move);
					} else {
						this.add('-immune', target);
					}
					return this.NOT_FAIL;
				}
			}
		},
	},
	haze: {
		inherit: true,
		onHitField() {
			const allNoManagel = this.getAllActive().every(pokemon => !pokemon.hasItem('managel'));
			if (allNoManagel) {
				this.add('-clearallboost');
				for (const pokemon of this.getAllActive()) {
					pokemon.clearBoosts();
				}
			} else {
				for (const pokemon of this.getAllActive()) {
					if (!pokemon.hasItem('managel')) {
						pokemon.clearBoosts();
						this.add('-clearboost', pokemon);
					}
				}
			}
		},
	},
	freezyfrost: {
		inherit: true,
		onHit() {
			const allNoManagel = this.getAllActive().every(pokemon => !pokemon.hasItem('managel'));
			if (allNoManagel) {
				this.add('-clearallboost');
				for (const pokemon of this.getAllActive()) {
					pokemon.clearBoosts();
				}
			} else {
				for (const pokemon of this.getAllActive()) {
					if (!pokemon.hasItem('managel')) {
						pokemon.clearBoosts();
						this.add('-clearboost', pokemon);
					}
				}
			}
		},
	},
	clearsmog: {
		inherit: true,
		onHit(target) {
			if (!target.hasItem('managel')) {
				target.clearBoosts();
				this.add('-clearboost', target);
			}
		},
	},
	mistyterrain: {
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
			onSetStatus(status, target, source, effect) {
				if (source.item === 'fieldcleats') return;
				if (!target.isGrounded() || target.isSemiInvulnerable()) return;
				if (effect && ((effect as Move).status || effect.id === 'yawn')) {
					this.add('-activate', target, 'move: Misty Terrain');
				}
				return false;
			},
			onTryAddVolatile(status, target, source, effect) {
				if (source.item === 'fieldcleats') return;
				if (!target.isGrounded() || target.isSemiInvulnerable()) return;
				if (status.id === 'confusion') {
					if (effect.effectType === 'Move' && !effect.secondaries) this.add('-activate', target, 'move: Misty Terrain');
					return null;
				}
			},
			onBasePowerPriority: 6,
			onBasePower(basePower, attacker, defender, move) {
				if (attacker.item === 'fieldcleats') return;
				if (move.type === 'Dragon' && defender.isGrounded() && !defender.isSemiInvulnerable() && move.name !== 'Mist Barrage') {
					this.debug('misty terrain weaken');
					return this.chainModify(0.5);
				}
			},
			onFieldStart(field, source, effect) {
				if (effect?.effectType === 'Ability') {
					this.add('-fieldstart', 'move: Misty Terrain', '[from] ability: ' + effect.name, `[of] ${source}`);
				} else {
					this.add('-fieldstart', 'move: Misty Terrain');
				}
			},
			onFieldResidualOrder: 27,
			onFieldResidualSubOrder: 7,
			onFieldEnd() {
				this.add('-fieldend', 'Misty Terrain');
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
				if (attacker.item === 'fieldcleats') return;
				const weakenedMoves = ['earthquake', 'bulldoze', 'magnitude'];
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
	psychicterrain: {
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
			onTryHitPriority: 4,
			onTryHit(target, source, effect) {
				if (source.item === 'fieldcleats') return;
				if (effect && (effect.priority <= 0.1 || effect.target === 'self')) {
					return;
				}
				if (target.isSemiInvulnerable() || target.isAlly(source)) return;
				if (!target.isGrounded()) {
					const baseMove = this.dex.moves.get(effect.id);
					if (baseMove.priority > 0) {
						this.hint("Psychic Terrain doesn't affect Pokémon immune to Ground.");
					}
					return;
				}
				this.add('-activate', target, 'move: Psychic Terrain');
				return null;
			},
			onBasePowerPriority: 6,
			onBasePower(basePower, attacker, defender, move) {
				if (attacker.item === 'fieldcleats') return;
				if (move.type === 'Psychic' && attacker.isGrounded() && !attacker.isSemiInvulnerable()) {
					this.debug('psychic terrain boost');
					return this.chainModify([5325, 4096]);
				}
			},
			onFieldStart(field, source, effect) {
				if (effect?.effectType === 'Ability') {
					this.add('-fieldstart', 'move: Psychic Terrain', '[from] ability: ' + effect.name, `[of] ${source}`);
				} else {
					this.add('-fieldstart', 'move: Psychic Terrain');
				}
			},
			onFieldResidualOrder: 27,
			onFieldResidualSubOrder: 7,
			onFieldEnd() {
				this.add('-fieldend', 'move: Psychic Terrain');
			},
		},
	},
	electricterrain: {
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
			onSetStatus(status, target, source, effect) {
				if (source.item === 'fieldcleats') return;
				if (status.id === 'slp' && target.isGrounded() && !target.isSemiInvulnerable()) {
					if (effect.id === 'yawn' || (effect.effectType === 'Move' && !effect.secondaries)) {
						this.add('-activate', target, 'move: Electric Terrain');
					}
					return false;
				}
			},
			onTryAddVolatile(status, target, source) {
				if (source.item === 'fieldcleats') return;
				if (!target.isGrounded() || target.isSemiInvulnerable()) return;
				if (status.id === 'yawn') {
					this.add('-activate', target, 'move: Electric Terrain');
					return null;
				}
			},
			onBasePowerPriority: 6,
			onBasePower(basePower, attacker, defender, move) {
				if (attacker.item === 'fieldcleats') return;
				if (move.type === 'Electric' && attacker.isGrounded() && !attacker.isSemiInvulnerable()) {
					this.debug('electric terrain boost');
					return this.chainModify([5325, 4096]);
				}
			},
			onFieldStart(field, source, effect) {
				if (effect?.effectType === 'Ability') {
					this.add('-fieldstart', 'move: Electric Terrain', '[from] ability: ' + effect.name, `[of] ${source}`);
				} else {
					this.add('-fieldstart', 'move: Electric Terrain');
				}
			},
			onFieldResidualOrder: 27,
			onFieldResidualSubOrder: 7,
			onFieldEnd() {
				this.add('-fieldend', 'move: Electric Terrain');
			},
		},
	},
	grassyglide: {
		inherit: true,
		onModifyPriority(priority, source, target, move) {
			if (source.item === 'fieldcleats') return;
			if (this.field.isTerrain('grassyterrain') && source.isGrounded()) {
				return priority + 1;
			}
		},
	},
	camouflage: {
		inherit: true,
		onHit(target) {
			if (target.item === 'fieldcleats') return;
			let newType = 'Normal';
			if (this.field.isTerrain('electricterrain')) {
				newType = 'Electric';
			} else if (this.field.isTerrain('grassyterrain')) {
				newType = 'Grass';
			} else if (this.field.isTerrain('mistyterrain')) {
				newType = 'Fairy';
			} else if (this.field.isTerrain('psychicterrain')) {
				newType = 'Psychic';
			}

			if (target.getTypes().join() === newType || !target.setType(newType)) return false;
			this.add('-start', target, 'typechange', newType);
		},
	},
	expandingforce: {
		inherit: true,
		onBasePower(basePower, source) {
			if (source.item === 'fieldcleats') return;
			if (this.field.isTerrain('psychicterrain') && source.isGrounded()) {
				this.debug('terrain buff');
				return this.chainModify(1.5);
			}
		},
		onModifyMove(move, source, target) {
			if (source.item === 'fieldcleats') return;
			if (this.field.isTerrain('psychicterrain') && source.isGrounded()) {
				move.target = 'allAdjacentFoes';
			}
		},
	},
	floralhealing: {
		inherit: true,
		onHit(target, source) {
			let success = false;
			if (this.field.isTerrain('grassyterrain') && source.item !== 'fieldcleats') {
				success = !!this.heal(this.modify(target.baseMaxhp, 0.667));
			} else {
				success = !!this.heal(Math.ceil(target.baseMaxhp * 0.5));
			}
			if (success && !target.isAlly(source)) {
				target.staleness = 'external';
			}
			if (!success) {
				this.add('-fail', target, 'heal');
				return this.NOT_FAIL;
			}
			return success;
		},
	},
	naturepower: {
		inherit: true,
		onTryHit(target, pokemon) {
			let move = 'triattack';
			if (pokemon.item !== 'fieldcleats') {
				if (this.field.isTerrain('electricterrain')) {
					move = 'thunderbolt';
				} else if (this.field.isTerrain('grassyterrain')) {
					move = 'energyball';
				} else if (this.field.isTerrain('mistyterrain')) {
					move = 'moonblast';
				} else if (this.field.isTerrain('psychicterrain')) {
					move = 'psychic';
				}
			}
			this.actions.useMove(move, pokemon, { target });
			return null;
		},
	},
	mistyexplosion: {
		inherit: true,
		onBasePower(basePower, source) {
			if (source.item === 'fieldcleats') return;
			if (this.field.isTerrain('mistyterrain') && source.isGrounded()) {
				this.debug('misty terrain boost');
				return this.chainModify(1.5);
			}
		},
	},
	psyblade: {
		inherit: true,
		onBasePower(basePower, source) {
			if (source.item === 'fieldcleats') return;
			if (this.field.isTerrain('electricterrain')) {
				this.debug('psyblade electric terrain boost');
				return this.chainModify(1.5);
			}
		},
	},
	secretpower: {
		inherit: true,
		onModifyMove(move, pokemon) {
			if (this.field.isTerrain('')) return;
			if (pokemon.item === 'fieldcleats') return;
			move.secondaries = [];
			if (this.field.isTerrain('electricterrain')) {
				move.secondaries.push({
					chance: 30,
					status: 'par',
				});
			} else if (this.field.isTerrain('grassyterrain')) {
				move.secondaries.push({
					chance: 30,
					status: 'slp',
				});
			} else if (this.field.isTerrain('mistyterrain')) {
				move.secondaries.push({
					chance: 30,
					boosts: {
						spa: -1,
					},
				});
			} else if (this.field.isTerrain('psychicterrain')) {
				move.secondaries.push({
					chance: 30,
					boosts: {
						spe: -1,
					},
				});
			}
		},
	},
	taunt: {
		inherit: true,
		condition: {
			inherit: true,
			duration: 3,
			durationCallback(target, source, effect) {
				if (effect?.name === "Shrouded Blows") {
					return 2;
				}
				return 3;
			},
			onDisableMove(pokemon) {
				for (const moveSlot of pokemon.moveSlots) {
					const move = this.dex.moves.get(moveSlot.id);
					if (move.category === 'Status' && !['mefirst', 'ringtrue'].includes(move.id)) {
						pokemon.disableMove(moveSlot.id);
					}
				}
			},
			onBeforeMovePriority: 5,
			onBeforeMove(attacker, defender, move) {
				if (!(move.isZ && move.isZOrMaxPowered) && move.category === 'Status' && !['mefirst', 'ringtrue'].includes(move.id)) {
					this.add('cant', attacker, 'move: Taunt', move);
					return false;
				}
			},
		},
	},
	attract: {
		inherit: true,
		condition: {
			inherit: true,
			onBeforeMove(pokemon, target, move) {
				if (move.id === 'ringtrue') return;
				this.add('-activate', pokemon, 'move: Attract', `[of] ${this.effectState.source}`);
				if (this.randomChance(1, 2)) {
					this.add('cant', pokemon, 'Attract');
					return false;
				}
			},
		},
	},
	disable: {
		inherit: true,
		condition: {
			inherit: true,
			onBeforeMovePriority: 7,
			onBeforeMove(attacker, defender, move) {
				if (!(move.isZ && move.isZOrMaxPowered) && move.id === this.effectState.move && move.id !== 'ringtrue') {
					this.add('cant', attacker, 'Disable', move);
					return false;
				}
			},
			onDisableMove(pokemon) {
				for (const moveSlot of pokemon.moveSlots) {
					if (moveSlot.id === this.effectState.move) {
						if (moveSlot.id !== 'ringtrue') pokemon.disableMove(moveSlot.id);
					}
				}
			},
		},
	},
	encore: {
		inherit: true,
		condition: {
			inherit: true,
			onOverrideAction(pokemon, target, move) {
				if (move.id !== this.effectState.move && move.id !== 'ringtrue') return this.effectState.move;
			},
		},
	},
	ragingbull: {
		inherit: true,
		onModifyType(move, pokemon) {
			switch (pokemon.species.name) {
			case 'Tauros-Paldea-Combat':
			case "Chargin' Chuck":
				move.type = 'Fighting';
				break;
			case 'Tauros-Paldea-Blaze':
				move.type = 'Fire';
				break;
			case 'Tauros-Paldea-Aqua':
				move.type = 'Water';
				break;
			}
		},
	},
	charge: {
		inherit: true,
		condition: {
			inherit: true,
			onStart(pokemon, source, effect) {
				if (effect && ['Electromorphosis', 'Wind Power', 'Voltaic Siphon'].includes(effect.name)) {
					this.add('-start', pokemon, 'Charge', this.activeMove!.name, '[from] ability: ' + effect.name);
				} else {
					this.add('-start', pokemon, 'Charge');
				}
			},
			onRestart(pokemon, source, effect) {
				if (effect && ['Electromorphosis', 'Wind Power', 'Voltaic Siphon'].includes(effect.name)) {
					this.add('-start', pokemon, 'Charge', this.activeMove!.name, '[from] ability: ' + effect.name);
				} else {
					this.add('-start', pokemon, 'Charge');
				}
			},
			onAfterMove(pokemon, target, move) {
				if (pokemon.ability === 'voltaicsiphon' && move.drain && pokemon.moveThisTurnResult) return;
				if (move.type === 'Electric' && move.id !== 'charge') {
					pokemon.removeVolatile('charge');
				}
			},
		},
	},
	runtimeexception: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Runtime Exception",
		desc: "The user randomly uses Flare Blitz, Iron Head, Psychic, or Wild Charge.",
		shortDesc: "Randomly executes one of 4 powerful moves.",
		pp: 10,
		priority: 0,
		flags: { failencore: 1, nosleeptalk: 1, noassist: 1, failcopycat: 1, failmimic: 1, failinstruct: 1 },
		onHit(target, source, effect) {
			const moves = ['flareblitz', 'ironhead', 'psychic', 'wildcharge'];
			const randomMove = this.sample(moves);
			source.side.lastSelectedMove = this.toID(randomMove);
			this.actions.useMove(randomMove, target);
		},
		target: "self",
		type: "Steel",
		contestType: "Cute",
	},
	deserttempest: {
		num: 0,
		accuracy: 90,
		basePower: 80,
		category: "Special",
		name: "Desert Tempest",
		shortDesc: "Summons Sandstorm. Smooth Rock: x1.2 damage.",
		pp: 15,
		priority: 0,
		onBasePower(basePower, pokemon, target) {
			if (pokemon.item === "smoothrock") {
				return this.chainModify(1.2);
			}
		},
		flags: { protect: 1, mirror: 1 },
		weather: 'sandstorm',
		target: "normal",
		type: "Rock",
		contestType: "Beautiful",
	},
	subzerostorm: {
		num: 0,
		accuracy: 90,
		basePower: 80,
		category: "Physical",
		name: "Subzero Storm",
		shortDesc: "Summons Snow. Icy Rock: x1.2 damage.",
		pp: 15,
		priority: 0,
		onBasePower(basePower, pokemon, target) {
			if (pokemon.item === "icyrock") {
				return this.chainModify(1.2);
			}
		},
		flags: { protect: 1, mirror: 1 },
		weather: 'snowscape',
		target: "normal",
		type: "Ice",
		contestType: "Beautiful",
	},
	fierymaelstrom: {
		num: 0,
		accuracy: 90,
		basePower: 80,
		category: "Special",
		name: "Fiery Maelstrom",
		shortDesc: "Summons Sun. Heat Rock: x1.2 damage.",
		pp: 15,
		priority: 0,
		onBasePower(basePower, pokemon, target) {
			if (pokemon.item === "heatrock") {
				return this.chainModify(1.2);
			}
		},
		flags: { protect: 1, mirror: 1 },
		weather: 'sunnyday',
		target: "normal",
		type: "Fire",
		contestType: "Beautiful",
	},
	bulwark: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Bulwark",
		shortDesc: "Sets the effects of Light Screen and Reflect.",
		pp: 5,
		priority: -1,
		flags: { protect: 1, mirror: 1 },
		onHit(source) {
			source.side.addSideCondition('reflect');
			source.side.addSideCondition('lightscreen');
		},
		target: "self",
		type: "Psychic",
		zMove: { boost: { def: 1, spd: 1 } },
		contestType: "Clever",
	},
	pixietrick: {
		num: 0,
		accuracy: 100,
		basePower: 90,
		category: "Physical",
		name: "Pixie Trick",
		shortDesc: "0.5x damage if foe isn't holding an item. Swaps items.",
		pp: 10,
		priority: 0,
		flags: { contact: 1, protect: 1, mirror: 1, failmefirst: 1, noassist: 1, failcopycat: 1 },
		onBasePower(basePower, pokemon, target, move) {
			if (!target.getItem().exists) return this.chainModify([1, 2]);
		},
		onAfterHit(target, source, move) {
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
			this.add('-activate', source, 'move: Pixie Trick', `[of] ${target}`);
			if (myItem) {
				target.setItem(myItem);
				this.add('-item', target, myItem, '[from] move: Pixie Trick');
			} else {
				this.add('-enditem', target, yourItem, '[silent]', '[from] move: Pixie Trick');
			}
			if (yourItem) {
				source.setItem(yourItem);
				this.add('-item', source, yourItem, '[from] move: Pixie Trick');
			} else {
				this.add('-enditem', source, myItem, '[silent]', '[from] move: Pixie Trick');
			}
		},
		target: "normal",
		type: "Fairy",
		contestType: "Tough",
	},
	packin: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Pack In",
		desc: "The user restores 1/2 of its maximum HP, rounded half up. Defense is boosted by +1 if Hail or Snow is active.",
		shortDesc: "User heals 50% of its max HP. +1 Def in Hail/Snow.",
		pp: 5,
		priority: 0,
		flags: { snatch: 1, heal: 1, metronome: 1 },
		heal: [1, 2],
		onAfterMove(source, target, move) {
			if (this.field.isWeather(['hail', 'snowscape'])) {
				this.boost({ def: 1 }, source, source);
			}
		},
		target: "self",
		type: "Ice",
		zMove: { effect: 'clearnegativeboost' },
		contestType: "Clever",
	},
	heal: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Heal",
		shortDesc: "Heals the target by 20HP.",
		pp: 1,
		noPPBoosts: true,
		priority: 0,
		flags: { protect: 1, reflectable: 1, distance: 1, heal: 1, allyanim: 1, metronome: 1 },
		onHit(target, source) {
			let success = false;
			success = !!this.heal(20);
			if (!success) {
				this.add('-fail', target, 'heal');
				return this.NOT_FAIL;
			}
			return success;
		},
		target: "adjacentAllyOrSelf",
		type: "Normal",
		zMove: { boost: { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 } },
		contestType: "Beautiful",
	},
	hyperheal: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Hyper Heal",
		shortDesc: "Heals the target by 200HP.",
		pp: 1,
		noPPBoosts: true,
		priority: 0,
		flags: { protect: 1, reflectable: 1, distance: 1, heal: 1, allyanim: 1, metronome: 1 },
		onHit(target, source) {
			let success = false;
			success = !!this.heal(200);
			if (!success) {
				this.add('-fail', target, 'heal');
				return this.NOT_FAIL;
			}
			return success;
		},
		target: "adjacentAllyOrSelf",
		type: "Normal",
		zMove: { effect: 'clearnegativeboost' },
		contestType: "Beautiful",
	},
	fullheal: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Full Heal",
		shortDesc: "Heals the target to full HP.",
		pp: 1,
		noPPBoosts: true,
		priority: 0,
		flags: { protect: 1, reflectable: 1, distance: 1, heal: 1, allyanim: 1, metronome: 1 },
		onHit(target, source) {
			let success = false;
			success = !!this.heal(target.maxhp);
			if (!success) {
				this.add('-fail', target, 'heal');
				return this.NOT_FAIL;
			}
			return success;
		},
		target: "adjacentAllyOrSelf",
		type: "Normal",
		zMove: { effect: 'clearnegativeboost' },
		contestType: "Beautiful",
	},
	sirensong: {
		num: 0,
		accuracy: 100,
		basePower: 95,
		category: "Special",
		name: "Siren Song",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, sound: 1, bypasssub: 1, metronome: 1 },
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
					if (target.volatiles['healblock'] && target.hp !== target.maxhp) {
						this.attrLastMove('[still]');
						this.add('cant', source, 'move: Heal Block', move);
					} else {
						this.add('-immune', target);
					}
					return this.NOT_FAIL;
				}
			}
		},
		secondary: {
			chance: 100,
			onHit(target, source, move) {
				if (target?.statsRaisedThisTurn) {
					target.addVolatile('yawn', source, move);
				}
			},
		},
		shortDesc: "Drowsies if target boosted stats. Heals if target is ally.",
		target: "any",
		type: "Water",
		contestType: "Cool",
	},
	mindwipe: {
		num: 0,
		accuracy: 100,
		basePower: 80,
		category: "Special",
		name: "Mindwipe",
		desc: "Resets all of the target's stat stages to 0.",
		shortDesc: "Resets all of the target's stat stages to 0.",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1 },
		onHit(target) {
			target.clearBoosts();
			this.add('-clearboost', target);
		},
		target: "normal",
		type: "Psychic",
		contestType: "Clever",
	},
	currencyflow: {
		num: 0,
		accuracy: 100,
		basePower: 85,
		category: "Physical",
		name: "Currency Flow",
		shortDesc: "1.5x damage if coins are scattered.",
		pp: 10,
		priority: 0,
		onBasePower(basePower, pokemon, target) {
			if (pokemon.side.getSideCondition('scatteredcoins')) {
				this.add('-activate', pokemon, 'move: Currency Flow');
				return this.chainModify(1.5);
			}
		},
		onAfterHit(source, target, move) {
			target.side.removeSideCondition('scatteredcoins');
		},
		flags: { protect: 1, mirror: 1 },
		target: "normal",
		type: "Ground",
		contestType: "Beautiful",
	},
	rocketgrab: {
		num: 0,
		accuracy: 95,
		basePower: 60,
		category: "Physical",
		name: "Rocket Grab",
		desc: "If an opposing Pokemon switches out this turn, this move hits that Pokemon before it leaves the field, even if it was not the original target. If the user moves after an opponent using Flip Turn, Parting Shot, Teleport, U-turn, or Volt Switch, but not Baton Pass, it will hit that opponent before it leaves the field. Switch is cancelled if the user hits an opponent switching out, and the user's turn is over; if an opponent faints from this, the replacement Pokemon does not become active until the end of the turn. Can't be used twice in a row.",
		shortDesc: "If a foe is switching out, cancels it. Cannot be used twice in a row.",
		pp: 10,
		priority: 0,
		flags: { contact: 1, protect: 1, mirror: 1, metronome: 1, cantusetwice: 1 },
		beforeTurnCallback(pokemon) {
			for (const side of this.sides) {
				if (side.hasAlly(pokemon)) continue;
				side.addSideCondition('rocketgrab', pokemon);
				const data = side.getSideConditionData('rocketgrab');
				if (!data.sources) {
					data.sources = [];
				}
				data.sources.push(pokemon);
			}
		},
		onTryHit(target, pokemon) {
			target.side.removeSideCondition('rocketgrab');
		},
		onHit(target, source, move) {
			if (target.volatiles['grabbed'] && target.getItem().id !== 'shedshell') target.addVolatile('preventswitch');
		},
		condition: {
			duration: 1,
			onBeforeSwitchOut(pokemon) {
				this.debug('Pursuit start');
				let alreadyAdded = false;
				pokemon.removeVolatile('destinybond');
				for (const source of this.effectState.sources) {
					if (!source.isAdjacent(pokemon) || !this.queue.cancelMove(source) || !source.hp) continue;
					if (!alreadyAdded) {
						this.add('-activate', pokemon, 'move: Rocket Grab');
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
					pokemon.addVolatile('grabbed');
					this.actions.runMove('rocketgrab', source, source.getLocOf(pokemon));
					pokemon.removeVolatile('grabbed');
				}
			},
		},
		target: "normal",
		type: "Steel",
		contestType: "Clever",
	},
	jumpship: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Jump Ship",
		desc: "The user restores 1/2 of its maximum HP and heals its status condition, rounded half up. If Manacra, it swaps between plated and radial form.",
		shortDesc: "User is healed 1/2 max HP, status cured. If Manacra, swaps form.",
		pp: 10,
		priority: 0,
		flags: { snatch: 1, heal: 1, metronome: 1 },
		heal: [1, 2],
		onHit(target, pokemon, move) {
			if (pokemon.status) pokemon.cureStatus();
		},
		onAfterMoveSecondarySelf(pokemon) {
			if (pokemon.baseSpecies.baseSpecies === 'Manacra' && !pokemon.transformed) {
				if (pokemon.species.baseSpecies === 'Manacra') {
					const manacraForme = pokemon.species.id === 'manacraplated' ? '' : '-Plated';
					pokemon.formeChange('Manacra' + manacraForme, this.effect, true);
				}
			}
		},
		target: "self",
		type: "Ghost",
		zMove: { effect: 'clearnegativeboost' },
		contestType: "Beautiful",
	},
	psychobarrage: {
		num: 0,
		accuracy: 100,
		basePower: 120,
		category: "Physical",
		name: "Psycho Barrage",
		desc: "The user spends two or three turns locked into this move and becomes confused immediately after its move on the last turn of the effect if it is not already. This move targets an opposing Pokemon at random on each turn. If the user is prevented from moving, is asleep at the beginning of a turn, or the attack is not successful against the target on the first turn of the effect or the second turn of a three-turn effect, the effect ends without causing confusion. If this move is called by Sleep Talk and the user is asleep, the move is used for one turn and does not confuse the user.",
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
		type: "Psychic",
		contestType: "Cool",
	},
	mindtrap: {
		num: 0,
		accuracy: 100,
		basePower: 40,
		basePowerCallback(pokemon, target, move) {
			if (target.beingCalledBack || target.switchFlag) {
				this.debug('Mindtrap damage boost');
				return move.basePower * 2;
			}
			return move.basePower;
		},
		category: "Physical",
		name: "Mindtrap",
		desc: "If an opposing Pokemon switches out this turn, this move hits that Pokemon before it leaves the field, even if it was not the original target. If the user moves after an opponent using Flip Turn, Parting Shot, Teleport, U-turn, or Volt Switch, but not Baton Pass, it will hit that opponent before it leaves the field. Power doubles and no accuracy check is done if the user hits an opponent switching out, and the user's turn is over; if an opponent faints from this, the replacement Pokemon does not become active until the end of the turn.",
		shortDesc: "If a foe is switching out, hits it at 2x power.",
		pp: 20,
		priority: 0,
		flags: { contact: 1, protect: 1, mirror: 1 },
		beforeTurnCallback(pokemon) {
			for (const side of this.sides) {
				if (side.hasAlly(pokemon)) continue;
				side.addSideCondition('mindtrap', pokemon);
				const data = side.getSideConditionData('mindtrap');
				if (!data.sources) {
					data.sources = [];
				}
				data.sources.push(pokemon);
			}
		},
		onModifyMove(move, source, target) {
			if (target?.beingCalledBack || target?.switchFlag) move.accuracy = true;
		},
		onTryHit(target, pokemon) {
			target.side.removeSideCondition('mindtrap');
		},
		condition: {
			duration: 1,
			onBeforeSwitchOut(pokemon) {
				this.debug('Mindtrap start');
				let alreadyAdded = false;
				pokemon.removeVolatile('destinybond');
				for (const source of this.effectState.sources) {
					if (!source.isAdjacent(pokemon) || !this.queue.cancelMove(source) || !source.hp) continue;
					if (!alreadyAdded) {
						this.add('-activate', pokemon, 'move: Mindtrap');
						alreadyAdded = true;
					}
					if (source.canMegaEvo || source.canUltraBurst) {
						for (const [actionIndex, action] of this.queue.entries()) {
							if (action.pokemon === source && action.choice === 'megaEvo') {
								this.actions.runMegaEvo(source);
								this.queue.list.splice(actionIndex, 1);
								break;
							}
						}
					}
					this.actions.runMove('mindtrap', source, source.getLocOf(pokemon));
				}
			},
		},
		target: "normal",
		type: "Psychic",
		contestType: "Clever",
	},
	lycanpounce: {
		num: 0,
		accuracy: 100,
		basePower: 100,
		category: "Physical",
		name: "Lycan Pounce",
		shortDesc: "High crit ratio. Disguises as the first damaging move in the user's moveset.",
		pp: 5,
		priority: 0,
		flags: { contact: 1, protect: 1, mirror: 1 },
		critRatio: 2,
		onModifyMove(move, pokemon, target) {
			let newMoveName;
			for (const moveSlot of pokemon.moveSlots) {
				const temp = this.dex.moves.get(moveSlot.id);
				if (temp.category !== 'Status') {
					newMoveName = temp.name;
					break;
				}
			}
			if (newMoveName) Object.assign(move, { name: newMoveName });
		},
		target: "normal",
		type: "Fighting",
	},
	spudmortar: {
		num: 0,
		accuracy: 100,
		basePower: 120,
		category: "Special",
		name: "Spud Mortar",
		desc: "Deals damage two turns after this move is used. If the user is holding a berry, this move will consume the berry and boost the move's basepower by 50%. At the end of that turn, the damage is calculated at that time and dealt to the Pokemon at the position the target had when the move was used. If the user is no longer active at the time, damage is calculated based on the user's natural Special Attack stat, types, and level, with no boosts from its held item or Ability. Fails if another future move is already in effect for the target's position.",
		shortDesc: "Hits two turns after being used. If holding berry, x1.5 BP, consumes berry.",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, futuremove: 1 },
		onTry(source, target) {
			if (!target.side.addSlotCondition(target, 'futuremove')) return false;
			const item = source.getItem();
			Object.assign(target.side.slotConditions[target.position]['futuremove'], {
				move: 'spudmortar',
				source,
				moveData: {
					id: 'spudmortar',
					name: "Spud Mortar",
					accuracy: 100,
					basePower: item.isBerry ? 180 : 120,
					category: "Special",
					priority: 0,
					flags: { metronome: 1, futuremove: 1 },
					effectType: 'Move',
					type: 'Grass',
				},
			});

			if (item.isBerry) {
				source.setItem('');
				source.lastItem = item.id;
				source.usedItemThisTurn = true;
				this.add('-enditem', source, item.name, '[from] move: Spud Mortar');
			}
			this.add('-start', source, 'Spud Mortar');
			return this.NOT_FAIL;
		},
		target: "normal",
		type: "Grass",
		contestType: "Beautiful",
	},
	quakingthrust: {
		num: 0,
		accuracy: 100,
		basePower: 75,
		basePowerCallback(pokemon, target, move) {
			if (target.newlySwitched || this.queue.willMove(target)) {
				this.debug('Quaking Thrust damage boost');
				return move.basePower * 1.5;
			}
			this.debug('Quaking Thrust NOT boosted');
			return move.basePower;
		},
		category: "Physical",
		name: "Quaking Thrust",
		desc: "x1.5 power if the user moves before the target.",
		shortDesc: "x1.5 power if user moves before the target.",
		pp: 10,
		priority: 0,
		flags: { contact: 1, protect: 1, mirror: 1, metronome: 1, slicing: 1 },
		target: "normal",
		type: "Ground",
	},
	riftjump: {
		num: 0,
		accuracy: true,
		basePower: 0,
		slotCondition: 'riftjump',
		condition: {
			duration: 2,
			onModifyPriority(priority, pokemon) {
				return priority + 1;
			},
			onSwitchIn(pokemon) {
				this.add('-start', pokemon, 'Rift Jump');
			},
			onEnd(pokemon) {
				this.add('-end', pokemon, 'Rift Jump');
			},
		},
		category: "Status",
		name: "Rift Jump",
		desc: "User switches out. The Pokémon switching in will gain +1 priority to any move on their first turn out.",
		shortDesc: "Switch out. Switch-in gains +1 prio for 1 turn.",
		pp: 10,
		priority: 0,
		flags: { metronome: 1 },
		selfSwitch: true,
		target: "self",
		type: "Electric",
		zMove: { effect: 'healreplacement' },
	},
	groundingstomp: {
		num: 0,
		accuracy: 100,
		basePower: 85,
		category: "Physical",
		name: "Grounding Stomp",
		desc: "This move's type effectiveness against Poison is changed to be super effective no matter what this move's type is. This move can hit a target using Bounce, Fly, or Sky Drop, or is under the effect of Sky Drop. If this move hits a target under the effect of Bounce, Fly, Magnet Rise, or Telekinesis, the effect ends. If the target is a Flying type that has not used Roost this turn or a Pokemon with the Levitate Ability, it loses its immunity to Ground-type attacks and the Arena Trap Ability as long as it remains active. During the effect, Magnet Rise fails for the target and Telekinesis fails against the target.",
		shortDesc: "Super effective on Poison. Removes the target's Ground immunity.",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, nonsky: 1, metronome: 1, contact: 1 },
		volatileStatus: 'groundingstomp',
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
				this.add('-start', pokemon, 'Grounding Stomp');
			},
			onRestart(pokemon) {
				if (pokemon.removeVolatile('fly') || pokemon.removeVolatile('bounce')) {
					this.queue.cancelMove(pokemon);
					pokemon.removeVolatile('twoturnmove');
					this.add('-start', pokemon, 'Grounding Stomp');
				}
			},
		},
		onEffectiveness(typeMod, target, type) {
			if (type === 'Poison') return 1;
		},
		target: "normal",
		type: "Fighting",
		contestType: "Tough",
	},
	flameaxe: {
		num: 0,
		accuracy: 100,
		basePower: 80,
		category: "Physical",
		name: "Flame Axe",
		pp: 15,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1, contact: 1, slicing: 1 },
		volatileStatus: 'flameaxe',
		condition: {
			duration: 2,
			onStart(pokemon) {
				this.add('-start', pokemon, 'Flame Axe');
			},
			onTryMovePriority: -2,
			onTryMove(pokemon, target, move) {
				if (move.id === 'stealthrock') {
					this.actions.useMove('hotcoals', pokemon, { target });
					return null;
				}
			},
			onModifyTypePriority: -1,
			onModifyType(move, pokemon) {
				const noModifyType = [
					'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
				];
				if (move.type === 'Rock' && !noModifyType.includes(move.id) &&
					!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
					move.type = 'Fire';
					move.typeChangerBoosted = this.effect;
				}
			},
		},
		target: "normal",
		type: "Fire",
		desc: "Changes foe's Rock-type moves to Fire-type moves for 2 turns.",
		shortDesc: "Changes foe's Rock-type moves to Fire-type for 2 turns.",
	},
	bitethedust: {
		num: 0,
		accuracy: 100,
		basePower: 95,
		category: "Physical",
		name: "Bite the Dust",
		pp: 10,
		priority: 0,
		flags: { contact: 1, protect: 1, mirror: 1, bite: 1, metronome: 1 },
		self: {
			onHit(pokemon, source, move) {
				this.heal(source.maxhp / 8, source, source, move);
			},
		},
		target: "normal",
		shortDesc: "Heals for 1/8th max HP on hit.",
		type: "Ground",
		contestType: "Tough",
	},
	pumpup: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Pump Up",
		pp: 20,
		priority: 0,
		flags: { snatch: 1, metronome: 1 },
		onHit(pokemon) {
			const stat = pokemon.getBestStat(true, true);
			if (pokemon.boosts[stat] >= 6) return false;
			this.boost({ [stat]: 2 }, pokemon);
		},
		target: "self",
		type: "Water",
		shortDesc: "Raises highest stat by 2 stages.",
		zMove: { effect: 'crit2' },
		contestType: "Tough",
	},
	mistbarrage: {
		num: 0,
		accuracy: 95,
		basePower: 80,
		category: "Physical",
		name: "Mist Barrage",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1, contact: 1 },
		onBasePower(basePower, source) {
			if (this.field.isTerrain('mistyterrain')) {
				this.debug('Mist Barrage Misty Terrain Boost');
				return this.chainModify(1.5);
			}
		},
		secondary: {
			chance: 10,
			volatileStatus: 'confusion',
		},
		target: "allAdjacentFoes",
		shortDesc: "During Misty Terrain: 1.5x damage instead of half. 10% chance to confuse.",
		type: "Dragon",
		contestType: "Tough",
	},
	vengefulpulse: {
		num: 0,
		accuracy: 100,
		basePower: 70,
		basePowerCallback(pokemon, target, move) {
			if (pokemon.status && pokemon.status !== 'slp') {
				this.debug('BP boost from status condition');
				return move.basePower * 1.5;
			}
			return move.basePower;
		},
		onTryHit(target, source, move) {
			if (source.status && source.status !== 'slp') move.status = source.status;
		},
		self: {
			onHit(pokemon) {
				if (pokemon.status !== 'slp') {
					pokemon.cureStatus();
				}
			},
		},
		category: "Special",
		name: "Vengeful Pulse",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1, bullet: 1, pulse: 1 },
		target: "normal",
		type: "Ghost",
		zMove: { basePower: 160 },
		contestType: "Clever",
		shortDesc: "1.5x power if user is burn/poison/paralyzed. Transfers status.",
	},
	meltdown: {
		num: 0,
		accuracy: 100,
		basePower: 180,
		category: "Special",
		name: "Meltdown",
		pp: 5,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1, noparentalbond: 1 },
		onBasePower(basePower, source) {
			if (this.field.isWeather('fallout')) {
				this.debug('fallout boost');
				return this.chainModify(1.5);
			}
		},
		selfdestruct: "always",
		target: "allAdjacent",
		type: "Fire",
		contestType: "Beautiful",
		shortDesc: "User faints. 1.5x power during Fallout.",
	},
	rebootandretry: {
		num: 0,
		accuracy: 80,
		basePower: 70,
		category: "Special",
		name: "Reboot and Retry",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1 },
		basePowerCallback(pokemon, target, move) {
			if (pokemon.moveLastTurnResult === false) {
				this.debug('doubling Reboot and Retry BP due to previous move failure');
				return move.basePower * 2;
			}
			return move.basePower;
		},
		target: "normal",
		type: "Electric",
		contestType: "Beautiful",
		shortDesc: "Power doubles if the user's last move failed.",
	},
	rampartsmight: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Physical",
		name: "Rampart's Might",
		pp: 10,
		priority: -5,
		flags: { protect: 1, mirror: 1, metronome: 1, failmefirst: 1 },
		priorityChargeCallback(pokemon) {
			pokemon.addVolatile('rampartsmight');
		},
		condition: {
			duration: 1,
			onStart(target, source, effect) {
				if (effect?.id === 'zpower') {
					this.add('-singleturn', target, 'move: Ramparts Might', '[zeffect]');
				} else {
					this.add('-singleturn', target, 'move: Ramparts Might');
				}
			},
			onFoeRedirectTargetPriority: 1,
			onFoeRedirectTarget(target, source, source2, move) {
				if (!this.effectState.target.isSkyDropped() && this.validTarget(this.effectState.target, source, move.target)) {
					if (move.smartTarget) move.smartTarget = false;
					this.debug("Ramparts Might redirected target of move");
					return this.effectState.target;
				}
			},
		},
		damageCallback(pokemon) {
			const lastDamagedBy = pokemon.getLastDamagedBy(true);
			if (lastDamagedBy !== undefined) {
				return (lastDamagedBy.damage * 1.5) || 1;
			}
			return 0;
		},
		onTry(source) {
			const lastDamagedBy = source.getLastDamagedBy(true);
			if (!lastDamagedBy?.thisTurn) return false;
		},
		onModifyTarget(targetRelayVar, source, target, move) {
			const lastDamagedBy = source.getLastDamagedBy(true);
			if (lastDamagedBy) {
				targetRelayVar.target = this.getAtSlot(lastDamagedBy.slot);
			}
		},
		target: "scripted",
		type: "Rock",
		contestType: "Cool",
		shortDesc: "The foes' moves target the user. Returns last damage taken at 1.5x power.",
	},
	severedsidearm: {
		num: 0,
		accuracy: 100,
		basePower: 55,
		category: "Special",
		name: "Severed Sidearm",
		pp: 20,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1 },
		target: "normal",
		type: "Electric",
		onModifyPriority(priority, source, target, move) {
			if (source.hp <= source.maxhp / 2) {
				return priority + 1;
			}
		},
		contestType: "Cool",
		shortDesc: "User's HP is 50% or less: +1 priority.",
	},
	pressureburst: {
		num: 0,
		accuracy: 100,
		basePower: 70,
		category: "Physical",
		name: "Pressure Burst",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1 },
		onAfterHit(target, source, move) {
			source.addVolatile('aquaring', source);
			for (const allyActive of source.adjacentAllies()) {
				allyActive.addVolatile('aquaring', source);
			}
		},
		onAfterSubDamage(damage, target, source, move) {
			source.addVolatile('aquaring', source);
			for (const allyActive of source.adjacentAllies()) {
				allyActive.addVolatile('aquaring', source);
			}
		},
		target: "normal",
		type: "Water",
		contestType: "Cool",
		shortDesc: "Sets Aqua Ring for every Pokemon on user's side.",
	},
	deadsilence: {
		num: 0,
		accuracy: 100,
		basePower: 80,
		category: "Special",
		name: "Dead Silence",
		pp: 10,
		priority: 0,
		flags: {
			protect: 1, failmefirst: 1, nosleeptalk: 1, noassist: 1, failcopycat: 1, failinstruct: 1,
		},
		priorityChargeCallback(pokemon) {
			pokemon.addVolatile('deadsilence');
		},
		onAfterHit(pokemon, target, move) {
			if (!pokemon.volatiles['deadsilence']?.lostFocus) {
				pokemon.addVolatile('perishsong');
				target.addVolatile('perishsong');
			}
		},
		condition: {
			duration: 1,
			onStart(pokemon) {
				this.add('-singleturn', pokemon, 'move: Dead Silence');
			},
			onHit(pokemon, source, move) {
				if (move.category !== 'Status') {
					this.effectState.lostFocus = true;
				}
			},
			onTryAddVolatile(status, pokemon) {
				if (status.id === 'flinch') return null;
			},
		},
		target: "normal",
		type: "Ghost",
		contestType: "Tough",
		shortDesc: "Sets Perish Song.",
	},
	brutalcalamity: {
		num: 0,
		accuracy: 100,
		basePower: 75,
		category: "Special",
		name: "Brutal Calamity",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1 },
		onHit() {
			this.field.removePseudoWeather('magicroom');
			this.field.removePseudoWeather('trickroom');
			this.field.removePseudoWeather('wonderroom');
		},
		onBasePower(basePower, source, target, move) {
			if (
				this.field.getPseudoWeather('trickroom') || this.field.getPseudoWeather('wonderroom') ||
				this.field.getPseudoWeather('magicroom')
			) {
				return this.chainModify(2);
			}
		},
		target: "normal",
		type: "Fire",
		contestType: "Beautiful",
		shortDesc: "2x BP in Trick Room, Wonder Room and Magic Room. Clears Rooms.",
	},
	misersmaul: {
		num: 0,
		accuracy: 100,
		basePower: 90,
		category: "Physical",
		name: "Miser's Maul",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1, contact: 1 },
		onAfterMoveSecondarySelf(pokemon, target, move) {
			if (!target || target.fainted || target.hp <= 0) pokemon.side.addSideCondition('scatteredcoins');
		},
		target: "normal",
		type: "Ghost",
		contestType: "Clever",
		shortDesc: "Scatters coins if this KOes the target.",
	},
	starlightcalling: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Starlight Calling",
		pp: 10,
		priority: 0,
		flags: { snatch: 1, heal: 1, metronome: 1 },
		onAfterMove(source, target, move) {
			if (source.species.id === 'tenkibo') {
				source.formeChange('Tenkibo-Magical-Hero', this.effect, false, '0', '[msg]');
			}
		},
		secondary: {},
		heal: [1, 3],
		target: "self",
		type: "Fairy",
		contestType: "Clever",
		shortDesc: "Heals 33%, transform into Tenkibo-Magical-Hero. If Tenkibo-Magical-Hero, 100BP Special move.",
	},
	foolsgambit: {
		num: 0,
		accuracy: 100,
		basePower: 120,
		category: "Physical",
		name: "Fool's Gambit",
		pp: 5,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1, contact: 1, bite: 1 },
		onModifyMove(move, pokemon, target) {
			if (!target) return;
			const atk = pokemon.getStat('atk', false, true);
			const userDef = pokemon.getStat('def', false, true);
			const def = target.getStat('def', false, true);
			const physical = Math.floor(Math.floor(Math.floor(Math.floor(2 * pokemon.level / 5 + 2) * 90 * atk) / def) / 50);
			const defense = Math.floor(Math.floor(Math.floor(Math.floor(2 * pokemon.level / 5 + 2) * 90 * userDef) / def) / 50);
			if (defense > physical || (defense === physical && this.randomChance(1, 2))) {
				move.overrideOffensiveStat = 'def';
			}
		},
		self: {
			boosts: {
				def: -2,
			},
		},
		target: "normal",
		type: "Dark",
		contestType: "Beautiful",
		shortDesc: "Lowers the user's Def by 2. Uses Def. if it would be stronger.",
	},
	chitinsnare: {
		num: 0,
		accuracy: 100,
		basePower: 70,
		category: "Special",
		name: "Chitin Snare",
		pp: 10,
		priority: 0,
		flags: { protect: 1, allyanim: 1, metronome: 1, contact: 1 },
		onAfterMove(source, target, move) {
			if (!source.moveThisTurnResult) return;
			if (!target.side.addSlotCondition(target, 'futuremove')) return false;
			Object.assign(target.side.slotConditions[target.position]['futuremove'], {
				move: 'chitinsnare',
				source,
				moveData: {
					id: 'chitinsnare',
					name: "Chitin Snare",
					accuracy: 100,
					basePower: 70,
					category: "Special",
					priority: 0,
					flags: { allyanim: 1, metronome: 1, futuremove: 1 },
					ignoreImmunity: false,
					effectType: 'Move',
					type: 'Bug',
				},
			});
			this.add('-start', source, 'move: Chitin Snare');
			return this.NOT_FAIL;
		},
		target: "normal",
		type: "Bug",
		contestType: "Clever",
		shortDesc: "If succesful, hits again 2 turns later.",
	},
	smolderdash: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Smolder Dash",
		pp: 15,
		priority: 0,
		flags: { protect: 1, reflectable: 1, mirror: 1, bypasssub: 1, metronome: 1 },
		onHit(target, pokemon, move) {
			if (!move.hasSheerForce) {
				let hazardRemoved = false;
				if (pokemon.hp && pokemon.removeVolatile('leechseed')) {
					this.add('-end', pokemon, 'Leech Seed', '[from] move: Rapid Spin', `[of] ${pokemon}`);
				}
				const sideConditions = ['spikes', 'toxicspikes', 'stickyweb'];
				for (const condition of sideConditions) {
					if (pokemon.hp && pokemon.side.removeSideCondition(condition)) {
						this.add('-sideend', pokemon.side, this.dex.conditions.get(condition).name, '[from] move: Smolder Dash', `[of] ${pokemon}`);
						hazardRemoved = true;
					}
				}
				if (hazardRemoved) target.trySetStatus('brn', pokemon);
				if (pokemon.hp && pokemon.volatiles['partiallytrapped']) {
					pokemon.removeVolatile('partiallytrapped');
				}
			}
		},
		secondary: {},
		target: "normal",
		type: "Fire",
		contestType: "Cool",
		shortDesc: "Clears grounded hazards, burns if succesful.",
	},
	lunarianforce: {
		num: 0,
		accuracy: 100,
		basePower: 80,
		category: "Special",
		name: "Lunarian Force",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1 },
		onHit(target, source, move) {
			if (this.field.isTerrain('mistyterrain')) target.addVolatile('gastroacid');
		},
		target: "normal",
		type: "Rock",
		contestType: "Beautiful",
		shortDesc: "If Misty Terrain; nullifies the target's Ability.",
	},
	bloominggrace: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Blooming Grace",
		pp: 5,
		priority: 0,
		flags: { charge: 1, nonsky: 1, metronome: 1, nosleeptalk: 1, failinstruct: 1 },
		onTryMove(attacker, defender, move) {
			if (attacker.removeVolatile(move.id)) {
				return;
			}
			this.add('-prepare', attacker, move.name);
			if (attacker.hasType("Poison")) {
				attacker.setType(attacker.getTypes(true).map(type => type === "Poison" ? "Grass" : type));
				this.add('-start', attacker, 'typechange', attacker.getTypes().join('/'), '[from] move: Blooming Grace');
			}
			if (!this.runEvent('ChargeMove', attacker, defender, move)) {
				return;
			}
			attacker.addVolatile('twoturnmove', defender);
			return null;
		},
		boosts: {
			atk: 1,
			def: 1,
			spa: 1,
			spd: 1,
			spe: 1,
		},
		target: "self",
		type: "Grass",
		zMove: { boost: { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 } },
		contestType: "Beautiful",
		shortDesc: "Swaps user's Poison-type to Grass, then raises all stats by 1 turn 2.",
	},
	espressoshot: {
		num: 0,
		accuracy: 100,
		basePower: 65,
		category: "Special",
		name: "Espresso Shot",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1 },
		onModifyMove(move, pokemon, target) {
			if (target?.status === 'brn') move.critRatio = 5;
		},
		target: "normal",
		type: "Fire",
		contestType: "Beautiful",
		shortDesc: "100% crit chance if the target is burned.",
	},
	ringtrue: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Ring True",
		pp: 5,
		priority: 0,
		flags: { noassist: 1, failcopycat: 1, snatch: 1 },
		stallingMove: true,
		onPrepareHit(pokemon) {
			if (pokemon.happiness >= 255 && pokemon.species.id === 'kinette') {
				pokemon.formeChange('Kinette-Unwound', this.effect, true, '0', '[msg]');
			}
			return this.runEvent('StallMove', pokemon);
		},
		onHit(pokemon) {
			pokemon.addVolatile('stall');
			const volatiles = [
				'confusion', 'attract', 'taunt', 'encore', 'torment', 'disable', 'healblock', 'perishsong', 'choicelock',
			];
			for (const volatile of volatiles) {
				pokemon.removeVolatile(volatile);
			}
		},
		target: "self",
		type: "Steel",
		zMove: { effect: 'clearnegativeboost' },
		contestType: "Cute",
		desc: "Ignores and removes confusion, attract, taunt, encore, torment, disable, heal block, perish song, and choice lock volatiles from user. If Kinette and 255+ happiness, turns into Kinette-Unwound. Fails with consecutive uses.",
		shortDesc: "Ignores and removes some volatiles. 255 happiness Kinette: transforms into Kinette-Unwound.",
	},
	flashbomb: {
		num: 0,
		accuracy: 100,
		basePower: 40,
		category: "Special",
		name: "Flash Bomb",
		pp: 10,
		priority: 3,
		flags: { bullet: 1, protect: 1, mirror: 1, metronome: 1 },
		onTry(source) {
			if (source.activeMoveActions > 1) {
				this.hint("Flash Bomb only works on your first turn out.");
				return false;
			}
		},
		secondary: {
			chance: 100,
			volatileStatus: 'flinch',
		},
		target: "normal",
		type: "Fire",
		contestType: "Cute",
		shortDesc: "Hits first. First turn out only. 100% flinch chance.",
	},
	swirlingsands: {
		num: 0,
		accuracy: 100,
		basePower: 50,
		category: "Special",
		name: "Swirling Sands",
		pp: 15,
		priority: 0,
		flags: { contact: 1, protect: 1, mirror: 1, metronome: 1 },
		onAfterHit(target, pokemon, move) {
			if (!move.hasSheerForce) {
				for (const volatile of removeVolatileUniversal) {
					if (pokemon.hp && pokemon.removeVolatile(this.dex.toID(volatile))) {
						this.add('-end', pokemon, volatile, '[from] move: Swirling Sands', `[of] ${pokemon}`);
					}
				}
				const sideConditions = removeAllUniversal;
				for (const condition of sideConditions) {
					if (pokemon.hp && pokemon.side.removeSideCondition(condition)) {
						this.add('-sideend', pokemon.side, this.dex.conditions.get(condition).name, '[from] move: Swirling Sands', `[of] ${pokemon}`);
					}
				}
				if (pokemon.hp && pokemon.volatiles['partiallytrapped']) {
					pokemon.removeVolatile('partiallytrapped');
				}
			}
		},
		onAfterSubDamage(damage, target, pokemon, move) {
			if (!move.hasSheerForce) {
				for (const volatile of removeVolatileUniversal) {
					if (pokemon.hp && pokemon.removeVolatile(this.dex.toID(volatile))) {
						this.add('-end', pokemon, volatile, '[from] move: Swirling Sands', `[of] ${pokemon}`);
					}
				}
				const sideConditions = removeAllUniversal;
				for (const condition of sideConditions) {
					if (pokemon.hp && pokemon.side.removeSideCondition(condition)) {
						this.add('-sideend', pokemon.side, this.dex.conditions.get(condition).name, '[from] move: Swirling Sands', `[of] ${pokemon}`);
					}
				}
				if (pokemon.hp && pokemon.volatiles['partiallytrapped']) {
					pokemon.removeVolatile('partiallytrapped');
				}
			}
		},
		secondary: {
			chance: 100,
			boosts: {
				spe: -1,
			},
		},
		target: "normal",
		type: "Ground",
		contestType: "Cool",
		desc: "If this move is successful and the user has not fainted, the effects of Leech Seed and binding moves end for the user, and all hazards are removed from the user's side of the field. Has a 100% chance to lower the targets's Speed by 1 stage.",
		shortDesc: "Free user from hazards/bind/Leech Seed. Foe: -1 Spe.",
	},
	flockshock: {
		num: 0,
		accuracy: 100,
		basePower: 70,
		category: "Special",
		name: "Flock Shock",
		pp: 10,
		priority: 0,
		flags: { protect: 1, allyanim: 1, metronome: 1, futuremove: 1 },
		onHit(target, source, move) {
			if (!target.side.addSlotCondition(target, 'futuremove')) return false;
			Object.assign(target.side.slotConditions[target.position]['futuremove'], {
				move: 'flockshock',
				source,
				moveData: {
					id: 'flockshock',
					name: "Flock Shock",
					accuracy: 100,
					basePower: 70,
					category: "Special",
					priority: 0,
					flags: { allyanim: 1, metronome: 1, futuremove: 1 },
					effectType: 'Move',
					type: 'Electric',
				},
			});
			this.add('-start', target, 'move: Flock Shock');
			return this.NOT_FAIL;
		},
		target: "normal",
		type: "Psychic",
		contestType: "Clever",
		shortDesc: "Electric version hits again two turns after being used.",
	},
	ashenpirouette: {
		num: 0,
		accuracy: 100,
		basePower: 70,
		category: "Special",
		name: "Ashen Pirouette",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1, dance: 1 },
		onHit(pokemon, source) {
			const item = pokemon.getItem();
			if (pokemon.takeItem(source) && !pokemon.hasType('Fire')) {
				this.add('-enditem', pokemon, item.name, '[from] move: Ashen Pirouette');
			}
		},
		target: "allAdjacent",
		type: "Fire",
		contestType: "Tough",
		shortDesc: "Hits adjacent Pokemon. Destroys the foe(s) item.",
	},
	crescendo: {
		num: 0,
		accuracy: 100,
		basePower: 80,
		category: "Special",
		name: "Crescendo",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1, sound: 1 },
		beforeMoveCallback(pokemon) {
			if (pokemon.lastMove?.flags.sound) pokemon.addVolatile("crescendo");
			if (!pokemon.lastMove?.flags.sound && pokemon.volatiles["crescendo"]) pokemon.removeVolatile("crescendo");
		},
		basePowerCallback(pokemon, target, move) {
			if (pokemon.volatiles['crescendo']) {
				this.debug('doubling Crescendo due to last used move being a sound move');
				return move.basePower * 2;
			}
			return move.basePower;
		},
		target: "normal",
		type: "Water",
		contestType: "Tough",
		shortDesc: "1.5x power if last move was sound move.",
	},
	rhythmicrattle: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Rhythmic Rattle",
		pp: 10,
		priority: 0,
		flags: { protect: 1, reflectable: 1, heal: 1, metronome: 1 },
		onHit(target, source) {
			let heal = false;
			for (const pokemon of this.getAllActive()) {
				if (source === pokemon) continue;
				let activate = false;
				const boosts: SparseBoostsTable = {};
				let i: BoostID;
				for (i in pokemon.boosts) {
					if (pokemon.boosts[i] < 0) {
						activate = true;
						boosts[i] = 0;
					}
				}
				if (activate) {
					heal = true;
					pokemon.setBoost(boosts);
					this.add('-clearnegativeboost', pokemon, '[silent]');
				}
			}
			if (heal) {
				this.heal(Math.ceil(source.maxhp * 0.5), source);
			}
		},
		target: "self",
		type: "Fairy",
		zMove: { boost: { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 } },
		contestType: "Beautiful",
		shortDesc: "Heals 50% Max HP if any adjacent pokemon has lowere stat stage. Restores all lowered stats to 0.",
	},
	relentlesssting: {
		num: 0,
		accuracy: 100,
		basePower: 25,
		category: "Physical",
		name: "Relentless Sting",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1, contact: 1 },
		multihit: 3,
		basePowerCallback(pokemon, target, move) {
			if (target.status === 'psn') move.willCrit = true;
			return move.basePower;
		},
		secondary: {
			chance: 20,
			status: 'psn',
		},
		target: "normal",
		type: "Bug",
		contestType: "Beautiful",
		shortDesc: "Hits 3 times. 20% to poison. Crits poisoned foes.",
	},
	ancientvisage: {
		num: 0,
		accuracy: 100,
		basePower: 80,
		category: "Physical",
		name: "Ancient Visage",
		pp: 10,
		priority: -3,
		flags: { protect: 1, failmefirst: 1, nosleeptalk: 1, noassist: 1, failcopycat: 1, failinstruct: 1 },
		priorityChargeCallback(pokemon) {
			pokemon.addVolatile('ancientvisage');
		},
		condition: {
			duration: 1,
			onStart(pokemon) {
				this.add('-singleturn', pokemon, 'move: Ancient Visage');
			},
			onHit(target, source, move) {
				if (this.checkMoveMakesContact(move, source, target, true)) {
					this.damage(source.baseMaxhp / 8, source, target);
				}
			},
		},
		onAfterMove(pokemon) {
			pokemon.removeVolatile('ancientvisage');
		},
		target: "normal",
		type: "Ground",
		contestType: "Tough",
		shortDesc: "Deals 1/8 Max HP on contact with the user before it moves.",
	},
	dropin: {
		num: 0,
		accuracy: 100,
		basePower: 50,
		category: "Physical",
		name: "Drop In",
		pp: 20,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1 },
		onHit(target, source, move) {
			this.field.setTerrain('psychicterrain');
		},
		target: "normal",
		type: "Psychic",
		contestType: "Tough",
		shortDesc: "Sets Psychic Terrain on hit.",
	},
};
