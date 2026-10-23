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
	infinitefusionmod: {
		effectType: "Rule",
		name: "Infinite Fusion Mod",
		desc: `Pok&eacute;mon can fuse with other Pok&eacute;mon!`,
		onBegin() {
			this.add('rule', 'Infinite Fusion Mod: Pok\u00e9mon can fuse with other Pok\u00e9mon!');
		},
		onValidateSet(set) {
			if (this.format.id.includes("custom") || this.format.name.includes("CG")) return;
			const problems: string[] = [];
			const setHas: { [k: string]: true } = {};

			const species = this.dex.species.get(set.species);
			const fusion = this.dex.species.get(set.fusion);
			const abilityPool = new Set<string>(Object.values(species.abilities));

			if (set.fusion && !fusion.exists) return [`The Pokemon "${set.fusion}" does not exist.`];

			if (set.fusion && fusion.exists) {
				if ((species.eggGroups.includes("Infinite Fusion") || fusion.eggGroups.includes("Infinite Fusion")))
					return [`You cannot fuse with triple fusions.`];

				[set.species, set.fusion] = [set.fusion, set.species];
				const { tierSpecies } = this.getValidationSpecies(set);
				problems.push(...this.validateForme(set));
				const problem = this.checkSpecies(set, fusion, tierSpecies, setHas);
				if (problem) problems.push(problem);
				[set.species, set.fusion] = [set.fusion, set.species];

				if (this.ruleTable.has('natdexmod')) {
					if (fusion.natDexTier === 'Illegal') {
						if (this.ruleTable.has(`+pokemon:${species.id}`)) return;
						return [`${fusion.name} does not exist in the National Dex.`];
					}
					const requireObtainable = this.ruleTable.has('obtainable');
					if (requireObtainable) {
						if (fusion.natDexTier === "Unreleased") {
							const basePokemon = this.toID(fusion.baseSpecies);
							if (this.ruleTable.has(`+pokemon:${fusion.id}`) || this.ruleTable.has(`+basepokemon:${basePokemon}`)) {
								return;
							}
							return [`${fusion.name} does not exist in the National Dex.`];
						}
					}
				}

				for (const ability of Object.values(fusion.abilities)) {
					abilityPool.add(ability);
				}
			}

			const ability = this.dex.abilities.get(set.ability);
			if (!abilityPool.has(ability.name)) {
				problems.push(`${species.name}/${fusion.name} only has access to the following abilities: ${Array.from(abilityPool).join(', ')}.`);
			}

			return problems;
		},
		onModifySpeciesPriority: 8,
		onModifySpecies(species, target, source, effect) {
			if (!target) return;
			if (effect && ['imposter', 'transform', 'necromancy'].includes(effect.id)) return;

			const newSpecies = this.dex.deepClone(this.dex.species.get(species.name));

			const fusionName = target.m.fusion;
			if (!fusionName || fusionName === newSpecies.name) return;
			const fusionSpecies = this.dex.species.get(fusionName);
			if (!fusionSpecies.exists) return;

			newSpecies.bst = 0;
			for (const stat in newSpecies.baseStats) {
				if (stat === 'hp' || stat === 'spa' || stat === 'spd') {
					newSpecies.baseStats[stat] = Math.floor((species.baseStats[stat] * 2 / 3) + (fusionSpecies.baseStats[stat] * 1 / 3));
				}
				if (stat === 'atk' || stat === 'def' || stat === 'spe') {
					newSpecies.baseStats[stat] = Math.floor((species.baseStats[stat] * 1 / 3) + (fusionSpecies.baseStats[stat] * 2 / 3));
				}
				newSpecies.bst += newSpecies.baseStats[stat];
			}

			newSpecies.maxHP =
				[target.baseAbility, this.dex.abilities.get(target.set.ability2).id as string].includes('wonderguard') ?
					1 : undefined;
			newSpecies.weightkg = (fusionSpecies.weightkg + species.weightkg) / 2;
			newSpecies.weighthg = newSpecies.weightkg * 10;

			let speciesTypes = newSpecies.types;
			let fusionTypes = fusionSpecies.types;

			if (speciesTypes.length === 2 && speciesTypes.includes('Flying') && speciesTypes.includes('Normal'))
				speciesTypes = ['Flying'];
			if (fusionTypes.length === 2 && fusionTypes.includes('Flying') && fusionTypes.includes('Normal'))
				fusionTypes = ['Flying'];

			const typesSet = new Set([speciesTypes[0]]);
			const bonusType = this.dex.types.get(fusionTypes[fusionTypes.length - 1]);
			if (bonusType.exists) typesSet.add(bonusType.name);
			if (fusionTypes.length === 2 && typesSet.size === 1) typesSet.add(fusionTypes[0]);

			return { ...newSpecies, types: [...typesSet] };
		},
	},
	ifmovelegality: {
		effectType: 'ValidatorRule',
		name: 'IF Move Legality',
		desc: "Allows Pok&eacute;mon to use any move that their fused mon has.",
		ruleset: ['OM Unobtainable Moves'],
		checkCanLearn(move, species, setSources, set) {
			const fusion = this.dex.species.get(set.fusion);
			const baseCanLearn = this.checkCanLearn(move, species, this.allSources(species), set);
			const tutorMoves = (this.format.mod.includes("pokeathlon") || this.format.mod.includes("chaos")) ?
				{ ...fusionMoves, ...PoAfusionMoves } : fusionMoves;
			const mgMoves = (this.format.mod.includes("pokeathlon") || this.format.mod.includes("chaos")) ? {} : mysteryGiftMoves;
			if (move.id in mgMoves) {
				const data = mgMoves[move.id];
				for (const possibleSource of data) {
					if ("mysteryGift" in possibleSource) {
						if (species.exists && possibleSource["mysteryGift"].includes(species.id)) return null;
						if (fusion.exists && possibleSource["mysteryGift"].includes(fusion.id)) return null;
					}
				}
			}
			if (fusion.exists && species.exists) {
				if (!this.checkCanLearn(move, fusion, this.allSources(fusion), set) || !baseCanLearn) return null;

				if (move.id in tutorMoves) {
					const allCombinations: string[][] = [];
					const fusionLine: string[] = [fusion.name];
					const speciesLine: string[] = [species.name];

					if (fusion.changesFrom) fusionLine.push(fusion.changesFrom);
					if (fusion.prevo) fusionLine.push(fusion.prevo);
					if (this.dex.species.get(fusion.prevo).prevo) fusionLine.push(this.dex.species.get(fusion.prevo).prevo);

					if (species.changesFrom) speciesLine.push(species.changesFrom);
					if (species.prevo) speciesLine.push(species.prevo);
					if (this.dex.species.get(species.prevo).prevo) speciesLine.push(this.dex.species.get(species.prevo).prevo);

					for (const head of fusionLine) {
						for (const body of speciesLine) {
							allCombinations.push(...[[head, body], [body, head]]);
						}
					}

					for (const combination of allCombinations) {
						const combination_head = this.dex.species.get(combination[0]);
						const combination_body = this.dex.species.get(combination[1]);

						let speciesTypes = combination_head.types;
						let fusionTypes = combination_body.types;

						if (speciesTypes.length === 2 && speciesTypes.includes('Flying') && speciesTypes.includes('Normal')) {
							speciesTypes = ['Flying'];
						}
						if (fusionTypes.length === 2 && fusionTypes.includes('Flying') && fusionTypes.includes('Normal')) {
							fusionTypes = ['Flying'];
						}

						const typesSet = new Set([speciesTypes[0]]);
						const bonusType = this.dex.types.get(fusionTypes[fusionTypes.length - 1]);
						if (bonusType.exists) typesSet.add(bonusType.name);
						if (fusionTypes.length === 2 && typesSet.size === 1) typesSet.add(fusionTypes[0]);

						const data = tutorMoves[move.id];
						for (const possibleSource of data) {
							let canLearn = true;
							if ("fusion" in possibleSource) {
								if (!possibleSource["fusion"].includes(combination_head.id) &&
									!possibleSource["fusion"].includes(combination_body.id)) canLearn = false;
							}
							if ("type" in possibleSource) {
								for (const type of possibleSource["type"]) {
									if (!typesSet.has(type)) canLearn = false;
								}
							}
							if ("learns" in possibleSource) {
								let canLearnReqMove = false;
								for (const reqMove of possibleSource["learns"]) {
									const required = this.dex.moves.get(reqMove);
									if (
										!this.checkCanLearn(required, combination_head, this.allSources(combination_head), set) ||
										!this.checkCanLearn(required, combination_body, this.allSources(combination_body), set)
									) canLearnReqMove = true;
								}
								if (!canLearnReqMove) canLearn = false;
							}
							if (canLearn) return null;
						}
					}
				}
			}
			return baseCanLearn;
		},
	},
	fusionspeciesclause: {
		effectType: 'ValidatorRule',
		name: 'Fusion Species Clause',
		desc: "Prevents teams from having more than one Pok&eacute;mon; accounts for fusions.",
		onBegin() {
			this.add('rule', 'Fusion Species Clause: Limit one of each Pokémon total.');
		},
		onValidateTeam(team, format) {
			const speciesTable = new Set<number>();
			for (const set of team) {
				const species = this.dex.species.get(set.species);
				const fusion = this.dex.species.get(set.fusion);
				if (speciesTable.has(fusion.num) || speciesTable.has(species.num)) {
					return [
						`You are limited to only one of each Pokémon by Fusion Species Clause.`,
						`(You have more than one ${speciesTable.has(species.num) ? species.baseSpecies : fusion.baseSpecies})`,
					];
				}
				speciesTable.add(species.num);
				if (fusion.num) speciesTable.add(fusion.num);
			}
		},
	},
	fusionsametypeclause: {
		effectType: 'ValidatorRule',
		name: 'Fusion Same Type Clause',
		desc: "Forces all Pok&eacute;mon on a team to share a type with each other",
		onBegin() {
			this.add('rule', 'Same Type Clause: Pokémon in a team must share a type');
		},
		onValidateTeam(team) {
			let typeTable: string[] = [];
			for (const [i, set] of team.entries()) {
				const species = this.dex.species.get(set.species);
				if (!species.types) return [`Invalid pokemon ${set.name || set.species}`];

				let types = species.types;

				if (set.fusion && this.dex.species.get(set.fusion).exists) {
					let speciesTypes = species.types;
					let fusionTypes = this.dex.species.get(set.fusion).types;

					const typesSet = new Set([speciesTypes[0]]);
					if (speciesTypes.length === 2 && speciesTypes.includes('Flying') && speciesTypes.includes('Normal')) {
						speciesTypes = ['Flying'];
					}
					if (fusionTypes.length === 2 && fusionTypes.includes('Flying') && fusionTypes.includes('Normal')) {
						fusionTypes = ['Flying'];
					}

					const bonusType = this.dex.types.get(fusionTypes[fusionTypes.length - 1]);
					if (bonusType.exists) typesSet.add(bonusType.name);
					if (fusionTypes.length === 2 && typesSet.size === 1) typesSet.add(fusionTypes[0]);

					types = [...typesSet];
				}

				if (i === 0) {
					typeTable = types;
				} else {
					typeTable = typeTable.filter(type => types.includes(type));
				}

				if (!typeTable.length) return [`Your team must share a type.`];
			}
			for (const set of team) {
				if (this.gen === 9 && set.teraType &&
					!typeTable.includes(set.teraType) && this.ruleTable.has(`enforcesameteratype`)) {
					return [`${set.species}'s Tera Type must match the team's type.`];
				}
			}
		},
	},

	sketchclause: {
		effectType: 'ValidatorRule',
		name: 'Sketch Clause',
		desc: "Removes Sketch-Move legality entirely.",
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
			const species = this.dex.species.get(set.species);
			for (const move of set.moves) {
				if (set.fusion) {
					const fusion = this.dex.species.get(set.fusion);
					let speciesTypes = species.types;
					let fusionTypes = fusion.types;

					if (speciesTypes.length === 2 && speciesTypes.includes('Flying') && speciesTypes.includes('Normal')) {
						speciesTypes = ['Flying'];
					}
					if (fusionTypes.length === 2 && fusionTypes.includes('Flying') && fusionTypes.includes('Normal')) {
						fusionTypes = ['Flying'];
					}

					const typesSet = new Set([speciesTypes[0]]);
					const bonusType = this.dex.types.get(fusionTypes[fusionTypes.length - 1]);
					if (bonusType.exists) typesSet.add(bonusType.name);
					if (fusionTypes.length === 2 && typesSet.size === 1) typesSet.add(fusionTypes[0]);

					const fusedTypes = [...typesSet];
					if (fusedTypes[0] === 'Nuclear' && this.dex.moves.get(move).id === 'revelationdance') {
						problems.push(`The Nuclear-type move ${this.dex.moves.get(move).name} cannot be used.`);
					}
				}
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
	doubleabilitymod: {
		effectType: "Rule",
		name: "Double Ability Mod",
		desc: `Pok&eacute;mon can have two abilities.`,
		onValidateSet(set) {
			const problems: string[] = [];

			if (this.format.name.includes('Custom Game') || this.format.name.includes(' CG')) return;

			const species = this.dex.species.get(set.species);
			const ability1Pool = new Set<string>(Object.values(species.abilities));
			let ability2Pool = new Set<string>();

			if (set.fusion) {
				const fusionSpecies = this.dex.species.get(set.fusion);
				ability2Pool = new Set<string>(Object.values(fusionSpecies.abilities));
			} else {
				ability2Pool = new Set(ability1Pool);
			}

			if ((!set.ability || !set.ability2) && !(!set.fusion && ability1Pool.size === 1)) {
				problems.push(`This ruleset requires two abilities to be specified.`);
				return problems;
			}
			const ability = this.dex.abilities.get(set.ability);
			const ability2 = this.dex.abilities.get(set.ability2);

			const possibleProblems: string[] = [];
			if (!ability1Pool.has(ability.name)) {
				possibleProblems.push(`${set.species} (head) only has access to the following abilities: ${Array.from(ability1Pool).join(', ')}.`);
			}
			if (ability2.exists && !ability2Pool.has(ability2.name)) {
				const bodyName = set.fusion || set.species;
				possibleProblems.push(`${bodyName} (body) only has access to the following abilities: ${Array.from(ability2Pool).join(', ')}.`);
			}
			const validSwappedAbilities =
				possibleProblems.length === 2 && ability1Pool.has(ability2.name) && ability2Pool.has(ability.name);
			if (!validSwappedAbilities) for (const problem of possibleProblems) problems.push(problem);

			if (set.ability2) {
				const banReason = this.ruleTable.check('ability:' + this.toID(set.ability2));
				if (banReason) problems.push(`${set.ability2} is banned.`);
			}

			if (ability.name === ability2.name) {
				problems.push(`Cannot have the same ability (${ability.name}) twice.`);
			}

			return problems;
		},
		onValidateTeam(team) {
			let restrictedAbility = 0;

			if (this.format.name.includes('Custom Game') || this.format.name.includes(' CG')) return;

			const pivotingAbilities = [
				'Emergency Exit',
				'Wimp Out',
			];
			for (const set of team) {
				const ability2 = this.dex.abilities.get(set.ability2);
				if (pivotingAbilities.includes(set.ability) || (ability2.exists && pivotingAbilities.includes(set.ability2!)))
					restrictedAbility += 1;
			}
			if (restrictedAbility > 1) {
				return [`You can't use both Wimp Out and Emergency Exit`];
			}
		},
		onBegin() {
			for (const pokemon of this.getAllPokemon()) {
				if (pokemon.set.ability2) {
					pokemon.m.innates = [pokemon.set.ability2];
					pokemon.m.activeInnates = [pokemon.set.ability2];
				}
			}
		},
		onBeforeSwitchIn(pokemon) {
			if (pokemon.m.innates) {
				for (const innate of pokemon.m.innates) {
					const effect = 'ability:' + this.toID(innate);
					pokemon.volatiles[effect] = this.initEffectState({ id: effect, target: pokemon });
				}
			}
		},
		onSwitchIn(pokemon) {
			this.add('-displayabilities', pokemon, [pokemon.ability, ...(pokemon.m.innates || [])].join(','));
		},
		onSwitchOut(pokemon) {
			for (const innate of Object.keys(pokemon.volatiles).filter(i => i.startsWith('ability:'))) {
				pokemon.removeVolatile(innate);
			}
		},
		onFaint(pokemon) {
			for (const innate of Object.keys(pokemon.volatiles).filter(i => i.startsWith('ability:'))) {
				const innateEffect = this.dex.conditions.get(innate) as Effect;
				this.singleEvent('End', innateEffect, null, pokemon);
			}
		},
		onAfterMega(pokemon) {
			for (const innate of Object.keys(pokemon.volatiles).filter(i => i.startsWith('ability:'))) {
				pokemon.removeVolatile(innate);
			}
			pokemon.m.innates = undefined;
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
};

export const mysteryGiftMoves: { [key: string]: { [key: string]: string[] }[] } = {
	"rapidspin": [{ "mysteryGift": ["carbink"] }],
};
export const fusionMoves: { [key: string]: { [key: string]: string[] }[] } = {
	"attackorder": [{ "fusion": ["beedrill"] }],
	"pollenpuff": [{ "fusion": ["butterfree", "celebi", "parasect", "vileplume", "breloom"] }],
	"lunge": [{ "fusion": ["spinarak", "ariados", "joltik", "galvantula", "venomoth", "volcarona", "pinsir", "parasect", "ledian", "doduo", "dodrio", "stantler"] }],
	"defendorder": [{ "fusion": ["beedrill"] }],
	"healorder": [{ "fusion": ["beedrill"] }],
	"powder": [{ "fusion": ["butterfree", "venomoth", "volcarona", "parasect", "breloom"] }],
	"tailglow": [{ "fusion": ["mareep", "flaaffy", "ampharos", "lanturn", "zekrom", "reshiram"] }],
	"darkestlariat": [{ "fusion": ["snorlax", "regigigas", "poliwrath", "machamp", "electivire", "dusknoir", "swampert", "krookodile", "golurk"] }],
	"partingshot": [{ "fusion": ["meowth", "persian", "sandile", "krokorok", "krookodile", "umbreon"] }],
	"topsyturvy": [{ "fusion": ["hitmontop", "wobbuffet"] }],
	"zingzap": [{ "fusion": ["pichu", "pikachu", "raichu", "voltorb", "electrode"] }, { "fusion": ["sandslash", "golem"], "type": ["Electric"] }],
	"paraboliccharge": [{ "fusion": ["pichu", "pikachu", "raichu", "magnemite", "magneton", "magnezone", "mareep", "flaaffy", "ampharos", "elekid", "electabuzz", "electivire", "zapdos", "chinchou", "lanturn", "raikou", "klink", "klang", "klinklang", "rotom", "stunfisk"] }],
	"electrify": [{ "fusion": ["klink", "klang", "klinklang"] }, { "type": ["Electric"] }],
	"aromaticmist": [{ "fusion": ["weezing", "bulbasaur", "ivysaur", "venusaur", "chikorita", "bayleef", "meganium", "gloom", "vileplume", "bellossom", "roselia", "roserade"] }],
	"floralhealing": [{ "fusion": ["sunflora", "bellossom", "roselia", "roserade"] }],
	"secretsword": [{ "fusion": ["honedge", "doublade", "aegislash", "gallade", "farfetchd", "absol", "bisharp", "kingambit"] }],
	"matblock": [{ "fusion": ["machop", "machoke", "machamp", "tyrogue", "hitmonlee", "hitmonchan", "hitmontop"] }],
	"mindblown": [{ "fusion": ["voltorb", "electrode", "exeggutor"] }],
	"shelltrap": [{ "fusion": ["magcargo", "forretress"] }],
	"heatcrash": [{ "fusion": ["blaziken", "reshiram", "groudon", "charizard", "golurk", "regigigas", "rhydon", "rhyperior", "snorlax"] }],
	"shadowbone": [{ "fusion": ["marowak"], "type": ["Ghost"] }],
	"spiritshackle": [{ "fusion": ["banette", "spiritomb", "dusknoir", "shedinja", "cofagrigus"] }],
	"trickortreat": [{ "fusion": ["gastly", "haunter", "gengar", "mimikyu", "zorua", "zoroark"] }, { "type": ["Grass", "Ghost"] }],
	"tropkick": [{ "fusion": ["hitmonlee", "hitmontop", "roserade"] }, { "type": ["Grass", "Fighting"] }],
	"strengthsap": [{ "fusion": ["oddish", "gloom", "vileplume", "bellossom", "hoppip", "skiploom", "jumpluff", "bellsprout", "weepinbell", "victreebel", "paras", "parasect", "drifblim", "breloom"] }],
	"icehammer": [{ "type": ["Ice"], "learns": ["crabhammer", "woodhammer"] }],
	"multiattack": [{ "fusion": ["arceus", "mew", "genesect"] }],
	"instruct": [{ "fusion": ["chimchar", "monferno", "infernape", "kadabra", "alakazam", "slowking"] }],
	"psychicterrain": [{ "type": ["Psychic"] }],
	"mistyterrain": [{ "type": ["Fairy"] }],
	"speedswap": [{ "fusion": ["pikachu", "raichu", "abra", "kadabra", "alakazam", "porygon", "porygon2", "porygonz", "mewtwo", "mew", "joltik", "galvantula"] }],
	"sparklingaria": [{ "fusion": ["jynx", "jigglypuff", "wigglytuff"], "type": ["Water"] }, { "fusion": ["lapras"] }],

	"hyperspacefury": [{ "fusion": ["giratina", "palkia", "dialga", "arceus"] }],
	"coreenforcer": [{ "fusion": ["giratina", "palkia", "dialga", "rayquaza"] }],
	"plasmafists": [{ "fusion": ["electabuzz", "electivire", "zekrom"] }, { "fusion": ["rotom"], "learns": ["thunderpunch"] }],
	"lightofruin": [{ "fusion": ["arceus", "mew", "celebi", "jirachi"] }],
	"fleurcannon": [{ "fusion": ["gardevoir", "gallade", "sylveon", "wigglytuff"] }],
	"naturesmadness": [{ "fusion": ["celebi", "kyogre", "groudon", "absol"] }],
	"geomancy": [{ "fusion": ["celebi"] }],
	"vcreate": [{ "fusion": ["entei", "hooh", "typhlosion"] }],
	"magmastorm": [{ "fusion": ["magcargo", "typhlosion", "magmortar", "magmar", "entei", "groudon"] }, { "learns": ["eruption"] }],
	"searingshot": [{ "fusion": ["magmortar"] }],
	"oblivionwing": [{ "fusion": ["murkrow", "honchkrow"] }, { "type": ["Dark", "Flying"] }],
	"moongeistbeam": [{ "fusion": ["cleffa", "clefairy", "clefable"], "type": ["Dark"] }, { "fusion": ["darkrai", "misdreavus", "mismagius"] }],
	"spectralthief": [{ "fusion": ["haunter", "gengar", "banette", "giratina", "honedge", "doublade", "aegislash"] }],
	"seedflare": [{ "fusion": ["jumpluff", "sunflora"] }],
	"landswrath": [{ "fusion": ["groudon"] }],
	"thousandarrows": [{ "fusion": ["sandslash", "jolteon", "ferrothorn"], "type": ["Ground"] }],
	"thousandwaves": [{ "fusion": ["stunfisk", "quagsire", "swampert"] }],
	"freezeshock": [{ "fusion": ["kyurem", "articuno"], "type": ["Electric"] }],
	"iceburn": [{ "fusion": ["kyurem", "articuno"], "type": ["Fire"] }],
	"happyhour": [{ "fusion": ["meowth", "jirachi", "delibird", "munchlax", "snorlax", "pikachu", "raichu"] }],
	"holdhands": [{ "fusion": ["charmander", "bulbasaur", "squirtle", "pikachu", "togepi"] }],
	"sunsteelstrike": [{ "fusion": ["charizard", "volcarona", "flareon", "ninetales", "entei", "hooh", "rapidash"], "type": ["Steel"] }],
	"doubleironbash": [{ "type": ["Steel"], "learns": ["doubleslap"] }],
	"steameruption": [{ "type": ["Water"], "learns": ["eruption"] }],
};
export const PoAfusionMoves: { [key: string]: { [key: string]: string[] }[] } = {
	"zapcannon": [{ "fusion": ["silretro"], "learns": ["inferno"] }],
	"retroblast": [{ "learns": ["thunderbolt"], "type": ["Rock"] }],
	"superheatedcrash": [{ "learns": ["flareblitz", "heatcrash"], "type": ["Water"] }],
	"stoneaxe": [{ "fusion": ["kleavordelta"], "type": ["Rock"] }],
	"floatyfall": [{ "fusion": ["tofagrif"], "learns": ["gravity"] }],
	"thunderouskick": [{ "fusion": ["sekrilon"], "learns": ["thunder"] }],
	"heatcrash": [{ "fusion": ["omecha"], "type": ["Fire"] }],
	"syrupbomb": [{ "fusion": ["mochimechi"], "type": ["Grass"] }],
	"shadowpunch": [{ "fusion": ["hoppyre"], "type": ["Fighting"] }],
	"saltcure": [{ "fusion": ["mosster"], "learns": ["smellingsalts"] }],
	"pyropounce": [{ "learns": ["bounce"], "type": ["Fire"] }],
	"riftjump": [{ "learns": ["bounce"], "type": ["Electric"] }],
	"purify": [{ "fusion": ["pestri"] }],
	"mistyexplosion": [{ "fusion": ["furumo"] }],
	"heatwave": [{ "fusion": ["snowiibay"] }],
	"mindwipe": [{ "learns": ["haze"], "type": ["Psychic"] }],
	"surgingstrikes": [{ "fusion": ["crayzigater"] }],
	"infernalparade": [{ "fusion": ["calobera"], "type": ["Fire"] }],
	"accelerock": [{ "fusion": ["crenibex"] }],
	"chillyreception": [{ "fusion": ["heracrosssubarctic"], "learns": ["yawn"] }],
	"luminacrash": [{ "fusion": ["anneliark"] }],
	"esperwing": [{ "fusion": ["twinova"] }],
	"pollenpuff": [{ "fusion": ["butterfree", "celebi", "parasect", "parashukado", "vileplume", "breloom"] }],
	"lunge": [{ "fusion": ["spinarak", "ariados", "joltik", "galvantula", "venomoth", "volcarona", "pinsir", "parasect", "parashukado", "ledian", "doduo", "dodrio", "stantler"] }],
	"powder": [{ "fusion": ["butterfree", "venomoth", "volcarona", "parasect", "parashukado", "breloom"] }],
	"strengthsap": [{ "fusion": ["sweepdol", "oddish", "gloom", "vileplume", "bellossom", "hoppip", "skiploom", "jumpluff", "bellsprout", "weepinbell", "victreebel", "paras", "parasect", "parashukado", "drifblim", "breloom"] }],
	"ruination": [{ "fusion": ["catastropede"] }],
	"clangoroussoul": [{ "fusion": ["hydroupa"] }],
	"earthpower": [{ "fusion": ["magnegauss"] }],
	"spudmortar": [{ "learns": ["energyball"], "type": ["Electric", "Ground"] }],
	"phantasmalgust": [{ "learns": ["hurricane"], "type": ["Ghost"] }],
	"venomousroar": [{ "learns": ["roar"], "type": ["Poison"] }],
	"severingwind": [{ "learns": ["slash"], "type": ["Flying"] }],
	"healorder": [{ "fusion": ["nestitan", "beedrill"], "type": ["Bug"] }],
	"topsyturvy": [{ "fusion": ["pandiz", "hitmontop", "wobbuffet"] }],
	"pixietrick": [{ "type": ["Dark", "Fairy"] }],
	"magmastorm": [{ "fusion": ["saturoceras", "magcargo", "typhlosion", "magmortar", "magmar", "entei", "groudon"] }, { "learns": ["eruption"] }],
	"pheroblast": [{ "type": ["Bug"] }],
	"meltdown": [{ "learns": ["explosion", "selfdestruct"], "type": ["Fire"] }],
	"throwingknives": [{ "learns": ["rockblast", "bulletseed"], "type": ["Steel"] }],
	"shockbombs": [{ "learns": ["rockblast", "bulletseed"], "type": ["Electric"] }],
	"boulderbash": [{ "learns": ["doublehit"], "type": ["Rock"] }],
	"heavycleave": [{ "learns": ["cut"], "type": ["Steel"] }],
	"cometstrike": [{ "type": ["Rock"] }],
	"spiritsiphon": [{ "learns": ["gigadrain", "drainingkiss"], "type": ["Ghost"] }],
	"ceaselessedge": [{ "fusion": ["cloudinyte"] }],
	"skypierce": [{ "learns": ["sacredsword"], "type": ["Flying"] }],
	"wringout": [{ "fusion": ["sauphozoa"], "learns": ["coil"] }],
};
