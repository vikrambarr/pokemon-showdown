export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	cleanse: {
		num: 0,
		basePower: 0,
		accuracy: true,
		category: "Status",
		name: "Cleanse",
		pp: 15,
		priority: 0,
		flags: { protect: 1, reflectable: 1, mirror: 1, bypasssub: 1, metronome: 1 },
		onHit(target, source, move) {
			let success = false;
			if (!target.volatiles['substitute'] || move.infiltrates) success = !!this.boost({ evasion: -1 });
			const removeAll = ['spikes', 'toxicspikes', 'stealthrock', 'stickyweb', 'gmaxsteelsurge'];
			const removeTarget = ['reflect', 'lightscreen', 'auroraveil', 'safeguard', 'mist', ...removeAll];
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
		target: "normal",
		type: "Light",
		contestType: "Tough",
		desc: "Lowers the target's evasiveness by 1 stage. If this move is successful and whether or not the target's evasiveness was affected, the effects of Reflect, Light Screen, Aurora Veil, Safeguard, Mist, Spikes, Toxic Spikes, Stealth Rock, and Sticky Web end for the target's side, and the effects of Spikes, Toxic Spikes, Stealth Rock, and Sticky Web end for the user's side. Ignores a target's substitute, although a substitute will still block the lowering of evasiveness. If there is a terrain active and this move is successful, the terrain will be cleared.",
		shortDesc: "-1 evasion; ends user and target hazards/terrain.",
	},
	divinevision: {
		num: 0,
		basePower: 120,
		accuracy: 90,
		category: "Special",
		name: "Divine Vision",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1, futuremove: 1 },
		ignoreImmunity: true,
		onTry(source, target) {
			if (!target.side.addSlotCondition(target, 'futuremove')) return false;
			Object.assign(target.side.slotConditions[target.position]['futuremove'], {
				move: 'divinevision',
				source,
				moveData: {
					id: 'divinevision',
					name: "Divine Vision",
					accuracy: 90,
					basePower: 120,
					category: "Special",
					priority: 0,
					flags: { allyanim: 1, metronome: 1, futuremove: 1 },
					ignoreImmunity: false,
					effectType: 'Move',
					type: 'Light',
				},
			});
			this.add('-start', source, 'move: Divine Vision');
			return this.NOT_FAIL;
		},
		target: "normal",
		type: "Light",
		contestType: "Tough",
		shortDesc: "Hits two turns after being used.",
	},
	darkomen: {
		num: 0,
		basePower: 120,
		accuracy: 90,
		category: "Special",
		name: "Dark Omen",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		ignoreImmunity: true,
		onTry(source, target) {
			if (!target.side.addSlotCondition(target, 'futuremove')) return false;
			Object.assign(target.side.slotConditions[target.position]['futuremove'], {
				move: 'darkomen',
				source,
				moveData: {
					id: 'darkomen',
					name: "Dark Omen",
					accuracy: 90,
					basePower: 120,
					category: "Special",
					priority: 0,
					flags: { allyanim: 1, metronome: 1, futuremove: 1 },
					ignoreImmunity: false,
					effectType: 'Move',
					type: 'Dark',
				},
			});
			this.add('-start', source, 'move: Dark Omen');
			return this.NOT_FAIL;
		},
		target: "normal",
		type: "Dark",
		contestType: "Tough",
		shortDesc: "Hits two turns after being used.",
	},
	winterwarning: {
		num: 0,
		basePower: 120,
		accuracy: 100,
		category: "Special",
		name: "Winter Warning",
		pp: 10,
		priority: 0,
		flags: { allyanim: 1, metronome: 1, futuremove: 1 },
		ignoreImmunity: true,
		onTry(source, target) {
			if (!target.side.addSlotCondition(target, 'futuremove')) return false;
			Object.assign(target.side.slotConditions[target.position]['futuremove'], {
				move: 'winterwarning',
				source,
				moveData: {
					id: 'winterwarning',
					name: "Winter Warning",
					accuracy: 100,
					basePower: 120,
					category: "Special",
					priority: 0,
					flags: { allyanim: 1, metronome: 1, futuremove: 1 },
					ignoreImmunity: false,
					effectType: 'Move',
					type: 'Ice',
				},
			});
			this.add('-start', source, 'move: Winter Warning');
			return this.NOT_FAIL;
		},
		target: "normal",
		type: "Ice",
		contestType: "Tough",
		shortDesc: "Hits two turns after being used.",
	},
	overflow: {
		num: 0,
		basePower: 50,
		accuracy: 100,
		category: "Physical",
		name: "Overflow",
		pp: 40,
		priority: 0,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1 },
		onAfterHit(target, pokemon, move) {
			if (!move.hasSheerForce) {
				if (pokemon.removeVolatile('leechseed')) {
					this.add('-end', pokemon, 'Leech Seed', '[from] move: Overflow', `[of] ${pokemon}`);
				}
				const sideConditions = ['spikes', 'toxicspikes', 'stealthrock', 'stickyweb', 'gmaxsteelsurge'];
				for (const condition of sideConditions) {
					if (pokemon.side.removeSideCondition(condition)) {
						this.add('-sideend', pokemon.side, this.dex.conditions.get(condition).name, '[from] move: Overflow', `[of] ${pokemon}`);
					}
				}
				if (pokemon.volatiles['partiallytrapped']) {
					pokemon.removeVolatile('partiallytrapped');
				}
			}
		},
		onAfterSubDamage(damage, target, pokemon, move) {
			if (!move.hasSheerForce) {
				if (pokemon.hp && pokemon.removeVolatile('leechseed')) {
					this.add('-end', pokemon, 'Leech Seed', '[from] move: Overflow', `[of] ${pokemon}`);
				}
				const sideConditions = ['spikes', 'toxicspikes', 'stealthrock', 'stickyweb', 'gmaxsteelsurge'];
				for (const condition of sideConditions) {
					if (pokemon.hp && pokemon.side.removeSideCondition(condition)) {
						this.add('-sideend', pokemon.side, this.dex.conditions.get(condition).name, '[from] move: Overflow', `[of] ${pokemon}`);
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
		type: "Water",
		contestType: "Tough",
		shortDesc: "Free user from hazards/bind/Leech Seed; +1 Spe.",
	},
	heavensknuckle: {
		num: 0,
		accuracy: 85,
		basePower: 90,
		category: "Physical",
		name: "Heaven's Knuckle",
		desc: "The user blasts a beam of holy energy from their fist. It does not make contact.",
		shortDesc: "No additional effect.",
		pp: 20,
		priority: 0,
		flags: { protect: 1, mirror: 1, punch: 1 },
		secondary: undefined,
		target: "normal",
		type: "Fairy",
	},
	sinfulsmite: {
		num: 0,
		basePower: 60,
		accuracy: 100,
		category: "Physical",
		name: "Sinful Smite",
		pp: 15,
		priority: 0,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1 },
		onHit(target) {
			target.clearBoosts();
			this.add('-clearboost', target);
		},
		target: "normal",
		type: "Dark",
		contestType: "Tough",
		shortDesc: "Resets all of the target's stat stages to 0.",
	},
	antimatter: {
		num: 0,
		basePower: 80,
		accuracy: 100,
		category: "Physical",
		name: "Antimatter",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		onHit(target) {
			target.clearBoosts();
			this.add('-clearboost', target);
		},
		target: "normal",
		type: "Cosmic",
		contestType: "Tough",
		shortDesc: "Resets all of the target's stat stages to 0.",
	},
	starsaligned: {
		num: 0,
		basePower: 20,
		accuracy: 100,
		category: "Special",
		name: "Stars Aligned",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		basePowerCallback(pokemon, target, move) {
			const bp = move.basePower + 20 * pokemon.positiveBoosts();
			this.debug(`BP: ${bp}`);
			return bp;
		},
		target: "normal",
		type: "Cosmic",
		contestType: "Tough",
		shortDesc: " + 20 power for each of the user's stat boosts.",
	},
	valkyriechariot: {
		num: 0,
		basePower: 110,
		accuracy: 90,
		category: "Physical",
		name: "Valkyrie Chariot",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1, gravity: 1 },
		hasCrashDamage: true,
		onMoveFail(target, source, move) {
			this.damage(source.baseMaxhp / 2, source, source, this.dex.conditions.get('Valkyrie Chariot'));
		},
		target: "normal",
		type: "Fairy",
		contestType: "Tough",
		shortDesc: "User is hurt by 50% of its max HP if it misses.",
	},
	goldrush: {
		num: 0,
		basePower: 75,
		accuracy: 100,
		category: "Physical",
		name: "Gold Rush",
		pp: 15,
		priority: 0,
		flags: { metronome: 1, contact: 1, protect: 1, mirror: 1 },
		onHit(target) {
			target.clearBoosts();
			this.add('-clearboost', target);
		},
		target: "normal",
		type: "Ground",
		contestType: "Tough",
		shortDesc: "Resets all of the target's stat stages to 0.",
	},
	songofsilence: {
		num: 0,
		basePower: 60,
		accuracy: true,
		category: "Special",
		name: "Song of Silence",
		pp: 15,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1, sound: 1 },
		onHit(target) {
			target.clearBoosts();
			this.add('-clearboost', target);
		},
		target: "normal",
		type: "Sound",
		contestType: "Tough",
		shortDesc: "Resets all of the target's stat stages to 0.",
	},
	boomingbeats: {
		num: 0,
		basePower: 20,
		accuracy: 100,
		category: "Special",
		name: "Booming Beats",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1, sound: 1 },
		basePowerCallback(pokemon, target, move) {
			const bp = move.basePower + 20 * pokemon.positiveBoosts();
			this.debug(`BP: ${bp}`);
			return bp;
		},
		target: "normal",
		type: "Sound",
		contestType: "Tough",
		shortDesc: " + 20 power for each of the user's stat boosts.",
	},
	cobaltray: {
		num: 0,
		basePower: 80,
		accuracy: 100,
		category: "Special",
		name: "Cobalt Ray",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		onHit(target) {
			target.clearBoosts();
			this.add('-clearboost', target);
		},
		target: "normal",
		type: "Steel",
		contestType: "Tough",
		shortDesc: "Resets all of the target's stat stages to 0.",
	},
	unlockchi: {
		num: 0,
		basePower: 20,
		accuracy: 100,
		category: "Special",
		name: "Unlock Chi",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		basePowerCallback(pokemon, target, move) {
			const bp = move.basePower + 20 * pokemon.positiveBoosts();
			this.debug(`BP: ${bp}`);
			return bp;
		},
		target: "normal",
		type: "Fighting",
		contestType: "Tough",
		shortDesc: " + 20 power for each of the user's stat boosts.",
	},
	neutralize: {
		num: 0,
		basePower: 40,
		accuracy: 100,
		category: "Special",
		name: "Neutralize",
		pp: 15,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		onHit(target) {
			target.clearBoosts();
			this.add('-clearboost', target);
		},
		target: "normal",
		type: "Normal",
		contestType: "Tough",
		shortDesc: "Resets all of the target's stat stages to 0.",
	},
	wyrmbeam: {
		num: 0,
		basePower: 80,
		accuracy: 100,
		category: "Special",
		name: "Wyrm Beam",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1 },
		onHit(target) {
			target.clearBoosts();
			this.add('-clearboost', target);
		},
		target: "allAdjacentFoes",
		type: "Dragon",
		contestType: "Tough",
		shortDesc: "Resets all of the target(s)'s stat stages to 0. Hits adjacent foes.",
	},
	beatdrop: {
		num: 0,
		basePower: 110,
		accuracy: 90,
		category: "Physical",
		name: "Beat Drop",
		pp: 10,
		priority: 0,
		flags: { metronome: 1, protect: 1, mirror: 1, gravity: 1 },
		hasCrashDamage: true,
		onMoveFail(target, source, move) {
			this.damage(source.baseMaxhp / 2, source, source, this.dex.conditions.get('Beat Drop'));
		},
		target: "normal",
		type: "Sound",
		contestType: "Tough",
		shortDesc: "User is hurt by 50% of its max HP if it misses.",
	},
};
