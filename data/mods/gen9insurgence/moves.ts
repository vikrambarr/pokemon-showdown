export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	trickroom: {
		inherit: true,
		condition: {
			duration: 5,
			durationCallback(source, effect) {
				let modifiedDuration = 5;
				if (source?.hasAbility('persistent')) {
					this.add('-activate', source, 'ability: Persistent', '[move] Trick Room');
					modifiedDuration += 2;
				}
				if (source?.hasItem('trickrock')) {
					modifiedDuration += 3;
				}
				return modifiedDuration;
			},
			onFieldStart(target, source) {
				if (source?.hasAbility('persistent')) {
					this.add('-fieldstart', 'move: Trick Room', `[of] ${source}`, '[persistent]');
				} else {
					this.add('-fieldstart', 'move: Trick Room', `[of] ${source}`);
				}
			},
			onFieldRestart(target, source) {
				this.field.removePseudoWeather('trickroom');
			},
			onFieldResidualOrder: 27,
			onFieldResidualSubOrder: 1,
			onFieldEnd() {
				this.add('-fieldend', 'move: Trick Room');
			},
		},
	},
	wish: {
		inherit: true,
		condition: {},
		onTry(source) {
			if (source.hasAbility('periodicorbit')) {
				return !!source.side.addSlotCondition(source, 'orbitalwish');
			}
		},
	},
	futuresight: {
		inherit: true,
		onTry(source, target) {
			const futureMoveData = {
				duration: 3,
				move: 'futuresight',
				source,
				moveData: {
					id: 'futuresight',
					name: "Future Sight",
					accuracy: 100,
					basePower: 120,
					category: "Special",
					priority: 0,
					flags: { allyanim: 1, metronome: 1, futuremove: 1 },
					ignoreImmunity: false,
					effectType: 'Move',
					type: 'Psychic',
				},
			};
			if (!target.side.addSlotCondition(target, 'futuremove')) return false;
			Object.assign(target.side.slotConditions[target.position]['futuremove'], futureMoveData);
			if (source.hasAbility('periodicorbit')) {
				if (!target.side.addSlotCondition(target, 'orbitalfuturemove')) return false;
				Object.assign(target.side.slotConditions[target.position]['orbitalfuturemove'], { ...futureMoveData, duration: 5 });
			}
			this.add('-start', source, 'move: Future Sight');
			return this.NOT_FAIL;
		},
	},
	doomdesire: {
		inherit: true,
		onTry(source, target) {
			const futureMoveData = {
				move: 'doomdesire',
				source,
				moveData: {
					id: 'doomdesire',
					name: "Doom Desire",
					accuracy: 100,
					basePower: 140,
					category: "Special",
					priority: 0,
					flags: { metronome: 1, futuremove: 1 },
					effectType: 'Move',
					type: 'Steel',
				},
			};
			if (!target.side.addSlotCondition(target, 'futuremove')) return false;
			Object.assign(target.side.slotConditions[target.position]['futuremove'], futureMoveData);
			if (source.hasAbility('periodicorbit')) {
				if (!target.side.addSlotCondition(target, 'orbitalfuturemove')) return false;
				Object.assign(target.side.slotConditions[target.position]['orbitalfuturemove'], { ...futureMoveData, duration: 5 });
			}
			this.add('-start', source, 'Doom Desire');
			return this.NOT_FAIL;
		},
	},
	phantomforce: {
		inherit: true,
		onTryMove(attacker, defender, move) {
			if (attacker.removeVolatile(move.id)) {
				return;
			}
			this.add('-prepare', attacker, move.name);
			if (attacker.effectiveWeather() === 'newmoon') {
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
		condition: {
			duration: 2,
			onInvulnerability: false,
		},
	},
	shadowforce: {
		inherit: true,
		onTryMove(attacker, defender, move) {
			if (attacker.removeVolatile(move.id)) {
				return;
			}
			this.add('-prepare', attacker, move.name);
			if (attacker.effectiveWeather() === 'newmoon') {
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
		condition: {
			duration: 2,
			onInvulnerability: false,
		},
	},
	weatherball: {
		inherit: true,
		onModifyType(move, pokemon) {
			switch (pokemon.effectiveWeather()) {
			case 'sunnyday':
			case 'desolateland':
				move.type = 'Fire';
				break;
			case 'raindance':
			case 'primordialsea':
				move.type = 'Water';
				break;
			case 'sandstorm':
				move.type = 'Rock';
				break;
			case 'hail':
			case 'snowscape':
				move.type = 'Ice';
				break;
			case 'newmoon':
				move.type = 'Dark';
				break;
			}
		},
		onModifyMove(move, pokemon) {
			switch (pokemon.effectiveWeather()) {
			case 'sunnyday':
			case 'desolateland':
				move.basePower *= 2;
				break;
			case 'raindance':
			case 'primordialsea':
				move.basePower *= 2;
				break;
			case 'sandstorm':
				move.basePower *= 2;
				break;
			case 'hail':
			case 'snowscape':
				move.basePower *= 2;
				break;
			case 'newmoon':
				move.basePower *= 2;
				break;
			}
			this.debug(`BP: ${move.basePower}`);
		},
	},
	synthesis: {
		inherit: true,
		onHit(pokemon) {
			let factor = 0.5;
			switch (pokemon.effectiveWeather(undefined, true)) {
			case 'sunnyday':
			case 'desolateland':
				factor = 0.667;
				break;
			case 'newmoon':
				factor = 0.333;
				break;
			case 'raindance':
			case 'primordialsea':
			case 'sandstorm':
			case 'hail':
			case 'snowscape':
				factor = 0.25;
				break;
			}
			const success = !!this.heal(this.modify(pokemon.maxhp, factor));
			if (!success) {
				this.add('-fail', pokemon, 'heal');
				return this.NOT_FAIL;
			}
			return success;
		},
	},
	morningsun: {
		inherit: true,
		onHit(pokemon) {
			let factor = 0.5;
			switch (pokemon.effectiveWeather(undefined, true)) {
			case 'sunnyday':
			case 'desolateland':
				factor = 0.667;
				break;
			case 'newmoon':
				factor = 0.333;
				break;
			case 'raindance':
			case 'primordialsea':
			case 'sandstorm':
			case 'hail':
			case 'snowscape':
				factor = 0.25;
				break;
			}
			const success = !!this.heal(this.modify(pokemon.maxhp, factor));
			if (!success) {
				this.add('-fail', pokemon, 'heal');
				return this.NOT_FAIL;
			}
			return success;
		},
	},
	moonlight: {
		inherit: true,
		onHit(pokemon) {
			let factor = 0.5;
			switch (pokemon.effectiveWeather(undefined, true)) {
			case 'newmoon':
			case 'sunnyday':
			case 'desolateland':
				factor = 0.667;
				break;
			case 'raindance':
			case 'primordialsea':
			case 'sandstorm':
			case 'hail':
			case 'snowscape':
			case 'fallout':
			case 'thunderstorm':
				factor = 0.25;
				break;
			}
			const success = !!this.heal(this.modify(pokemon.maxhp, factor));
			if (!success) {
				this.add('-fail', pokemon, 'heal');
				return this.NOT_FAIL;
			}
			return success;
		},
	},
	solarbeam: {
		inherit: true,
		onBasePower(basePower, pokemon, target) {
			const weakWeathers = ['raindance', 'primordialsea', 'sandstorm', 'hail', 'snowscape'];
			if (weakWeathers.includes(pokemon.effectiveWeather())) {
				this.debug('weakened by weather');
				return this.chainModify(0.5);
			} else if (pokemon.effectiveWeather() === 'newmoon') { return this.chainModify(0.3); }
		},
	},
	surf: {
		inherit: true,
		onBasePower(basePower, pokemon, target) {
			if (pokemon.effectiveWeather() === 'newmoon') return this.chainModify(1.5);
		},
	},
	honeclaws: {
		inherit: true,
		onModifyMove(move, pokemon, target) {
			if (pokemon.effectiveWeather() === 'newmoon') move.boosts = { atk: 2, accuracy: 2 };
		},
	},
	geomancy: {
		inherit: true,
		onModifyMove(move, pokemon, target) {
			if (pokemon.effectiveWeather() === 'newmoon') move.boosts = { spa: 1, spd: 1, spe: 1 };
		},
	},
	nightmare: {
		inherit: true,
		condition: {
			noCopy: true,
			onStart(pokemon) {
				if (pokemon.status !== 'slp' && !pokemon.hasAbility('comatose')) {
					return false;
				}
				this.add('-start', pokemon, 'Nightmare');
			},
			onResidualOrder: 11,
			onResidual(pokemon) {
				if (pokemon.effectiveWeather() === 'newmoon') this.damage(pokemon.baseMaxhp / 2);
				else this.damage(pokemon.baseMaxhp / 4);
			},
		},
	},
	flash: {
		inherit: true,
		onModifyMove(move, pokemon, target) {
			if (pokemon.effectiveWeather() === 'newmoon') move.boosts = { accuracy: -2 };
		},
	},
	reflect: {
		inherit: true,
		condition: {
			duration: 5,
			durationCallback(target, source, effect) {
				if (source?.hasItem('lightclay')) {
					return 8;
				}
				return 5;
			},
			onAnyModifyDamage(damage, source, target, move) {
				if (target !== source && this.effectState.target.hasAlly(target) && this.getCategory(move) === 'Physical') {
					if (!target.getMoveHitData(move).crit && !move.infiltrates) {
						this.debug('Reflect weaken');
						if (this.field.isWeather('newmoon')) {
							if (this.activePerHalf > 1) return this.chainModify([8, 15]);
							return this.chainModify(0.4);
						} else {
							if (this.activePerHalf > 1) return this.chainModify([2732, 4096]);
							return this.chainModify(0.5);
						}
					}
				}
			},
			onSideStart(side) {
				this.add('-sidestart', side, 'Reflect');
			},
			onSideResidualOrder: 26,
			onSideResidualSubOrder: 1,
			onSideEnd(side) {
				this.add('-sideend', side, 'Reflect');
			},
		},
	},
	lightscreen: {
		inherit: true,
		condition: {
			duration: 5,
			durationCallback(target, source, effect) {
				if (source?.hasItem('lightclay')) {
					return 8;
				}
				return 5;
			},
			onAnyModifyDamage(damage, source, target, move) {
				if (target !== source && this.effectState.target.hasAlly(target) && this.getCategory(move) === 'Special') {
					if (!target.getMoveHitData(move).crit && !move.infiltrates) {
						this.debug('Light Screen weaken');
						if (this.field.isWeather('newmoon')) {
							if (this.activePerHalf > 1) return this.chainModify([8, 15]);
							return this.chainModify(0.4);
						} else {
							if (this.activePerHalf > 1) return this.chainModify([2732, 4096]);
							return this.chainModify(0.5);
						}
					}
				}
			},
			onSideStart(side) {
				this.add('-sidestart', side, 'move: Light Screen');
			},
			onSideResidualOrder: 26,
			onSideResidualSubOrder: 2,
			onSideEnd(side) {
				this.add('-sideend', side, 'move: Light Screen');
			},
		},
	},
	defog: {
		inherit: true,
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
				if (pokemon.hp && pokemon.removeVolatile('leechseed')) {
					this.add('-end', pokemon, 'Leech Seed', '[from] move: Mortal Spin', `[of] ${pokemon}`);
				}
				const sideConditions = [
					'spikes', 'toxicspikes', 'stealthrock', 'hotcoals', 'stickyweb', 'permafrost', 'livewire', 'gmaxsteelsurge',
				];
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
				if (pokemon.hp && pokemon.removeVolatile('leechseed')) {
					this.add('-end', pokemon, 'Leech Seed', '[from] move: Mortal Spin', `[of] ${pokemon}`);
				}
				const sideConditions = [
					'spikes', 'toxicspikes', 'stealthrock', 'hotcoals', 'stickyweb', 'permafrost', 'livewire', 'gmaxsteelsurge',
				];
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
				if (pokemon.hp && pokemon.removeVolatile('leechseed')) {
					this.add('-end', pokemon, 'Leech Seed', '[from] move: Rapid Spin', `[of] ${pokemon}`);
				}
				const sideConditions = [
					'spikes', 'toxicspikes', 'stealthrock', 'hotcoals', 'stickyweb', 'permafrost', 'livewire', 'gmaxsteelsurge',
				];
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
				if (pokemon.hp && pokemon.removeVolatile('leechseed')) {
					this.add('-end', pokemon, 'Leech Seed', '[from] move: Rapid Spin', `[of] ${pokemon}`);
				}
				const sideConditions = [
					'spikes', 'toxicspikes', 'stealthrock', 'hotcoals', 'stickyweb', 'permafrost', 'livewire', 'gmaxsteelsurge',
				];
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
			const removeAll = [
				'spikes', 'toxicspikes', 'stealthrock', 'hotcoals', 'stickyweb', 'permafrost', 'livewire', 'gmaxsteelsurge',
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
			if (success) this.add('-activate', pokemon, 'move: Tidy Up');
			return !!this.boost({ atk: 1, spe: 1 }, pokemon, pokemon, null, false, true) || success;
		},
	},
	courtchange: {
		inherit: true,
		onHitField(target, source) {
			const sideConditions = [
				'mist', 'lightscreen', 'reflect', 'spikes', 'safeguard', 'tailwind', 'toxicspikes', 'stealthrock', 'waterpledge', 'firepledge', 'grasspledge', 'stickyweb', 'auroraveil', 'luckychant', 'gmaxsteelsurge', 'gmaxcannonade', 'gmaxvinelash', 'gmaxwildfire', 'gmaxvolcalith', 'hotcoals', 'permafrost', 'livewire',
			];
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
	relicsong: {
		inherit: true,
		onAfterMoveSecondarySelf(pokemon) {
			if (['Meloetta', 'Meloetta-Delta'].includes(pokemon.baseSpecies.baseSpecies) && !pokemon.transformed) {
				let meloettaForme = '';
				if (pokemon.baseSpecies.baseSpecies === 'Meloetta') {
					meloettaForme = pokemon.species.id === 'meloettapirouette' ? '' : '-Pirouette';
				} if (pokemon.baseSpecies.baseSpecies === 'Meloetta-Delta') {
					meloettaForme = pokemon.species.id === 'meloettadeltamagician' ? '-Delta' : '-Delta-Magician';
				}
				pokemon.formeChange('Meloetta' + meloettaForme, this.effect, false, '0', '[msg]');
			}
		},
	},
	achillesheel: {
		num: 34,
		accuracy: 100,
		basePower: 45,
		category: "Physical",
		name: "Achilles' Heel",
		shortDesc: "Always super effective.",
		desc: "Always deals super effective damage, except against types that would normally be immune to it.",
		pp: 15,
		priority: 0,
		flags: { contact: 1, protect: 1, mirror: 1, nonsky: 1, metronome: 1 },
		onEffectiveness(typeMod, target, type) {
			return 1;
		},
		target: "normal",
		type: "Normal",
		contestType: "Tough",
	},
	jetstream: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Jet Stream",
		desc: "For 2 turns, the user and its party members have their Priority increased by 1. Fails if this move is already in effect for the user's side.",
		shortDesc: "For 2 turns, allies' get +1 Priority.",
		pp: 15,
		priority: 0,
		flags: { snatch: 1, metronome: 1, wind: 1 },
		sideCondition: 'jetstream',
		condition: {
			duration: 2,
			durationCallback(target, source, effect) {
				if (source?.hasAbility('persistent')) {
					this.add('-activate', source, 'ability: Persistent', '[move] Jet Stream');
					return 4;
				}
				return 2;
			},
			onSideStart(side, source) {
				if (source?.hasAbility('persistent')) {
					this.add('-sidestart', side, 'move: Jet Stream', '[persistent]');
				} else {
					this.add('-sidestart', side, 'move: Jet Stream');
				}
			},
			onModifyPriority(priority, source, target, move) {
				return priority + 1;
			},
			onSideResidualOrder: 26,
			onSideResidualSubOrder: 5,
			onSideEnd(side) {
				this.add('-sideend', side, 'move: Jet Stream');
			},
		},
		target: "allySide",
		type: "Dragon",
		zMove: { effect: 'clearnegativeboost' },
		contestType: "Cool",
	},
	livewire: {
		num: 390,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Livewire",
		desc: "Sets up a hazard on the opposing side of the field, with a chance to paralyze each opposing Pokemon that switches in, unless it is a Flying-type Pokemon or has the Levitate Ability. Can be used up to five times before failing. Chance of paralysis is X/5 where X is the number of layers, chance is doubled in rain. Can be removed from the opposing side if any opposing Pokemon uses Mortal Spin, Rapid Spin, or Defog successfully, is hit by Defog, or a grounded Electric or Ground type Pokemon switches in. Safeguard prevents the opposing party from being paralyzed on switch-in, but a substitute does not.",
		shortDesc: "Can paralyze grounded foes on switch-in. Max 5 layers.",
		pp: 20,
		priority: 0,
		flags: { reflectable: 1, nonsky: 1, metronome: 1, mustpressure: 1 },
		sideCondition: 'livewire',
		condition: {
			onSideStart(side) {
				this.add('-sidestart', side, 'move: Livewire');
				this.effectState.layers = 1;
			},
			onSideRestart(side) {
				if (this.effectState.layers >= 5) return false;
				this.add('-sidestart', side, 'move: Livewire');
				this.effectState.layers++;
			},
			onSwitchIn(pokemon) {
				if (!pokemon.isGrounded()) return;
				if (pokemon.hasType('Ground') || pokemon.hasType('Electric')) {
					this.add('-sideend', pokemon.side, 'move: Livewire', `[of] ${pokemon}`);
					pokemon.side.removeSideCondition('livewire');
				} else if (pokemon.hasItem('heavydutyboots')) {
					return;
				} else {
					if (this.randomChance(this.effectState.layers * (this.field.isWeather(['raindance', 'primordialsea']) ? 4 : 2), 10)) {
						pokemon.trySetStatus('par', pokemon.side.foe.active[0]);
					}
				}
			},
		},
		target: "foeSide",
		type: "Electric",
		zMove: { boost: { def: 1 } },
		contestType: "Clever",
	},
	lunarcannon: {
		num: 0,
		accuracy: 100,
		basePower: 105,
		category: "Special",
		name: "Lunar Cannon",
		desc: "This attack charges on the first turn and executes on the second. If the user is holding a Power Herb or the weather is New Moon, the move completes in one turn.",
		shortDesc: "Charges turn 1. Hits turn 2. No charge in new moon.",
		pp: 10,
		priority: 0,
		flags: { charge: 1, protect: 1, mirror: 1, metronome: 1, nosleeptalk: 1, failinstruct: 1 },
		onTryMove(attacker, defender, move) {
			if (attacker.removeVolatile(move.id)) {
				return;
			}
			this.add('-prepare', attacker, move.name);
			if (['newmoon'].includes(attacker.effectiveWeather())) {
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
		type: "Dark",
		contestType: "Cool",
	},
	morph: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		desc: "Functions the same as Transform; however, if a Delta species of the target exists, the user will turn into that instead. If the target has multiple Delta Species, it will select one of them at random.",
		shortDesc: "Transforms into the opponent, prioritizes Delta Form.",
		name: "Morph",
		pp: 10,
		priority: 0,
		flags: { allyanim: 1, failencore: 1, noassist: 1, failcopycat: 1, failmimic: 1, failinstruct: 1 },
		onHit(target, pokemon) {
			if (!pokemon.transformInto(target, this.effect)) return false;
			if (target.species.id.includes('delta')) return true;

			let deltaID: ID = target.species.id;
			let extension = 'delta';

			if (deltaID.includes('beldum')) extension = this.sample(['deltaspider', 'deltaruin']);
			if (deltaID.includes('metang')) extension = this.sample(['deltaspider', 'deltaruin']);
			if (deltaID.includes('metagross')) extension = this.sample(['deltaspider', 'deltaruin']);
			if (deltaID.includes('petilil')) extension = this.sample(['deltawater', 'deltafire']);
			if (deltaID.includes('lilligant')) extension = this.sample(['deltawater', 'deltafire']);
			if (deltaID.includes('dwebble')) extension = this.sample(['deltacake', 'deltaberry']);
			if (deltaID.includes('crustle')) extension = this.sample(['deltacake', 'deltaberry']);

			if (deltaID.endsWith('mega')) {
				deltaID = deltaID.replace('mega', extension + 'mega') as ID;
			} else {
				deltaID = deltaID + extension as ID;
			}

			if (Object.keys(this.dex.data.Pokedex).includes(deltaID)) {
				const deltaSpecies = this.dex.species.get(deltaID);
				if (pokemon.formeChange(deltaSpecies, this.effect)) {
					let abilitySlot = 0;
					if (deltaSpecies.abilities[1]) abilitySlot++;
					if (deltaSpecies.abilities['H']) abilitySlot++;
					abilitySlot = abilitySlot > 0 ? this.random(abilitySlot + 1) : 0;
					if (deltaSpecies.abilities['H'] && (abilitySlot === 2 || (abilitySlot === 1 && !deltaSpecies.abilities[1]))) {
						pokemon.setAbility(deltaSpecies.abilities['H'], pokemon, null, true);
					} else if (deltaSpecies.abilities[1] && abilitySlot === 1) {
						pokemon.setAbility(deltaSpecies.abilities[1], pokemon, null, true);
					} else { pokemon.setAbility(deltaSpecies.abilities[0], pokemon, null, true); }

					const learnsetData = { ...this.dex.data.Learnsets[deltaID.replace('mega', '')]?.learnset };
					const dict: any = {};
					const oldDeltas = [
						'aerodactyldelta', 'aggrondeltai', 'blastoisedeltas', 'charizarddeltae',
						'chimechodelta', 'houndoomdelta', 'machampdelta', 'miloticdeltaf',
						'ninetalesdelta', 'pinsirdelta', 'raichudeltas', 'zangoosedelta',
					];
					const learnPrefix = oldDeltas.includes(deltaID) ? "5L" : "6L";

					for (const move in learnsetData) {
						const learnmoment = learnsetData[move as keyof typeof learnsetData]
							.filter((learn: string) => learn.startsWith(learnPrefix));
						if (learnmoment.length <= 0) continue;
						const learnLvls: number[] = [];
						for (const moment of learnmoment) {
							if (moment.length > 2) learnLvls[learnLvls.length] = parseInt(moment.slice(2));
						}
						for (let i = learnLvls.length - 1; i >= 0; i--) {
							if (learnLvls[i] <= target.level) {
								dict[move] = learnLvls[i];
								break;
							}
						}
					}
					const items = Object.keys(dict).map(key => {
						return [key, dict[key]];
					});
					items.reverse();
					items.sort((first, second) => {
						return second[1] - first[1];
					});
					let numberOfMoves = this.ruleTable.maxMoveCount;
					if (numberOfMoves <= 0) numberOfMoves = 4;
					if (items.length < numberOfMoves) numberOfMoves = items.length;
					if (numberOfMoves > 24) numberOfMoves = 24;
					if (numberOfMoves > 0) {
						pokemon.moveSlots = [];
						for (let i = 0; i < numberOfMoves; i++) {
							const slotMove = this.dex.moves.get(items[i][0]);
							const slotPP = Math.floor(slotMove.noPPBoosts ? slotMove.pp : slotMove.pp * 8 / 5);
							pokemon.moveSlots.push({
								move: slotMove.name,
								id: slotMove.id,
								pp: slotPP === 1 ? 1 : 5,
								maxpp: slotPP === 1 ? 1 : 5,
								target: slotMove.target,
								disabled: false,
								used: false,
								virtual: true,
							});
						}
					}
				}
			}
		},
		target: "normal",
		type: "Normal",
		zMove: { effect: 'heal' },
		contestType: "Clever",
	},
	permafrost: {
		num: 390,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Permafrost",
		desc: "Sets up a hazard on the opposing side of the field, with a chance to freeze each opposing Pokemon that switches in, unless it is a Flying-type Pokemon or has the Levitate Ability. Can be used up to five times before failing. Chance of freeze is X/10 where X is the number of layers, chance is doubled in hail/snow. Can be removed from the opposing side if any opposing Pokemon uses Mortal Spin, Rapid Spin, or Defog successfully, is hit by Defog, or a grounded Ice or Fire type Pokemon switches in. Safeguard prevents the opposing party from being frozen on switch-in, but a substitute does not.",
		shortDesc: "Can freeze grounded foes on switch-in. Max 5 layers.",
		pp: 20,
		priority: 0,
		flags: { reflectable: 1, nonsky: 1, metronome: 1, mustpressure: 1 },
		sideCondition: 'permafrost',
		condition: {
			onSideStart(side) {
				this.add('-sidestart', side, 'move: Permafrost');
				this.effectState.layers = 1;
			},
			onSideRestart(side) {
				if (this.effectState.layers >= 5) return false;
				this.add('-sidestart', side, 'move: Permafrost');
				this.effectState.layers++;
			},
			onSwitchIn(pokemon) {
				if (!pokemon.isGrounded()) return;
				if (pokemon.hasType('Ice') || pokemon.hasType('Fire')) {
					this.add('-sideend', pokemon.side, 'move: Permafrost', `[of] ${pokemon}`);
					pokemon.side.removeSideCondition('permafrost');
				} else if (pokemon.hasItem('heavydutyboots')) {
					return;
				} else {
					if (this.randomChance(this.effectState.layers * (this.field.isWeather(['hail', 'snowscape']) ? 2 : 1), 10)) {
						pokemon.trySetStatus('frz', pokemon.side.foe.active[0]);
					}
				}
			},
		},
		target: "foeSide",
		type: "Ice",
		zMove: { boost: { def: 1 } },
		contestType: "Clever",
	},
	retrograde: {
		num: 0,
		accuracy: 100,
		basePower: 0,
		category: "Status",
		name: "Retrograde",
		shortDesc: "Reverts Mega Evolved Pokémon back to their base form.",
		pp: 30,
		priority: 0,
		flags: {},
		onHit(target, pokemon) {
			if (target.species.isMega) target.formeChange(target.baseSpecies.baseSpecies, this.effect, true);
		},
		target: "any",
		type: "Normal",
		zMove: { boost: { def: 3, spd: 3 } },
	},
	spiritaway: {
		num: 0,
		accuracy: 100,
		basePower: 100,
		category: "Physical",
		isNonstandard: "Past",
		name: "Spirit Away",
		desc: "This attack takes the target into the air with the user on the first turn and executes on the second. The user and the target cannot make a move between turns, but the target can select a move to use. Fails on the first turn if the target is an ally, if the target has a substitute, or if the target is using Bounce, Dig, Dive, Fly, Phantom Force, Shadow Force, or Sky Drop.",
		shortDesc: "User and foe fly up turn 1. Damages on turn 2.",
		pp: 10,
		priority: 0,
		flags: {
			contact: 1, charge: 1, protect: 1, mirror: 1, gravity: 1, distance: 1,
			metronome: 1, nosleeptalk: 1, noassist: 1, failinstruct: 1,
		},
		onModifyMove(move, source) {
			if (!source.volatiles['skydrop']) {
				move.accuracy = true;
				delete move.flags['contact'];
			}
		},
		onMoveFail(target, source) {
			if (source.volatiles['twoturnmove']?.duration === 1) {
				source.removeVolatile('skydrop');
				source.removeVolatile('twoturnmove');
				if (target === this.effectState.target) {
					this.add('-end', target, 'Spirit Away', '[interrupt]');
				}
			}
		},
		onTry(source, target) {
			return !target.fainted;
		},
		onTryHit(target, source, move) {
			if (source.removeVolatile(move.id)) {
				if (target !== source.volatiles['twoturnmove'].source) return false;
			} else {
				if (target.volatiles['substitute'] || target.isAlly(source)) {
					return false;
				}

				this.add('-prepare', source, move.name, target);
				source.addVolatile('twoturnmove', target);
				return null;
			}
		},
		onHit(target, source) {
			if (target.hp) this.add('-end', target, 'Spirit Away');
		},
		condition: {
			duration: 2,
			onAnyDragOut(pokemon) {
				if (pokemon === this.effectState.target || pokemon === this.effectState.source) return false;
			},
			onFoeTrapPokemonPriority: -15,
			onFoeTrapPokemon(defender) {
				if (defender !== this.effectState.source) return;
				defender.trapped = true;
			},
			onFoeBeforeMovePriority: 12,
			onFoeBeforeMove(attacker, defender, move) {
				if (attacker === this.effectState.source) {
					attacker.activeMoveActions--;
					this.debug('Sky drop nullifying.');
					return null;
				}
			},
			onRedirectTargetPriority: 99,
			onRedirectTarget(target, source, source2) {
				if (source !== this.effectState.target) return;
				if (this.effectState.source.fainted) return;
				return this.effectState.source;
			},
			onAnyInvulnerability(target, source, move) {
				if (target !== this.effectState.target && target !== this.effectState.source) {
					return;
				}
				if (source === this.effectState.target && target === this.effectState.source) {
					return;
				}
				return false;
			},
			onFaint(target) {
				if (target.volatiles['skydrop'] && target.volatiles['twoturnmove'].source) {
					this.add('-end', target.volatiles['twoturnmove'].source, 'Spirit Away', '[interrupt]');
				}
			},
		},
		target: "any",
		type: "Fairy",
		contestType: "Tough",
	},
	wildfire: {
		num: 0,
		accuracy: 75,
		basePower: 0,
		category: "Status",
		name: "Wildfire",
		desc: "Burns the foe. If it is a Grass-type Pokemon, burns all Pokemon in their party weak to fire.",
		shortDesc: "Burns the target & possibly target's team.",
		pp: 15,
		priority: 0,
		flags: { protect: 1, reflectable: 1, mirror: 1, metronome: 1 },
		onHit(target, source, move) {
			if (target.hasType("Grass")) {
				for (const enemy of target.side.pokemon) {
					if (enemy !== target && enemy.runEffectiveness(move) > 0 && !enemy.status) {
						enemy.trySetStatus('brn', source);
					}
				}
			}
		},
		status: 'brn',
		target: "allAdjacentFoes",
		type: "Fire",
		zMove: { boost: { atk: 1 } },
		contestType: "Beautiful",
	},
};
