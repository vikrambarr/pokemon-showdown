export const Rulesets: import('../sim/dex-formats').ModdedFormatDataTable = {
	noeventmoves: {
		effectType: 'ValidatorRule',
		name: "No Event Moves",
		desc: "Removes verification of event moves.",
		ruleset: ["Obtainable", "!Obtainable Misc"],
		onChangeSet(set) {
			const species = this.dex.species.get(set.species);

			if (species.gender) {
				if (set.gender !== species.gender) {
					set.gender = species.gender;
				}
			} else {
				if (set.gender !== 'M' && set.gender !== 'F') {
					set.gender = '';
				}
			}

			if (set.moves) {
				const hasMove: { [k: string]: true } = {};
				for (const moveId of set.moves) {
					const move = this.dex.moves.get(moveId);
					const moveid = move.id;
					if (hasMove[moveid]) return [`${species.baseSpecies} has multiple copies of ${move.name}.`];
					hasMove[moveid] = true;
				}
			}
		},
	},
	nuclearclause: {
		effectType: 'Rule',
		name: 'Nuclear Clause',
		desc: "Prevents non-Nuclear Pok&eacute;mon from using Nuclear moves",
		onValidateSet(set) {
			const problems = [];
			const species = this.dex.species.get(set.species);
			if (!species.types.includes('Nuclear')) {
				if (set.teraType === 'Nuclear') {
					problems.push(`Your ${species.name} has Tera-type Nuclear, but is not a Nuclear type.`);
				}
				for (const move of set.moves) {
					if (this.dex.moves.get(move).type === 'Nuclear') {
						problems.push(
							`The Nuclear-type move ${this.dex.moves.get(move).name} cannot be used on non-Nuclear-type Pokémon ${species.name}.`
						);
					}
				}
			}
			if (problems.length) return problems;
		},
	},
	nuclearmoveclause: {
		effectType: 'ValidatorRule',
		name: 'Nuclear Move Clause',
		desc: "Prevents Nuclear moves from being used",
		onValidateSet(set) {
			const problems = [];
			for (const move of set.moves) {
				if (set.teraType === 'Nuclear' && ['terablast', 'revelationdance'].includes(this.dex.moves.get(move).id)) {
					problems.push(`The combination of Nuclear Tera-type with ${this.dex.moves.get(move).name} cannot be used.`);
				}
				if (set.item === 'Hafli Berry' && this.dex.moves.get(move).id === 'naturalgift') {
					problems.push(`The combination of ${set.item} with ${this.dex.moves.get(move).name} cannot be used.`);
				}
				if (this.dex.moves.get(move).type === 'Nuclear') {
					problems.push(`The Nuclear-type move ${this.dex.moves.get(move).name} cannot be used.`);
				}
			}
			if (problems.length) return problems;
		},
	},
	megaformeclause: {
		effectType: 'Rule',
		name: 'Mega Forme Clause',
		desc: "Prevents Pokémon from mega-evolving from a different form.",
		onValidateSet(set) {
			const species = this.dex.species.get(set.species);
			const item = this.dex.items.get(set.item);
			const megaEvolves = item.megaStone ? Object.keys(item.megaStone)[0] : false;
			if (!megaEvolves) return;
			if ((!species.isMega && this.toID(megaEvolves) !== species.id)) {
				return [`${set.species} cannot hold ${set.item}.`];
			}
		},
	},
	lgpeclause: {
		effectType: 'ValidatorRule',
		name: 'LGPE Clause',
		desc: "Prevents LGPE moves from being used.",
		onValidateSet(set) {
			const problems = [];
			for (const move of set.moves) {
				if (this.dex.moves.get(move).isNonstandard === 'LGPE') {
					problems.push(`The LGPE move ${this.dex.moves.get(move).name} cannot be used.`);
				}
			}
			if (problems.length) return problems;
		},
	},
	restrictability: {
		effectType: 'ValidatorRule',
		name: 'Restrict Ability',
		desc: `Restricts ability to 1 per team. Usage: Restrict Ability = [abilityID], e.g. "Restrict Ability = wonderguard"`,
		hasValue: true,
		onValidateRule(value) {
			const ability = this.dex.abilities.get(value);
			if (!ability.exists) throw new Error(`Misspelled ability "${ability}"`);
			return ability.name;
		},
		onValidateTeam(team) {
			const ability = this.dex.abilities.get(this.ruleTable.valueRules.get('restrictability'));
			const restrictedAbility = [];
			for (const set of team) {
				const species = this.dex.species.get(set.species);
				if (set.ability === ability.name) restrictedAbility.push(species.name);
			}
			if (restrictedAbility.length > 1) {
				return [`You can only use one restricted ability (you have: ${restrictedAbility.join(', ')})`];
			}
		},
	},
	mixandmegamod: {
		effectType: "Rule",
		name: "Mix and Mega Mod",
		desc: `Pokemon can hold any Mega Stone. Each Mega Stone gives the same base stat bonuses to any Pokemon.`,
		ruleset: ['Overflow Stat Mod'],
		onBegin() {
			this.add('rule', 'Mix and Mega Mod: Pokemon can use any Mega Stone.');
		},
		onValidateSet(set) {
			const species = this.dex.species.get(set.species);
			if (this.ruleTable.isRestrictedSpecies(species) && this.dex.items.get(set.item).megaStone) {
				return [`${set.species} is restricted, and therefore cannot hold a Mega Stone`];
			}
		},
		onModifySpeciesPriority: 7,
		onModifySpecies(species, target, source, effect) {
			if (!target || !target.item) return;
			const item = this.dex.items.get(target.item);
			if (!item.megaStone) return;
			if (!target.itemState.hasMegaEvolved) return;
			const pokemon = this.dex.deepClone(species);

			const [baseSpecies, megaSpecies] = Object.entries(item.megaStone)[0].map(name => this.dex.species.get(name));
			pokemon.bst = 0;
			let statName: StatID;
			for (statName in pokemon.baseStats as StatsTable) {
				const statDif = megaSpecies.baseStats[statName] - baseSpecies.baseStats[statName];
				pokemon.baseStats[statName] = this.clampIntRange(pokemon.baseStats[statName] + statDif, 1, 255);
				pokemon.bst += pokemon.baseStats[statName];
			}
			const megaAbility = this.dex.species.get(Object.values(item.megaStone)[0]).abilities[0];
			pokemon.abilities = {
				0: megaAbility,
				1: megaAbility,
				H: megaAbility,
				S: megaAbility,
			};
			const changesType = megaSpecies.types.length < baseSpecies.types.length ||
				megaSpecies.types.some(type => !baseSpecies.types.includes(type));
			const types = species.types.slice(0, 2);
			let megaType = '';
			for (const i of [0, 1]) {
				if (!changesType || megaSpecies.types[i] === baseSpecies.types[i]) continue;
				types[i] = megaType = megaSpecies.types[i] || megaSpecies.types[0];
			}
			if (megaType && !species.types.includes(megaType)) {
				pokemon.types = species.types.length > 2 ? [...species.types, megaType] : types;
			}
			if (species.types.length < 3 && types[0] === types[1]) pokemon.types = [types[0]];
			return pokemon;
		},
		onAfterMega(pokemon) {
			pokemon.itemState.hasMegaEvolved = true;
			pokemon.formeChange(this.dex.species.get(pokemon.itemState.baseSpecies).name, this.effect, true);
			this.add('-ability', pokemon, this.dex.abilities.get(pokemon.ability).name);
			this.add('-start', pokemon, `${this.dex.items.get(pokemon.item).name}`);
			return pokemon;
		},
		onBeforeSwitchIn(pokemon) {
			if (!pokemon || !pokemon.item || pokemon.itemState.hasMegaEvolved) return;
			const item = this.dex.items.get(pokemon.item);
			if (!item.megaStone) return;
			pokemon.itemState.baseSpecies = pokemon.species;
			pokemon.canMegaEvo = Object.values(item.megaStone)[0];
		},
		onSwitchIn(pokemon) {
			if (!pokemon.itemState.hasMegaEvolved) return;
			this.add('replace', pokemon, pokemon.getUpdatedDetails());
			this.add('-ability', pokemon, this.dex.abilities.get(pokemon.ability).name);
			this.add('-start', pokemon, `${this.dex.items.get(pokemon.item).name}`);
		},
		onTakeItem(item, pokemon, source, move) {
			if (this.dex.items.get(pokemon.item).megaStone) return false;
		},
	},
	linkevs: {
		effectType: 'ValidatorRule',
		name: 'Link EVs',
		desc: "Links the Attack and Sp. Atk EVs. Requires removing the EV limits.",
		onValidateSet(set) {
			const problems = [];
			const atkEV = set.evs['atk'];
			const spaEV = set.evs['spa'];

			if (atkEV !== spaEV) problems.push(`${set.name || set.species}'s Attack and Special Attack EVs must be the same.`);
			if (set.evs['hp'] + set.evs['atk'] + set.evs['def'] + set.evs['spd'] + set.evs['spe'] > 512) {
				problems.push(`${set.name || set.species}'s is over the EV limit.`);
			}
			return problems;
		},
	},
	multiplemega: {
		effectType: 'Rule',
		name: 'Multiple Mega',
		desc: "Allows for a given number of Pokémon to mega-evolve during battle.",
		hasValue: 'positive-integer',
		onBegin() {
			this.add('rule', 'Multiple Mega: Allows for a given number of Pokémon to mega-evolve during battle.');
			const runMegaEvo = this.actions.runMegaEvo;
			const megaLimit = Number(this.ruleTable.valueRules.get('multiplemega') || 1);
			const megaCount: { [sideid: string]: number } = {};
			this.actions.runMegaEvo = function (pokemon) {
				const canMegaEvo = pokemon.side.pokemon.map(ally => ally.canMegaEvo);
				const isMega = !!pokemon.canMegaEvo;
				const result = runMegaEvo.call(this, pokemon);
				if (result && isMega) megaCount[pokemon.side.id] = (megaCount[pokemon.side.id] || 0) + 1;
				if ((megaCount[pokemon.side.id] || 0) < megaLimit) {
					pokemon.side.pokemon.forEach((ally, i) => {
						if (ally !== pokemon) ally.canMegaEvo = canMegaEvo[i];
					});
				}
				return result;
			};
			for (const side of this.sides) {
				const chooseMove = side.chooseMove;
				side.chooseMove = function (...args) {
					const mega = this.choice.mega;
					this.choice.mega = false;
					const result = chooseMove.apply(this, args);
					this.choice.mega ||= mega;
					return result;
				};
			}
		},
		onValidateRule(value) {
			const num = Number(value);
			if (num < 1 || num > this.ruleTable.maxTeamSize) {
				throw new Error(`Multiple Mega clause must be between 1 and ${this.ruleTable.maxTeamSize}.`);
			}
			return value;
		},
	},
	runeclause: {
		effectType: 'ValidatorRule',
		name: 'Rune Clause',
		desc: "Limit one rune per team.",
		onValidateTeam(team) {
			const runes = [];
			for (const set of team) {
				const item = this.dex.items.get(set.item);
				if (item.name.includes(" Rune")) runes.push(item.name);
			}
			if (runes.length > 1) {
				return [`You can only use one rune (you have: ${runes.join(', ')})`];
			}
		},
	},
	batonpassstatclause: {
		effectType: 'ValidatorRule',
		name: 'Baton Pass Stat Clause',
		desc: "Stops teams from having a Pokemon with Baton Pass that has any way to boost its stats",
		onBegin() {
			this.add('rule', 'Baton Pass Stat Clause: No Baton Passer may have a way to boost its stats');
		},
		onValidateTeam(team) {
			const boostingEffects = [
				'absorbbulb', 'acidarmor', 'acupressure', 'agility', 'amnesia', 'ancientpower', 'angerpoint', 'angershell', 'apicotberry', 'aquastep', 'aromaticmist', 'aurawheel', 'autotomize',
				'barrier', 'battlebond', 'beastboost', 'berserk', 'bellydrum', 'bulkup', 'calmmind', 'cellbattery', 'charge', 'chargebeam', 'chillingneigh',
				'clangoroussoul', 'coil', 'contrary', 'cosmicpower', 'cottonguard', 'curse', 'competitive', 'defensecurl', 'defendorder', 'defiant',
				'diamondstorm', 'download', 'dragondance', 'embodyaspect', 'electroshot', 'esperwing', 'fellstinger', 'fierydance', 'filletaway', 'flamecharge',
				'flowershield', 'focusenergy', 'ganlonberry', 'geomancy', 'grimneigh', 'growth', 'guarddog', 'harden', 'honeclaws', 'howl', 'intrepidsword',
				'irondefense', 'justified', 'lansatberry', 'liechiberry', 'lightningrod', 'meditate', 'metalclaw', 'meteorbeam', 'meteormash', 'moody',
				'motordrive', 'moxie', 'mysticalpower', 'nastyplot', 'noretreat', 'ominouswind', 'opportunist', 'orderup', 'poweruppunch', 'petayaberry',
				'psyshieldbash', 'quiverdance', 'rage', 'rattled', 'rockpolish', 'salacberry', 'sapsipper', 'scaleshot', 'sharpen', 'shellsmash', 'shelter', 'shiftgear',
				'silverwind', 'skullbash', 'steelwing', 'stockpile', 'stuffcheeks', 'soulheart', 'spectralthief', 'speedboost', 'stamina', 'starfberry', 'steadfast',
				'steamengine', 'steelwing', 'stockpile', 'stormdrain', 'swordsdance', 'tailglow', 'takeheart', 'thermalexchange', 'tidyup', 'torchsong', 'trace', 'trailblaze',
				'victorydance', 'watercompaction', 'weakarmor', 'weaknesspolicy', 'wellbakedbody', 'windrider', 'withdraw', 'workup',
			];
			for (const set of team) {
				const moves = set.moves.map(this.toID);
				if (!moves.includes('batonpass' as ID)) continue;
				let passableBoosts = false;
				let passableBoostsSource = "";
				const item = this.toID(set.item);
				const ability = this.toID(set.ability);
				const boostingMove = set.moves.find(m => boostingEffects.includes(this.toID(m)) ||
					Object.values(this.dex.moves.get(m).boosts || {}).some(boost => boost > 0));
				if (boostingMove) {
					passableBoosts = true;
					passableBoostsSource = boostingMove;
				} else if (boostingEffects.includes(item)) {
					passableBoosts = true;
					passableBoostsSource = set.item;
				} else if (boostingEffects.includes(ability)) {
					passableBoosts = true;
					passableBoostsSource = set.ability;
				}
				if (passableBoosts) {
					return [
						`${set.name || set.species} has Baton Pass and a way to boost its stats (${passableBoostsSource}), which is banned by Baton Pass Stat Clause.`,
					];
				}
			}
		},
	},
	drypassclause: {
		effectType: 'ValidatorRule',
		name: 'DryPass Clause',
		desc: "Stops teams from bringing Pokemon with Baton Pass + any form of trapping, residual recovery, boosting, or Substitute",
		ruleset: ['Baton Pass Stat Clause', 'Baton Pass Stat Trap Clause'],
		banlist: [
			'Baton Pass + Substitute', 'Baton Pass + Ingrain', 'Baton Pass + Aqua Ring', 'Baton Pass + Block', 'Baton Pass + Mean Look',
			'Baton Pass + Spider Web', 'Baton Pass + Jaw Lock', 'Baton Pass + Anchor Shot', 'Baton Pass + Spirit Shackle',
			'Baton Pass + Thousand Waves',
		],
	},
	directsleepmovesclause: {
		effectType: 'ValidatorRule',
		name: 'Direct Sleep Moves Clause',
		desc: "Bans all moves that induce sleep, except Yawn",
		onBegin() {
			this.add('rule', 'Direct Sleep Moves Clause: Sleep-inducing moves are banned, except Yawn');
		},
		onValidateSet(set) {
			const problems = [];
			if (set.moves) {
				for (const id of set.moves) {
					const move = this.dex.moves.get(id);
					if (move.status === 'slp') problems.push(move.name + ' is banned by Direct Sleep Moves Clause.');
				}
			}
			return problems;
		},
	},
	speciesabilities: {
		effectType: 'ValidatorRule',
		name: 'Species Abilities',
		desc: "Pok&eacute;mon can only have their own species' abilities, without the rest of Obtainable Abilities' checks.",
		onValidateSet(set) {
			const species = this.dex.species.get(set.species);
			const abilities = Object.values(species.abilities);
			if (!abilities.includes(this.dex.abilities.get(set.ability).name)) {
				return [`${species.name} only has access to the following abilities: ${abilities.join(', ')}.`];
			}
		},
	},
	separatemovelegality: {
		effectType: 'ValidatorRule',
		name: 'Separate Move Legality',
		desc: "Each move only has to be learnable on its own, so egg move combinations and moves from incompatible sources are allowed.",
		checkCanLearn(move, species, setSources, set) {
			return this.checkCanLearn(move, species, this.allSources(species), set);
		},
	},
};
