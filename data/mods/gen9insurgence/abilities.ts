const eeveelutions: { [k: string]: string } = {
	"Water": "vaporeon",
	"Fire": "flareon",
	"Grass": "leafeon",
	"Dark": "umbreon",
	"Fairy": "sylveon",
	"Psychic": "espeon",
	"Ice": "glaceon",
	"Electric": "jolteon",
	"Normal": "eeveemega",
};

const eeveeabilities: { [k: string]: string } = {
	"vaporeon": "waterabsorb",
	"flareon": "flashfire",
	"leafeon": "chlorophyll",
	"umbreon": "synchronize",
	"sylveon": "cutecharm",
	"espeon": "magicbounce",
	"glaceon": "snowcloak",
	"jolteon": "voltabsorb",
	"eeveemega": "proteanmaxima",
};

export const Abilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {
	noguard: {
		inherit: true,
		onAnyInvulnerability(target, source, move) {
			if (move && !move.ohko && (source === this.effectState.target || target === this.effectState.target)) return 0;
		},
		onAnyAccuracy(accuracy, target, source, move) {
			if (move && !move.ohko && (source === this.effectState.target || target === this.effectState.target)) {
				return true;
			}
			return accuracy;
		},
	},
	forecast: {
		inherit: true,
		onWeatherChange(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Castform' || pokemon.transformed) return;
			let forme = null;
			switch (pokemon.effectiveWeather()) {
			case 'sunnyday':
			case 'desolateland':
				if (pokemon.species.id !== 'castformsunny') forme = 'Castform-Sunny';
				break;
			case 'raindance':
			case 'primordialsea':
				if (pokemon.species.id !== 'castformrainy') forme = 'Castform-Rainy';
				break;
			case 'hail':
			case 'snowscape':
				if (pokemon.species.id !== 'castformsnowy') forme = 'Castform-Snowy';
				break;
			case 'sandstorm':
				if (pokemon.species.id !== 'castformsandy') forme = 'Castform-Sandy';
				break;
			case 'newmoon':
				if (pokemon.species.id !== 'castformcloudy') forme = 'Castform-Cloudy';
				break;
			default:
				if (pokemon.species.id !== 'castform') forme = 'Castform';
				break;
			}
			if (pokemon.isActive && forme) {
				pokemon.formeChange(forme, this.effect, false, '0', '[msg]');
			}
		},
	},
	baddreams: {
		inherit: true,
		onResidual(pokemon) {
			if (!pokemon.hp) return;
			for (const target of pokemon.foes()) {
				if (target.status === 'slp' || target.hasAbility('comatose')) {
					this.damage(target.baseMaxhp / (target.effectiveWeather() === 'newmoon' ? 4 : 8), target, pokemon);
				}
			}
		},
	},
	pressure: {
		inherit: true,
		onDeductPP(target, source) {
			if (target.isAlly(source)) return;
			return target.effectiveWeather() === 'newmoon' ? 2 : 1;
		},
	},
	illuminate: {
		inherit: true,
		onTryBoost(boost, target, source, effect) {},
		onModifyMove(move) {},
		onModifyAccuracyPriority: -1,
		onModifyAccuracy(accuracy) {
			if (typeof accuracy !== 'number') return;
			if (this.field.isWeather('newmoon')) {
				this.debug('Illuminate - decreasing accuracy');
				return this.chainModify([3277, 4096]);
			}
		},
	},
	fairyaura: {
		inherit: true,
		onAnyBasePower(basePower, source, target, move) {
			if (target === source || move.category === 'Status' || move.type !== 'Fairy') return;
			if (!move.auraBooster?.hasAbility('Fairy Aura')) move.auraBooster = this.effectState.target;
			if (move.auraBooster !== this.effectState.target) return;
			return this.chainModify([source.effectiveWeather() === 'newmoon' ? 4096 : (move.hasAuraBreak ? 3072 : 5448), 4096]);
		},
	},
	darkaura: {
		inherit: true,
		onAnyBasePower(basePower, source, target, move) {
			if (target === source || move.category === 'Status' || move.type !== 'Dark') return;
			if (!move.auraBooster?.hasAbility('Dark Aura')) move.auraBooster = this.effectState.target;
			if (move.auraBooster !== this.effectState.target) return;
			return this.chainModify([source.effectiveWeather() === 'newmoon' ? 6827 : (move.hasAuraBreak ? 3072 : 5448), 4096]);
		},
	},
	flowergift: {
		inherit: true,
		onAllyModifyAtkPriority: 3,
		onAllyModifyAtk(atk, pokemon) {
			if (!['Noivern-Delta', 'Cherrim'].includes(this.effectState.target.baseSpecies.baseSpecies)) return;
			if (['sunnyday', 'desolateland'].includes(pokemon.effectiveWeather())) {
				return this.chainModify(1.5);
			}
		},
		onAllyModifySpDPriority: 4,
		onAllyModifySpD(spd, pokemon) {
			if (!['Noivern-Delta', 'Cherrim'].includes(this.effectState.target.baseSpecies.baseSpecies)) return;
			if (['sunnyday', 'desolateland'].includes(pokemon.effectiveWeather())) {
				return this.chainModify(1.5);
			}
		},
	},
	trace: {
		inherit: true,
		onStart(pokemon) {
			if (pokemon.adjacentFoes().some(foeActive => foeActive.ability === 'noability')) {
				this.effectState.gaveUp = true;
			}
			if (pokemon.hasItem('Ability Shield')) {
				if (!pokemon.illusion) this.add('-block', pokemon, 'item: Ability Shield');
				this.effectState.gaveUp = true;
			}
		},
		onUpdate(pokemon) {
			if (!pokemon.isStarted || this.effectState.gaveUp) return;

			const possibleTargets = pokemon.adjacentFoes().filter(
				target => !target.getAbility().flags['notrace'] && target.ability !== 'noability'
			);
			if (!possibleTargets.length) return;

			const target = this.sample(possibleTargets);
			const ability = target.getAbility();
			pokemon.setAbility(ability, target, null, false, !!pokemon.illusion);
		},
	},
	illusion: {
		inherit: true,
		onSwitchOut(pokemon) {
			if (pokemon.ability !== 'illusion') pokemon.illusion = null;
		},
		onFaint(pokemon) {
			this.singleEvent('End', this.dex.abilities.get('Illusion'), pokemon.abilityState, pokemon);
		},
	},
	absolution: {
		onModifySpAPriority: 5,
		onModifySpA(spa, pokemon) {
			if (pokemon.effectiveWeather() === 'newmoon') {
				return this.chainModify(1.5);
			}
		},
		onWeather(target, source, effect) {
			if (effect.id === 'newmoon') {
				this.damage(target.baseMaxhp / 8, target, target);
			}
		},
		flags: {},
		name: "Absolution",
		desc: "If New Moon is active, this Pokemon's Special Attack is multiplied by 1.5 and it loses 1/8 of its maximum HP, rounded down, at the end of each turn.",
		shortDesc: "If New Moon is active, this Pokemon's Sp. Atk is 1.5x; loses 1/8 max HP per turn.",
		rating: 2,
		num: 0,
	},
	amplifier: {
		onBasePowerPriority: 7,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags.sound) {
				this.debug('Amplifier boost');
				return this.chainModify(1.25);
			}
		},
		flags: {},
		name: "Amplifier",
		shortDesc: "Sound-based moves are boosted by 1.25x.",
		rating: 3.5,
		num: 0,
	},
	ancientpresence: {
		onModifyMove(move, pokemon, target) {
			move.forceSTAB = true;
			if (!target?.hp) return;
			const curType = target.getTypes();
			target.setType('???');
			if (target.runImmunity(move.type)) {
				move.type = '???';
			}
			target.setType(curType);
		},
		flags: {},
		name: "Ancient Presence",
		shortDesc: "User's moves are STAB and become neutral.",
		rating: 2,
		num: 0,
	},
	athenian: {
		onModifySpAPriority: 5,
		onModifySpA(spa) {
			return this.chainModify(2);
		},
		flags: {},
		name: "Athenian",
		shortDesc: "Doubles the user's Special Attack stat.",
		rating: 5,
		num: 0,
	},
	blazeboost: {
		onModifyTypePriority: -5,
		onModifyType(move, pokemon, target) {
			if (move.category === 'Status' || move.type !== 'Fire') return;
			this.boost({ spa: 1, atk: 1, spe: 1 }, pokemon);
			if (pokemon.species.id === 'emolgadelta') {
				pokemon.formeChange('emolgadeltafired');
			}
		},
		onDamagingHit(damage, target, source, move) {
			if (target.species.id !== 'emolgadeltafired') return;
			if (this.checkMoveMakesContact(move, source, target)) {
				if (this.randomChance(1, 10)) {
					source.trySetStatus('brn', target);
				}
			}
		},
		flags: {},
		name: "Blaze Boost",
		shortDesc: "Fire moves boost user's stats. May burn on contact.",
		desc: "If a Fire-type move is selected, the user will receive a +1 attack, sp. attack, and speed boost. If user is Emolga-Delta, using a Fire-type move transforms it into Emolga-Delta-Fired and adds a 10% chance to burn opponents on contact.",
		rating: 4,
		num: 0,
	},
	chlorofury: {
		onStart(pokemon) {
			pokemon.addVolatile('chlorofury');
		},
		condition: {
			duration: 3,
			onStart(pokemon) {
				if (pokemon.side.totalFainted) {
					this.boost({ spe: 1, spa: pokemon.side.totalFainted }, pokemon);
				}
			},
			onEnd(pokemon) {
				if (pokemon.side.totalFainted) {
					this.boost({ spe: -1, spa: -pokemon.side.totalFainted }, pokemon);
				}
			},
		},
		flags: {},
		name: "Chlorofury",
		shortDesc: "User's stats are boosted to avenge its allies.",
		rating: 3.5,
		num: 0,
	},
	etherealshroud: {
		onTryHit(target, source, move) {
			if (target !== source && ['Normal', 'Fighting'].includes(move.type) && move.category !== 'Status') {
				this.add('-activate', target, 'ability: Ethereal Shroud');
				return null;
			}
		},
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Bug' || move.type === 'Poison') {
				this.add('-activate', target, 'ability: Ethereal Shroud');
				return this.chainModify(0.5);
			}
		},
		flags: { breakable: 1 },
		name: "Ethereal Shroud",
		shortDesc: "Grants the user Ghost-type immunities and resistances.",
		rating: 3,
		num: 0,
	},
	eventhorizon: {
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target)) {
				source.addVolatile('trapped', target, move, 'trapper');
			}
		},
		flags: {},
		name: "Event Horizon",
		shortDesc: "Any Pokemon that makes contact with the user can't escape.",
		rating: 5,
		num: 0,
	},
	foundry: {
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
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball', 'laserpulse',
			];
			if (move.type === 'Rock' && !noModifyType.includes(move.id) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Fire';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		flags: {},
		name: "Foundry",
		desc: "This Pokemon's Rock-type moves become Fire-type moves and have their power multiplied by 1.2. This effect comes after other effects that change a move's type. Stealth Rock sets a Fire-type variant instead.",
		shortDesc: "This Pokemon's Rock-type moves become Fire type and have 1.2x power.",
		rating: 4,
		num: 0,
	},
	heliophobia: {
		onWeather(target, source, effect) {
			if (effect.id === 'newmoon') {
				this.heal(target.baseMaxhp / 8);
			} else if ((effect.id === 'sunnyday' || effect.id === 'desolateland') && !target.hasItem('utilityumbrella')) {
				this.damage(target.baseMaxhp / 8, target, target);
			}
		},
		flags: { breakable: 1 },
		name: "Heliophobia",
		desc: "At the end of each turn, this Pokemon restores 1/8 of its maximum HP, rounded down, if the weather is Darkness, and loses 1/8 of its maximum HP, rounded down, if the weather is Sunny Day. The weather effects are prevented if this Pokemon is holding a Utility Umbrella.",
		shortDesc: "This Pokemon is healed 1/8 by Darkness; damaged 1/8 by Sun.",
		rating: 3,
		num: 0,
	},
	hubris: {
		onSourceAfterFaint(length, target, source, effect) {
			if (effect?.effectType === 'Move') {
				this.boost({ spa: length }, source);
			}
		},
		flags: {},
		name: "Hubris",
		desc: "This Pokemon's Sp. Atk is raised by 1 stage if it attacks and knocks out another Pokemon.",
		shortDesc: "This Pokemon's Sp. Atk is raised by 1 stage if it attacks and KOes another Pokemon.",
		rating: 3,
		num: 0,
	},
	intoxicate: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball', 'laserpulse',
			];
			if (move.type === 'Normal' && !noModifyType.includes(move.id) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Poison';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		flags: {},
		name: "Intoxicate",
		desc: "This Pokemon's Normal-type moves become Poison-type moves and have their power multiplied by 1.2. This effect comes after other effects that change a move's type.",
		shortDesc: "This Pokemon's Normal-type moves become Poison type and have 1.2x power.",
		rating: 4,
		num: 0,
	},
	irrelephant: {
		onModifyMove(move, pokemon, target) {
			if (!target?.hp) return;
			const curType = target.getTypes();
			target.setType('???');
			move.ignoreImmunity = {};
			for (const type of this.dex.types.all()) {
				if (target.runImmunity(type.name)) {
					move.ignoreImmunity[type.name] = true;
				}
			}
			target.setType(curType);
		},
		flags: {},
		name: "Irrelephant",
		shortDesc: "User ignores all type-based immunities.",
		rating: 4,
		num: 0,
	},
	lernean: {
		onUpdate(pokemon) {
			if (!pokemon.hp || pokemon.transformed) return;
			const formeOrder = ['-Nine', '-Eight', '-Seven', '-Six', ''];
			const targetForme = Math.ceil((pokemon.hp / pokemon.maxhp) * 5) - 1;
			let formeIndex = formeOrder.indexOf('-' + pokemon.species.name.split('-').pop()!);
			if (formeIndex === -1) formeIndex = 4;
			if (formeIndex > targetForme) {
				for (const name of ['Hydreigon-Mega']) {
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
				!['Hydreigon-Mega'].some(item => pokemon.species.name.includes(item) || pokemon.m.fusion?.includes(item)) ||
				move.category === "Status" || !move.basePower
			) return;

			this.effectState.move = { ...move };

			delete move.secondaries;
			delete move.secondary;
			delete move.self?.boosts;

			if (move.id === 'clangoroussoulblaze') delete move.selfBoost;

			for (const name of ['Hydreigon-Mega']) {
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
			if (!['Hydreigon-Mega'].some(item => pokemon.species.name.includes(item) || pokemon.m.fusion?.includes(item))) return;
			for (const name of ['Hydreigon-Mega']) {
				const formes = [name + '', name + '-Six', name + '-Seven', name + '-Eight', name + '-Nine'];

				const index = formes.indexOf(pokemon.species.name);
				if (index >= 0) {
					const nhits = 5 + index;
					return this.chainModify((1.15 + (0.075 * (nhits - 5))) / nhits);
				}
			}
		},
		onSourceDamagingHit(damage, target, pokemon, move) {
			if (['Hydreigon-Mega'].some(item => pokemon.species.name.includes(item) || pokemon.m.fusion?.includes(item))) {
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
	omnitype: {
		onStart(target) {
			this.add('-activate', target, 'ability: Omnitype');
		},
		onTryHit(source, target, move) {
			source.setType([
				'Bug', 'Dark', 'Dragon', 'Electric',
				'Fairy', 'Fighting', 'Fire', 'Flying',
				'Ghost', 'Grass', 'Ground', 'Ice', 'Normal',
				'Poison', 'Psychic', 'Rock', 'Steel', 'Water',
			]);
		},
		onFoeAfterMove(source, target, move) {
			const pokemon = this.effectState.target;
			pokemon.setType(pokemon.baseTypes);
		},
		flags: { breakable: 1, failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1 },
		name: "Omnitype",
		shortDesc: "When defending, the user has every type.",
		rating: 4,
		num: 0,
	},
	pendulum: {
		onStart(pokemon) {
			pokemon.addVolatile('pendulum');
		},
		condition: {
			onStart(pokemon) {
				this.effectState.lastMove = '';
				this.effectState.numConsecutive = 0;
			},
			onTryMovePriority: -2,
			onTryMove(pokemon, target, move) {
				if (!pokemon.hasAbility('pendulum')) {
					pokemon.removeVolatile('pendulum');
					return;
				}
				if (move.callsMove) return;
				if (this.effectState.lastMove === move.id && pokemon.moveLastTurnResult) {
					this.effectState.numConsecutive++;
				} else if (pokemon.volatiles['twoturnmove']) {
					if (this.effectState.lastMove !== move.id) {
						this.effectState.numConsecutive = 1;
					} else {
						this.effectState.numConsecutive++;
					}
				} else {
					this.effectState.numConsecutive = 0;
				}
				this.effectState.lastMove = move.id;
			},
			onModifyDamage(damage, source, target, move) {
				const dmgMod = [4096, 4915, 5734, 6553, 7372, 8192];
				const numConsecutive = this.effectState.numConsecutive > 5 ? 5 : this.effectState.numConsecutive;
				this.debug(`Current Pendulum boost: ${dmgMod[numConsecutive]}/4096`);
				return this.chainModify([dmgMod[numConsecutive], 4096]);
			},
		},
		flags: {},
		name: "Pendulum",
		shortDesc: "Damage of moves used on consecutive turns is increased. Max 2x after 5 turns.",
		rating: 4,
		num: 0,
	},
	phototroph: {
		onResidual(target, source, effect) {
			if (['sunnyday', 'desolateland'].includes(target.effectiveWeather())) {
				this.heal(target.baseMaxhp / 8);
			} else if (['raindance', 'primordialsea', 'newmoon'].includes(target.effectiveWeather())) {
				return;
			} else {
				this.heal(target.baseMaxhp / 16);
			}
		},
		flags: {},
		name: "Phototroph",
		shortDesc: "Heals 1/16 HP every turn. 1/8 in sun.",
		rating: 1.5,
		num: 0,
	},
	prismguard: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (!move.flags['contact']) {
				this.damage(source.baseMaxhp / 8, source, target);
			}
		},
		flags: {},
		name: "Prism Guard",
		desc: "Pokemon not making contact with this Pokemon lose 1/8 of their maximum HP, rounded down.",
		shortDesc: "Pokemon not making contact with this Pokemon lose 1/8 max HP.",
		rating: 2.5,
		num: 0,
	},
	proteanmaxima: {
		onSwitchIn(pokemon) {
			if (pokemon.species.id !== eeveelutions["Normal"] && pokemon.species.id in eeveeabilities) {
				pokemon.addVolatile('ability:' + eeveeabilities[pokemon.species.id]);
				this.add('-activate', pokemon, 'ability: ' + this.dex.abilities.get(eeveeabilities[pokemon.species.id]).name);
			}
		},
		onUpdate(pokemon) {
			const action = this.queue.willMove(pokemon);
			if (!action) return;
			const move = this.dex.getActiveMove(action.move.id);
			if (move.type in eeveelutions && pokemon.species.id !== eeveelutions[move.type]) {
				if (pokemon.species.id !== eeveelutions["Normal"]) {
					pokemon.removeVolatile('ability:' + eeveeabilities[eeveelutions[pokemon.species.types[0]]]);
				}
				pokemon.formeChange(eeveelutions[move.type], this.dex.abilities.get('Protean Maxima'), true);
				pokemon.addVolatile('ability:' + eeveeabilities[pokemon.species.id]);
				this.add('-activate', pokemon, 'ability: ' + this.dex.abilities.get(eeveeabilities[pokemon.species.id]).name);

				for (const [i, queuedAction] of this.queue.list.entries()) {
					if (queuedAction.pokemon === pokemon && queuedAction.choice === 'move') {
						this.queue.list.splice(i, 1);
						this.queue.insertChoice(queuedAction, true);
						break;
					}
				}

				pokemon.baseMaxhp = Math.floor(Math.floor(
					2 * pokemon.species.baseStats['hp'] + pokemon.set.ivs['hp'] + Math.floor(pokemon.set.evs['hp'] / 4) + 100
				) * pokemon.level / 100 + 10);
				const newMaxHP = pokemon.volatiles['dynamax'] ? (2 * pokemon.baseMaxhp) : pokemon.baseMaxhp;
				pokemon.hp = newMaxHP - (pokemon.maxhp - pokemon.hp);
				if (pokemon.hp < 1) pokemon.hp = 1;
				pokemon.maxhp = newMaxHP;
				this.add('-heal', pokemon, pokemon.getHealth, '[silent]');
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "Protean Maxima",
		shortDesc: "Transforms into the eeveelution corresponding to the type of the move used.",
		rating: 4.5,
		num: 0,
	},
	psychocall: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Psychic' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Psycho Call boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Psychic' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Psycho Call boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Psycho Call",
		desc: "When this Pokemon has 1/3 or less of its maximum HP, rounded down, its offensive stat is multiplied by 1.5 while using a Psychic-type attack.",
		shortDesc: "At 1/3 or less of its max HP, this Pokemon's offensive stat is 1.5x with Psychic attacks.",
		rating: 2,
		num: 0,
	},
	regurgitation: {
		onAfterMove(source, target, move) {
			if (source === target || target.fainted || target.isSemiInvulnerable()) return;
			if (move.category === "Special" && move.target !== "normal") return;
			if (!source.species.name.includes('Muk-Delta')) return;
			const muktype = source.species.name.includes('Muk-Delta-') ? source.species.name.replace('Muk-Delta-', '') : 'Water';
			if (this.dex.getImmunity(muktype, target)) {
				this.damage((target.maxhp / 6) * (2 ** this.dex.getEffectiveness(muktype, target)), target, source);
			}
		},
		flags: {},
		name: "Regurgitation",
		shortDesc: "After attacking deals 1/6 max HP modified by forme's type effectiveness.",
		rating: 3,
		num: 0,
	},
	shadowcall: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Dark' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Shadow Call boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Dark' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Shadow Call boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Shadow Call",
		desc: "When this Pokemon has 1/3 or less of its maximum HP, rounded down, its offensive stat is multiplied by 1.5 while using a Dark-type attack.",
		shortDesc: "At 1/3 or less of its max HP, this Pokemon's offensive stat is 1.5x with Dark attacks.",
		rating: 2,
		num: 0,
	},
	shadowdance: {
		onModifySpe(spe, pokemon) {
			if (pokemon.effectiveWeather() === 'newmoon') {
				return this.chainModify(2);
			}
		},
		flags: {},
		name: "Shadow Dance",
		shortDesc: "If New Moon is active, this Pokemon's Speed is doubled.",
		rating: 3,
		num: 0,
	},
	shadowsynergy: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Dark') {
				this.debug('Shadow Synergy boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Dark') {
				this.debug('Shadow Synergy boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Shadow Synergy",
		shortDesc: "This Pokemon's offensive stat is multiplied by 1.5 while using a Dark-type attack.",
		rating: 2,
		num: 0,
	},
	spectraljaws: {
		onBasePowerPriority: 19,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags.bite) {
				return this.chainModify(1.3);
			}
		},
		onModifyMove(move, pokemon) {
			if (move.flags.bite) {
				move.category = 'Special';
			}
		},
		flags: {},
		name: "Spectral Jaws",
		shortDesc: "Biting moves have 1.3x power and become Special.",
		rating: 3,
		num: 0,
	},
	speedswap: {
		onStart(pokemon) {
			this.field.addPseudoWeather('trickroom');
		},
		flags: {},
		name: "Speed Swap",
		shortDesc: "This Pokemon summons Trick Room on switch-in.",
		rating: 4.5,
		num: 0,
	},
	spiritcall: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Ghost' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Spirit Call boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Ghost' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Spirit Call boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Spirit Call",
		desc: "When this Pokemon has 1/3 or less of its maximum HP, rounded down, its offensive stat is multiplied by 1.5 while using a Ghost-type attack.",
		shortDesc: "At 1/3 or less of its max HP, this Pokemon's offensive stat is 1.5x with Ghost attacks.",
		rating: 2,
		num: 0,
	},
	supercell: {
		onStart(pokemon) {
			this.singleEvent('WeatherChange', this.effect, this.effectState, pokemon);
		},
		onWeatherChange(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Typhlosion-Delta' || pokemon.transformed || !pokemon.isActive) return;
			if (['newmoon', 'raindance', 'primordialsea'].includes(pokemon.effectiveWeather()) &&
				pokemon.species.id !== 'typhlosiondeltamegaactive') {
				pokemon.formeChange('typhlosiondeltamegaactive', this.effect, false, '0', '[msg]');
			} else if (pokemon.species.id === 'typhlosiondeltamegaactive') {
				pokemon.formeChange('typhlosiondeltamega', this.effect, false, '0', '[msg]');
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, pokemon) {
			if (['newmoon', 'raindance', 'primordialsea'].includes(pokemon.effectiveWeather())) {
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Supercell",
		desc: "If New Moon/Rain is active, this Pokemon's Special Attack is multiplied by 1.5.",
		shortDesc: "If New Moon/Rain is active, this Pokemon's Sp. Atk is 1.5x.",
		rating: 2,
		num: 0,
	},
	unleafed: {
		onStart(pokemon) {
			pokemon.addVolatile('unleafed');
		},
		condition: {
			duration: 0,
			durationCallback(pokemon) {
				return pokemon.side.totalFainted + 2;
			},
			onStart(pokemon) {
				if (pokemon.side.totalFainted) {
					this.boost({ atk: 1, def: 1, spa: 1, spd: 1, spe: 1 });
				}
			},
			onEnd(pokemon) {
				if (pokemon.side.totalFainted) {
					this.boost({ atk: -1, def: -1, spa: -1, spd: -1, spe: -1 });
				}
			},
		},
		name: "Unleafed",
		shortDesc: "Receives a temporary omniboost on Switch-in based on fallen allies.",
		rating: 2.5,
		num: 0,
	},
	vampiric: {
		onAfterMoveSecondarySelf(pokemon, target, move) {
			if (this.checkMoveMakesContact(move, pokemon, target, false)) {
				this.heal(pokemon.lastDamage / 4, pokemon, pokemon);
			}
		},
		flags: {},
		name: "Vampiric",
		shortDesc: "After making contact, holder gains 1/4 of the damage in HP dealt to a target.",
		rating: 3.5,
		num: 0,
	},
	vaporization: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Water') {
				this.add('-immune', target, '[from] ability: Vaporization');
				return null;
			}
		},
		onResidual(pokemon) {
			if (!pokemon.hp) return;
			for (const target of this.getAllActive()) {
				if (!target?.hp) continue;
				if (target.hasType('Water') && !(target.teraType === 'Stellar' && target.terastallized)) {
					this.damage(target.maxhp / 8, target, pokemon);
				}
			}
		},
		name: "Vaporization",
		shortDesc: "Vaporizes Water-type attacks and damages water types.",
		flags: { breakable: 1 },
		rating: 3.5,
		num: 0,
	},
	winterjoy: {
		onBasePower(basePower, pokemon, target, move) {
			const curMonth = (new Date()).getMonth();
			if ([10, 11, 0, 1].includes(curMonth)) return this.chainModify([5734, 4096]);
			if ([4, 5, 6, 7].includes(curMonth)) return this.chainModify([2867, 4096]);
		},
		flags: {},
		name: "Winter Joy",
		shortDesc: "Power is boosted from Nov-Feb, cut from May-Aug.",
		rating: 3,
		num: 0,
	},
	glitch: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target, true)) {
				source.faint(target, this.effect);
			}
		},
		flags: {},
		desc: "Pokémon making contact with this Pokémon faint.",
		shortDesc: "Pokemon making contact with this Pokemon faint.",
		name: "Glitch",
		rating: 5,
		num: 0,
	},
};
