import { changeHalf, family, learnsNaturally, naturallyHas, speciesHalf } from '../sim/fusions';

interface FusionTables {
	Abilities?: import('../sim/dex-abilities').ModdedAbilityDataTable;
	Items?: import('../sim/dex-items').ModdedItemDataTable;
	Moves?: import('../sim/dex-moves').ModdedMoveDataTable;
	Conditions?: import('../sim/dex-conditions').ModdedConditionDataTable;
}

const WEATHER_TYPES: { [weather: string]: string } = {
	sunnyday: 'Fire', desolateland: 'Fire', raindance: 'Water', primordialsea: 'Water',
	hail: 'Ice', snowscape: 'Ice', sandstorm: 'Rock', newmoon: 'Dark',
};

export const Fusions: { [gen: number]: FusionTables } = {
	9: {
		Abilities: {
			battlebond: {
				inherit: true,
				onSourceAfterFaint(length, target, source, effect) {
					if (source.bondTriggered) return;
					if (effect?.effectType !== 'Move') return;
					if (family(source, 'requiredAbility', 'Battle Bond', half => !half.inForme) && source.hp && !source.transformed &&
						source.side.foePokemonLeft()) {
						this.boost({ atk: 1, spa: 1, spe: 1 }, source, source, this.effect);
						this.add('-activate', source, 'ability: Battle Bond');
						source.bondTriggered = true;
					}
				},
				onModifyMove(move, attacker) {
					if (move.id === 'watershuriken' && family(attacker, 'requiredAbility', 'Battle Bond', half => half.inForme) &&
						!attacker.transformed) {
						move.multihit = 3;
					}
				},
			},
			commander: {
				inherit: true,
				onUpdate(pokemon) {
					if (this.gameType !== 'doubles') return;
					if (this.queue.peek()?.choice === 'runSwitch') return;

					const ally = pokemon.allies()[0];
					if (pokemon.switchFlag || ally?.switchFlag) return;
					if (!ally || !naturallyHas(pokemon, 'Commander') || !speciesHalf(ally, species => species.baseSpecies === 'Dondozo')) {
						if (pokemon.getVolatile('commanding')) pokemon.removeVolatile('commanding');
						return;
					}

					if (!pokemon.getVolatile('commanding')) {
						if (ally.getVolatile('commanded')) return;
						this.queue.cancelAction(pokemon);
						this.add('-activate', pokemon, 'ability: Commander', `[of] ${ally}`);
						pokemon.addVolatile('commanding');
						ally.addVolatile('commanded', pokemon);
					} else {
						if (!ally.fainted) return;
						pokemon.removeVolatile('commanding');
					}
				},
			},
			disguise: {
				inherit: true,
				onDamage(damage, target, source, effect) {
					if (effect?.effectType === 'Move' && family(target, 'requiredAbility', 'Disguise', half => !half.inForme)) {
						this.add('-activate', target, 'ability: Disguise');
						this.effectState.busted = true;
						return 0;
					}
				},
				onCriticalHit(target, source, move) {
					if (!target) return;
					if (!family(target, 'requiredAbility', 'Disguise', half => !half.inForme)) {
						return;
					}
					const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
					if (hitSub) return;

					if (!target.runImmunity(move)) return;
					return false;
				},
				onEffectiveness(typeMod, target, type, move) {
					if (!target || move.category === 'Status') return;
					if (!family(target, 'requiredAbility', 'Disguise', half => !half.inForme)) {
						return;
					}

					const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
					if (hitSub) return;

					if (!target.runImmunity(move)) return;
					return 0;
				},
				onUpdate(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Disguise', disguised => !disguised.inForme);
					if (half && this.effectState.busted) {
						changeHalf(pokemon, half.body, half.formes[0], this.effect, true);
						this.damage(pokemon.baseMaxhp / 8, pokemon, pokemon, half.formes[0]);
					}
				},
			},
			flowergift: {
				inherit: true,
				onWeatherChange(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Flower Gift');
					if (!pokemon.isActive || !half || pokemon.transformed) return;
					if (!pokemon.hp) return;
					if (['sunnyday', 'desolateland'].includes(pokemon.effectiveWeather())) {
						if (!half.inForme) {
							changeHalf(pokemon, half.body, half.formes[0], this.effect, false, '0', '[msg]');
						}
					} else {
						if (half.inForme) {
							changeHalf(pokemon, half.body, half.base, this.effect, false, '0', '[msg]');
						}
					}
				},
				onAllyModifyAtk(atk, pokemon) {
					if (!naturallyHas(this.effectState.target, 'Flower Gift')) return;
					if (['sunnyday', 'desolateland'].includes(pokemon.effectiveWeather())) {
						return this.chainModify(1.5);
					}
				},
				onAllyModifySpD(spd, pokemon) {
					if (!naturallyHas(this.effectState.target, 'Flower Gift')) return;
					if (['sunnyday', 'desolateland'].includes(pokemon.effectiveWeather())) {
						return this.chainModify(1.5);
					}
				},
			},
			forecast: {
				inherit: true,
				onWeatherChange(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Forecast');
					if (!half || pokemon.transformed) return;
					const weather = pokemon.effectiveWeather();
					const exceptions = this.dex.data.Scripts.forecastFormes || {};
					const forme = half.formes.find(other => exceptions[other.id]?.includes(weather)) ||
						half.formes.find(other => !exceptions[other.id] && other.types[0] === WEATHER_TYPES[weather]);
					const target = forme ? forme.name : half.base;
					if (pokemon.isActive && half.species.name !== target) {
						changeHalf(pokemon, half.body, target, this.effect, false, '0', '[msg]');
					}
				},
			},
			gulpmissile: {
				inherit: true,
				onDamagingHit(damage, target, source, move) {
					if (!source.hp || !source.isActive || target.isSemiInvulnerable()) return;
					const half = speciesHalf(target, species => ['cramorantgulping', 'cramorantgorging'].includes(species.id));
					if (half) {
						this.damage(source.baseMaxhp / 4, source, target);
						if (half.species.id === 'cramorantgulping') {
							this.boost({ def: -1 }, source, target, null, true);
						} else {
							source.trySetStatus('par', target, move);
						}
						changeHalf(target, half.body, 'cramorant', move);
					}
				},
				onSourceTryPrimaryHit(target, source, effect) {
					const half = speciesHalf(source, species => species.name === 'Cramorant');
					if (effect?.id === 'surf' && source.hasAbility('gulpmissile') && half) {
						const forme = source.hp <= source.maxhp / 2 ? 'cramorantgorging' : 'cramorantgulping';
						changeHalf(source, half.body, forme, effect);
					}
				},
			},
			hungerswitch: {
				inherit: true,
				onResidual(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Hunger Switch');
					if (!half || pokemon.terastallized) return;
					const targetForme = half.inForme ? half.base : half.formes[0].name;
					changeHalf(pokemon, half.body, targetForme);
				},
			},
			iceface: {
				inherit: true,
				onStart(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Ice Face', busted => busted.inForme);
					if (this.field.isWeather(['hail', 'snowscape']) && half) {
						this.add('-activate', pokemon, 'ability: Ice Face');
						this.effectState.busted = false;
						changeHalf(pokemon, half.body, half.base, this.effect, true);
					}
				},
				onDamage(damage, target, source, effect) {
					if (effect?.effectType === 'Move' && effect.category === 'Physical' &&
						family(target, 'requiredAbility', 'Ice Face', half => !half.inForme)) {
						this.add('-activate', target, 'ability: Ice Face');
						this.effectState.busted = true;
						return 0;
					}
				},
				onCriticalHit(target, type, move) {
					if (!target) return;
					if (move.category !== 'Physical' || !family(target, 'requiredAbility', 'Ice Face', half => !half.inForme)) return;
					if (target.volatiles['substitute'] && !(move.flags['bypasssub'] || move.infiltrates)) return;
					if (!target.runImmunity(move)) return;
					return false;
				},
				onEffectiveness(typeMod, target, type, move) {
					if (!target) return;
					if (move.category !== 'Physical' || !family(target, 'requiredAbility', 'Ice Face', half => !half.inForme)) return;

					const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
					if (hitSub) return;

					if (!target.runImmunity(move)) return;
					return 0;
				},
				onUpdate(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Ice Face', face => !face.inForme);
					if (half && this.effectState.busted) {
						changeHalf(pokemon, half.body, half.formes[0], this.effect, true);
					}
				},
				onWeatherChange(pokemon, source, sourceEffect) {
					if ((sourceEffect as Ability)?.suppressWeather) return;
					if (!pokemon.hp) return;
					const half = family(pokemon, 'requiredAbility', 'Ice Face', busted => busted.inForme);
					if (this.field.isWeather(['hail', 'snowscape']) && half) {
						this.add('-activate', pokemon, 'ability: Ice Face');
						this.effectState.busted = false;
						changeHalf(pokemon, half.body, half.base, this.effect, true);
					}
				},
			},
			poisonpuppeteer: {
				inherit: true,
				onAnyAfterSetStatus(status, target, source, effect) {
					if (!naturallyHas(source, 'Poison Puppeteer')) return;
					if (source !== this.effectState.target || target === source || effect.effectType !== 'Move') return;
					if (status.id === 'psn' || status.id === 'tox') {
						target.addVolatile('confusion');
					}
				},
			},
			powerconstruct: {
				inherit: true,
				onResidual(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Power Construct');
					if (!half || pokemon.transformed || !pokemon.hp) return;
					if (half.inForme || pokemon.hp > pokemon.maxhp / 2) return;
					this.add('-activate', pokemon, 'ability: Power Construct');
					changeHalf(pokemon, half.body, half.formes[0], this.effect, true);
					if (!half.body) {
						pokemon.canMegaEvo = pokemon.canMegaEvo === false ? false : this.actions.canMegaEvo(pokemon);
						pokemon.formeRegression = true;
					}
					pokemon.updateMaxHp();
				},
			},
			schooling: {
				inherit: true,
				onStart(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Schooling');
					if (!half || pokemon.level < 20 || pokemon.transformed) return;
					if (pokemon.hp > pokemon.maxhp / 4) {
						if (!half.inForme) {
							changeHalf(pokemon, half.body, half.formes[0]);
						}
					} else {
						if (half.inForme) {
							changeHalf(pokemon, half.body, half.base);
						}
					}
				},
				onResidual(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Schooling');
					if (!half || pokemon.level < 20 || pokemon.transformed || !pokemon.hp) return;
					if (pokemon.hp > pokemon.maxhp / 4) {
						if (!half.inForme) {
							changeHalf(pokemon, half.body, half.formes[0]);
						}
					} else {
						if (half.inForme) {
							changeHalf(pokemon, half.body, half.base);
						}
					}
				},
			},
			shieldsdown: {
				inherit: true,
				onStart(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Shields Down');
					if (!half || pokemon.transformed) return;
					if (pokemon.hp > pokemon.maxhp / 2) {
						if (!half.inForme) {
							changeHalf(pokemon, half.body, half.formes[0]);
						}
					} else {
						if (half.inForme) {
							changeHalf(pokemon, half.body, half.body ? pokemon.m.fusionBase || half.base : pokemon.set.species);
						}
					}
				},
				onResidual(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Shields Down');
					if (!half || pokemon.transformed || !pokemon.hp) return;
					if (pokemon.hp > pokemon.maxhp / 2) {
						if (!half.inForme) {
							changeHalf(pokemon, half.body, half.formes[0]);
						}
					} else {
						if (half.inForme) {
							changeHalf(pokemon, half.body, half.body ? pokemon.m.fusionBase || half.base : pokemon.set.species);
						}
					}
				},
				onSetStatus(status, target, source, effect) {
					if (!family(target, 'requiredAbility', 'Shields Down', half => half.inForme) || target.transformed) return;
					if ((effect as Move)?.status) {
						this.add('-immune', target, '[from] ability: Shields Down');
					}
					return false;
				},
				onTryAddVolatile(status, target) {
					if (!family(target, 'requiredAbility', 'Shields Down', half => half.inForme) || target.transformed) return;
					if (status.id !== 'yawn') return;
					this.add('-immune', target, '[from] ability: Shields Down');
					return null;
				},
			},
			stancechange: {
				inherit: true,
				onBeforeSwitchIn() {
					this.effectState.forme = 'shield';
				},
				onModifyMove(move, attacker, defender) {
					if (attacker.m.fusion) {
						if (attacker.transformed) return;
						if (move.category === 'Status' && (!move.stallingMove || ['endure', 'allyswitch'].includes(move.id))) return;
						const targetForme = move.category !== 'Status' ? 'blade' : 'shield';
						if ((this.effectState.forme || 'shield') === targetForme) return;
						this.add('-activate', attacker, 'ability: Stance Change');
						this.add('-message', `${attacker.name} entered its ${targetForme} stance.`);
						const stats = attacker.storedStats;
						[stats.atk, stats.def, stats.spa, stats.spd] = [stats.def, stats.atk, stats.spd, stats.spa];
						this.effectState.forme = targetForme;
						return;
					}
					const half = family(attacker, 'requiredAbility', 'Stance Change');
					if (!half || attacker.transformed) return;
					if (move.category === 'Status' && move.id !== 'kingsshield') return;
					const targetForme = (move.id === 'kingsshield' ? half.base : half.formes[0].name);
					if (attacker.species.name !== targetForme) attacker.formeChange(targetForme);
				},
			},
			terashift: {
				inherit: true,
				onSwitchIn(pokemon) {
					const half = speciesHalf(pokemon, species => species.baseSpecies === 'Terapagos');
					if (!half) return;
					if (half.species.forme !== 'Terastal') {
						this.add('-activate', pokemon, 'ability: Tera Shift');
						changeHalf(pokemon, half.body, 'Terapagos-Terastal', this.effect, true);
					}
				},
			},
			zenmode: {
				inherit: true,
				onResidual(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Zen Mode');
					if (!half || pokemon.transformed) {
						return;
					}
					if (pokemon.hp <= pokemon.maxhp / 2 && !half.inForme) {
						pokemon.addVolatile('zenmode');
					} else if (pokemon.hp > pokemon.maxhp / 2 && half.inForme) {
						pokemon.addVolatile('zenmode');
						pokemon.removeVolatile('zenmode');
					}
				},
				onEnd(pokemon) {
					if (!pokemon.volatiles['zenmode'] || !pokemon.hp) return;
					pokemon.transformed = false;
					delete pokemon.volatiles['zenmode'];
					const half = family(pokemon, 'requiredAbility', 'Zen Mode', zen => zen.inForme);
					if (half) {
						changeHalf(pokemon, half.body, half.base, this.effect, false, '0', '[silent]');
					}
				},
				condition: {
					onStart(pokemon) {
						const half = family(pokemon, 'requiredAbility', 'Zen Mode');
						if (half && !half.inForme) changeHalf(pokemon, half.body, half.formes[0]);
					},
					onEnd(pokemon) {
						const half = family(pokemon, 'requiredAbility', 'Zen Mode', zen => zen.inForme);
						if (half) changeHalf(pokemon, half.body, half.base);
					},
				},
			},
			zerotohero: {
				inherit: true,
				onSwitchOut(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Zero to Hero');
					if (!half) return;
					if (!half.inForme) {
						changeHalf(pokemon, half.body, half.formes[0], this.effect, true);
						pokemon.heroMessageDisplayed = false;
					}
				},
				onSwitchIn(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Zero to Hero');
					if (!half) return;
					if (!pokemon.heroMessageDisplayed && half.inForme) {
						this.add('-activate', pokemon, 'ability: Zero to Hero');
						pokemon.heroMessageDisplayed = true;
					}
				},
			},
		},
		Items: {
			blueorb: {
				inherit: true,
				onSwitchIn(pokemon) {
					const half = family(pokemon, 'requiredItem', 'Blue Orb', primal => !primal.inForme);
					if (pokemon.isActive && half && !pokemon.transformed) {
						changeHalf(pokemon, half.body, half.formes[0], this.effect, true);
					}
				},
			},
			redorb: {
				inherit: true,
				onSwitchIn(pokemon) {
					const half = family(pokemon, 'requiredItem', 'Red Orb', primal => !primal.inForme);
					if (pokemon.isActive && half && !pokemon.transformed) {
						changeHalf(pokemon, half.body, half.formes[0], this.effect, true);
					}
				},
			},
		},
		Moves: {
			aurawheel: {
				inherit: true,
				onTry(source) {
					if (speciesHalf(source, species => species.baseSpecies === 'Morpeko')) {
						return;
					}
					this.attrLastMove('[still]');
					this.add('-fail', source, 'move: Aura Wheel');
					this.hint("Only a Pokemon whose form is Morpeko or Morpeko-Hangry can use this move.");
					return null;
				},
				onModifyType(move, pokemon) {
					if (speciesHalf(pokemon, species => species.name === 'Morpeko-Hangry')) {
						move.type = 'Dark';
					} else {
						move.type = 'Electric';
					}
				},
			},
			darkvoid: {
				inherit: true,
				onTry(source, target, move) {
					if (learnsNaturally(source, 'darkvoid') || move.hasBounced) {
						return;
					}
					this.add('-fail', source, 'move: Dark Void');
					this.hint("Only a Pokemon whose form is Darkrai can use this move.");
					return null;
				},
			},
			dive: {
				inherit: true,
				onTryMove(attacker, defender, move) {
					if (attacker.removeVolatile(move.id)) {
						return;
					}
					const half = speciesHalf(attacker, species => species.name === 'Cramorant');
					if (attacker.hasAbility('gulpmissile') && half && !attacker.transformed) {
						const forme = attacker.hp <= attacker.maxhp / 2 ? 'cramorantgorging' : 'cramorantgulping';
						changeHalf(attacker, half.body, forme, move);
					}
					this.add('-prepare', attacker, move.name);
					if (!this.runEvent('ChargeMove', attacker, defender, move)) {
						return;
					}
					attacker.addVolatile('twoturnmove', defender);
					return null;
				},
			},
			hyperspacefury: {
				inherit: true,
				onTry(source) {
					if (speciesHalf(source, species => species.name === 'Hoopa-Unbound')) {
						return;
					}
					this.hint("Only a Pokemon whose form is Hoopa Unbound can use this move.");
					if (speciesHalf(source, species => species.name === 'Hoopa')) {
						this.attrLastMove('[still]');
						this.add('-fail', source, 'move: Hyperspace Fury', '[forme]');
						return null;
					}
					this.attrLastMove('[still]');
					this.add('-fail', source, 'move: Hyperspace Fury');
					return null;
				},
			},
			ivycudgel: {
				inherit: true,
				onModifyType(move, pokemon) {
					switch (speciesHalf(pokemon, species => species.baseSpecies === 'Ogerpon')?.species.name) {
					case 'Ogerpon-Wellspring': case 'Ogerpon-Wellspring-Tera':
						move.type = 'Water';
						break;
					case 'Ogerpon-Hearthflame': case 'Ogerpon-Hearthflame-Tera':
						move.type = 'Fire';
						break;
					case 'Ogerpon-Cornerstone': case 'Ogerpon-Cornerstone-Tera':
						move.type = 'Rock';
						break;
					}
				},
			},
			orderup: {
				inherit: true,
				onAfterMoveSecondarySelf(pokemon, target, move) {
					if (!pokemon.volatiles['commanded']) return;
					const tatsugiri = pokemon.volatiles['commanded'].source;
					const half = speciesHalf(tatsugiri, species => species.baseSpecies === 'Tatsugiri');
					if (!half) return;
					switch ((half.body ? half.species : tatsugiri.baseSpecies).forme) {
					case 'Droopy':
						this.boost({ def: 1 }, pokemon, pokemon);
						break;
					case 'Stretchy':
						this.boost({ spe: 1 }, pokemon, pokemon);
						break;
					default:
						this.boost({ atk: 1 }, pokemon, pokemon);
						break;
					}
				},
			},
			polarflare: {
				inherit: true,
				onAfterMoveSecondarySelf(pokemon) {
					const half = family(pokemon, 'requiredMove', 'Polar Flare');
					if (half && !pokemon.transformed) {
						changeHalf(pokemon, half.body, half.inForme ? half.base : half.formes[0].name, this.effect, false, '0', '[msg]');
					}
				},
			},
			ragingbull: {
				inherit: true,
				onModifyType(move, pokemon) {
					switch (speciesHalf(pokemon, species => species.name.startsWith('Tauros-Paldea-'))?.species.name) {
					case 'Tauros-Paldea-Combat':
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
			reflecttype: {
				inherit: true,
				onHit(target, source) {
					if (speciesHalf(source, species => species.num === 493 || species.num === 773)) return false;
					if (source.terastallized) return false;
					const oldApparentType = source.apparentType;
					let newBaseTypes = target.getTypes(true).filter(type => type !== '???');
					if (!newBaseTypes.length) {
						if (target.addedType) {
							newBaseTypes = ['Normal'];
						} else {
							return false;
						}
					}
					this.add('-start', source, 'typechange', '[from] move: Reflect Type', `[of] ${target}`);
					source.setType(newBaseTypes);
					source.addedType = target.addedType;
					source.knownType = target.isAlly(source) && target.knownType;
					if (!source.knownType) source.apparentType = oldApparentType;
				},
			},
			relicsong: {
				inherit: true,
				onAfterMoveSecondarySelf(pokemon) {
					const half = family(pokemon, 'requiredMove', 'Relic Song');
					if (half && !pokemon.transformed) {
						changeHalf(pokemon, half.body, half.inForme ? half.base : half.formes[0].name, this.effect, false, '0', '[msg]');
					}
				},
			},
			telekinesis: {
				inherit: true,
				condition: {
					onStart(target) {
						if (speciesHalf(target, species => ['Diglett', 'Dugtrio', 'Palossand', 'Sandygast'].includes(species.baseSpecies)) ||
							target.baseSpecies.name === 'Gengar-Mega') {
							this.add('-immune', target);
							return null;
						}
						if (target.volatiles['smackdown'] || target.volatiles['ingrain']) return false;
						this.add('-start', target, 'Telekinesis');
					},
				},
			},
			watershuriken: {
				inherit: true,
				basePowerCallback(pokemon, target, move) {
					if (speciesHalf(pokemon, species => species.name === 'Greninja-Ash') && pokemon.hasAbility('battlebond') &&
						!pokemon.transformed) {
						return move.basePower + 5;
					}
					return move.basePower;
				},
			},
		},
		Conditions: {
			arceus: {
				inherit: true,
				onType(types, pokemon) {
					if (pokemon.m.fusion || pokemon.transformed || pokemon.ability !== 'multitype' && this.gen >= 8) return types;
					let type: string | undefined = 'Normal';
					if (pokemon.ability === 'multitype') {
						type = pokemon.getItem().onPlate;
						if (!type) {
							type = 'Normal';
						}
					}
					return [type];
				},
			},
			frz: {
				inherit: true,
				onStart(target, source, sourceEffect) {
					if (sourceEffect?.effectType === 'Ability') {
						this.add('-status', target, 'frz', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
					} else {
						this.add('-status', target, 'frz');
					}
					const half = speciesHalf(target, species => species.name === 'Shaymin-Sky');
					if (half && (half.body || target.baseSpecies.baseSpecies === 'Shaymin')) {
						changeHalf(target, half.body, 'Shaymin', this.effect, true);
					}
				},
			},
			silvally: {
				inherit: true,
				onType(types, pokemon) {
					if (pokemon.m.fusion || pokemon.transformed || pokemon.ability !== 'rkssystem' && this.gen >= 8) return types;
					let type: string | undefined = 'Normal';
					if (pokemon.ability === 'rkssystem') {
						type = pokemon.getItem().onMemory;
						if (!type) {
							type = 'Normal';
						}
					}
					return [type];
				},
			},
		},
	},
	8: {
		Abilities: {
			battlebond: {
				inherit: true,
				onSourceAfterFaint(length, target, source, effect) {
					if (source.bondTriggered) return;
					if (effect?.effectType !== 'Move') {
						return;
					}
					const half = family(source, 'requiredAbility', 'Battle Bond', bond => !bond.inForme);
					if (half && source.hp && !source.transformed && source.side.foePokemonLeft()) {
						this.add('-activate', source, 'ability: Battle Bond');
						changeHalf(source, half.body, half.formes[0], this.effect, true);
						if (!half.body) source.formeRegression = true;
						source.bondTriggered = true;
					}
				},
			},
			disguise: {
				inherit: true,
				onUpdate(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Disguise', disguised => !disguised.inForme);
					if (half && this.effectState.busted) {
						changeHalf(pokemon, half.body, half.formes[0], this.effect, true);
						if (!half.body) pokemon.formeRegression = true;
						this.damage(pokemon.baseMaxhp / 8, pokemon, pokemon, half.formes[0]);
					}
				},
			},
		},
	},
	7: {
		Abilities: {
			disguise: {
				inherit: true,
				onDamage(damage, target, source, effect) {
					if (
						effect?.effectType === 'Move' &&
						family(target, 'requiredAbility', 'Disguise', half => !half.inForme) && !target.transformed
					) {
						if (["rollout", "iceball"].includes(effect.id)) {
							source.volatiles[effect.id].contactHitCount--;
						}

						this.add("-activate", target, "ability: Disguise");
						this.effectState.busted = true;
						return 0;
					}
				},
				onUpdate(pokemon) {
					const half = family(pokemon, 'requiredAbility', 'Disguise', disguised => !disguised.inForme);
					if (half && this.effectState.busted) {
						changeHalf(pokemon, half.body, half.formes[0], this.effect, true);
						if (!half.body) pokemon.formeRegression = true;
					}
				},
			},
		},
	},
	6: {
		Abilities: {
			stancechange: {
				inherit: true,
				onBeforeMove(attacker, defender, move) {
					if (attacker.m.fusion) {
						if (attacker.transformed) return;
						if (move.category === 'Status' && (!move.stallingMove || ['endure', 'allyswitch'].includes(move.id))) return;
						const targetForme = move.category !== 'Status' ? 'blade' : 'shield';
						if ((this.effectState.forme || 'shield') === targetForme) return;
						this.add('-activate', attacker, 'ability: Stance Change');
						this.add('-message', `${attacker.name} entered its ${targetForme} stance.`);
						const stats = attacker.storedStats;
						[stats.atk, stats.def, stats.spa, stats.spd] = [stats.def, stats.atk, stats.spd, stats.spa];
						this.effectState.forme = targetForme;
						return;
					}
					const half = family(attacker, 'requiredAbility', 'Stance Change');
					if (!half || attacker.transformed) return;
					if (move.category === 'Status' && move.id !== 'kingsshield') return;
					const targetForme = (move.id === 'kingsshield' ? half.base : half.formes[0].name);
					if (attacker.species.name !== targetForme) attacker.formeChange(targetForme);
				},
				onModifyMove: undefined,
			},
		},
		Moves: {
			darkvoid: {
				inherit: true,
				onTry: undefined,
			},
		},
	},
	4: {
		Abilities: {
			flowergift: {
				inherit: true,
				onAllyModifyAtk: undefined,
				onAllyModifySpD: undefined,
			},
		},
		Conditions: {
			arceus: {
				inherit: true,
				onType: undefined,
				onBeforeSwitchIn(pokemon) {
					if (pokemon.m.fusion) return;
					pokemon.setType('Normal');
				},
				onSwitchIn(pokemon) {
					if (pokemon.m.fusion || pokemon.ability !== 'multitype') return;
					const item = pokemon.getItem();
					const targetForme = (item?.onPlate ? 'Arceus-' + item.onPlate : 'Arceus');
					if (pokemon.species.name !== targetForme) {
						pokemon.formeChange(targetForme);
					}
				},
			},
		},
	},
	1: {
		Conditions: {
			frz: {
				inherit: true,
				onStart: undefined,
			},
		},
	},
};
