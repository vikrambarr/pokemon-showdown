export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	thunder: {
		inherit: true,
		onModifyMove(move, pokemon, target) {
			switch (target?.effectiveWeather()) {
			case 'raindance':
			case 'primordialsea':
			case 'thunderstorm':
				move.accuracy = true;
				break;
			case 'sunnyday':
			case 'desolateland':
				move.accuracy = 50;
				break;
			}
		},
	},
	expunge: {
		num: 0,
		accuracy: 70,
		basePower: 110,
		category: "Special",
		name: "Expunge",
		desc: "Super effective on Nuclear. If the weather is Fallout, this move's accuracy is 100%.",
		shortDesc: "Super effective on Nuclear. 100% acc in Fallout.",
		pp: 5,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1 },
		onModifyMove(move, pokemon, target) {
			if (target?.effectiveWeather() === 'Fallout') move.accuracy = 100;
		},
		onEffectiveness(typeMod, target, type) {
			if (type === 'Nuclear') return 1;
		},
		target: "any",
		type: "Nuclear",
		contestType: "Tough",
	},
	goldenfist: {
		num: 0,
		accuracy: 100,
		basePower: 70,
		category: "Physical",
		name: "Golden Fist",
		shortDesc: "Scatters coins.",
		pp: 20,
		priority: 0,
		flags: { contact: 1, protect: 1, mirror: 1, punch: 1, metronome: 1 },
		onHit(target, source, move) {
			source.side.addSideCondition(this.dex.conditions.get('scatteredcoins'));
		},
		target: "normal",
		type: "Fighting",
		contestType: "Cool",
	},
	infernalblade: {
		num: 0,
		accuracy: 95,
		basePower: 90,
		category: "Physical",
		name: "Infernal Blade",
		desc: "This move's type effectiveness against a Pokemon with the Fairy type is changed to be super effective no matter what this move's type is. Has a 10% chance to burn.",
		shortDesc: "10% chance to burn. Always super effective on Fairy.",
		pp: 10,
		priority: 0,
		flags: { contact: 1, protect: 1, mirror: 1, metronome: 1, slicing: 1 },
		onEffectiveness(typeMod, target, type) {
			if (target?.hasType('Fairy')) {
				if (type === 'Fairy') return 1;
				else return 0;
			}
		},
		secondary: {
			chance: 10,
			status: 'brn',
		},
		target: "normal",
		type: "Fire",
		contestType: "Beautiful",
	},
	laserpulse: {
		num: 0,
		accuracy: 100,
		basePower: 80,
		category: "Special",
		name: "Laser Pulse",
		shortDesc: "Type is random pick of Fire, Ice, and Electric",
		pp: 20,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1, pulse: 1 },
		onModifyMove(move, pokemon, target) {
			const result = this.random(3);
			if (result === 0) {
				move.type = 'Fire';
			} else if (result === 1) {
				move.type = 'Ice';
			} else {
				move.type = 'Electric';
			}
		},
		target: "normal",
		type: "Normal",
		contestType: "Beautiful",
	},
	nuclearwind: {
		num: 0,
		accuracy: 95,
		basePower: 65,
		category: "Special",
		name: "Nuclear Wind",
		shortDesc: "5% chance to summon Fallout.",
		pp: 10,
		priority: 0,
		onHit(source) {
			if (this.randomChance(1, 20)) this.field.setWeather('fallout');
		},
		flags: { protect: 1, mirror: 1 },
		target: "normal",
		type: "Nuclear",
		contestType: "Beautiful",
	},
	oceanswrath: {
		num: 0,
		accuracy: 75,
		basePower: 100,
		category: "Special",
		name: "Ocean's Wrath",
		desc: "Prevents the target from switching for four or five turns (seven turns if the user is holding Grip Claw). Causes damage to the target equal to 1/8 of its maximum HP (1/6 if the user is holding Binding Band), rounded down, at the end of each turn during effect. The target can still switch out if it is holding Shed Shell or uses Baton Pass, Flip Turn, Parting Shot, Shed Tail, Teleport, U-turn, or Volt Switch. The effect ends if either the user or the target leaves the field, or if the target uses Mortal Spin, Rapid Spin, or Substitute successfully. This effect is not stackable or reset by using this or another binding move. Fails if you have more than 1 of Baitatao, Leviathao, or Krakanao on your team.",
		shortDesc: "Traps and damages the target for 4-5 turns.",
		pp: 15,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1 },
		onTryHit(target, source, move) {
			let count = 0;
			for (const pokemon of source.side.team) {
				if (["baitatao", "leviathao", "krakanao"].includes(this.dex.species.get(pokemon.species).id)) count += 1;
			}
			if (count >= 2) {
				this.add('-fail', source, 'move: Oceans Wrath', '[from] Too many Sea Monsters');
				this.hint("This move fails if you have more than 1 of Baitatao, Leviathao, Krakanao in your team");
				this.attrLastMove('[still]');
				return null;
			}
		},
		volatileStatus: 'partiallytrapped',
		target: "normal",
		type: "Water",
		contestType: "Tough",
	},
	stickyterrain: {
		num: 0,
		accuracy: true,
		basePower: 0,
		category: "Status",
		name: "Sticky Terrain",
		desc: "For 5 turns, the terrain becomes Sticky Terrain. During the effect, grounded Pokemon cannot be hit by moves with priority greater than 0, unless the target is an ally. Camouflage transforms the user into a Normal type. Fails if the current terrain is Sticky Terrain.",
		shortDesc: "5 turns. Grounded: immune to priority.",
		pp: 10,
		priority: 0,
		flags: { nonsky: 1, metronome: 1 },
		terrain: 'stickyterrain',
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
				if (effect && (effect.priority <= 0.1 || effect.target === 'self')) {
					return;
				}
				if (target.isSemiInvulnerable() || target.isAlly(source)) return;
				if (!target.isGrounded()) {
					const baseMove = this.dex.moves.get(effect.id);
					if (baseMove.priority > 0) {
						this.hint("Sticky Terrain doesn't affect Pokémon immune to Ground.");
					}
					return;
				}
				this.add('-activate', target, 'move: Sticky Terrain');
				return null;
			},
			onFieldStart(field, source, effect) {
				if (effect?.effectType === 'Ability') {
					this.add('-fieldstart', 'move: Sticky Terrain', '[from] ability: ' + effect.name, `[of] ${source}`);
				} else {
					this.add('-fieldstart', 'move: Sticky Terrain');
				}
			},
			onFieldResidualOrder: 27,
			onFieldResidualSubOrder: 7,
			onFieldEnd() {
				this.add('-fieldend', 'move: Sticky Terrain');
			},
		},
		target: "all",
		type: "Poison",
		contestType: "Clever",
	},
	subduction: {
		num: 0,
		accuracy: 90,
		basePower: 140,
		category: "Physical",
		name: "Subduction",
		desc: "Confuses the user. 100% chance to lower the foes's speed by 2 stages.",
		shortDesc: "Confuses user. 100% to lower foe's speed by 2 stages.",
		pp: 5,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1, sound: 1, bypasssub: 1 },
		onHit(target, source, move) {
			source.addVolatile('confusion');
		},
		secondary: {
			chance: 100,
			boosts: { spe: -2 },
		},
		target: "normal",
		type: "Ground",
		contestType: "Tough",
	},
	vaporize: {
		num: 0,
		accuracy: 95,
		basePower: 100,
		category: "Special",
		name: "Vaporize",
		desc: "This move's type effectiveness against Water is changed to be super effective no matter what this move's type is. Fails if you have more than 1 of Baitatao, Leviathao, or Krakanao on your team.",
		shortDesc: "Super effective on Water.",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1 },
		onTryHit(target, source, move) {
			let count = 0;
			for (const pokemon of source.side.team) {
				if (["baitatao", "leviathao", "krakanao"].includes(this.dex.species.get(pokemon.species).id)) count += 1;
			}
			if (count >= 2) {
				this.add('-fail', source, 'move: Vaporize', '[from] Too many Sea Monsters');
				this.hint("This move fails if you have more than 1 of Baitatao, Leviathao, Krakanao in your team");
				this.attrLastMove('[still]');
				return null;
			}
		},
		onEffectiveness(typeMod, target, type) {
			if (type === 'Water') return 1;
		},
		target: "normal",
		type: "Fire",
		contestType: "Beautiful",
	},
	glacialspear: {
		num: 0,
		accuracy: 95,
		basePower: 100,
		category: "Physical",
		name: "Glacial Spear",
		desc: "If this attack does not miss, the effects of Reflect, Light Screen, and Aurora Veil end for the target's side of the field before damage is calculated. Always lands a critical hit. Ignores opponent's abilities. Fails if you have more than 1 of Baitatao, Leviathao, or Krakanao on your team.",
		shortDesc: "Destroys screens, always crits, ignores abilities.",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1 },
		ignoreAbility: true,
		willCrit: true,
		onTryHit(target, source, move) {
			let count = 0;
			for (const pokemon of source.side.team) {
				if (["baitatao", "leviathao", "krakanao"].includes(this.dex.species.get(pokemon.species).id)) count += 1;
			}
			if (count >= 2) {
				this.add('-fail', source, 'move: Glacial Spear', '[from] Too many Sea Monsters');
				this.hint("This move fails if you have more than 1 of Baitatao, Leviathao, Krakanao in your team");
				this.attrLastMove('[still]');
				return null;
			}
			source.side.removeSideCondition('reflect');
			source.side.removeSideCondition('lightscreen');
			source.side.removeSideCondition('auroraveil');
		},
		target: "normal",
		type: "Ice",
		contestType: "Cool",
	},
	engulf: {
		num: 0,
		accuracy: 95,
		basePower: 100,
		category: "Physical",
		name: "Engulf",
		desc: "Has a 100% chance to lower the target's Defense and Evasion by 1 stage. Fails if you have more than 1 of Baitatao, Leviathao, or Krakanao on your team.",
		shortDesc: "100% to lower the target's Def. and Evasion by 1.",
		pp: 10,
		priority: 0,
		flags: { protect: 1, mirror: 1, metronome: 1, contact: 1 },
		onTryHit(target, source, move) {
			let count = 0;
			for (const pokemon of source.side.team) {
				if (["baitatao", "leviathao", "krakanao"].includes(this.dex.species.get(pokemon.species).id)) count += 1;
			}
			if (count >= 2) {
				this.add('-fail', source, 'move: Engulf', '[from] Too many Sea Monsters');
				this.hint("This move fails if you have more than 1 of Baitatao, Leviathao, Krakanao in your team");
				this.attrLastMove('[still]');
				return null;
			}
		},
		secondary: {
			chance: 100,
			boosts: {
				def: -1,
				evasion: -1,
			},
		},
		target: "normal",
		type: "Dark",
		contestType: "Cute",
	},
};
