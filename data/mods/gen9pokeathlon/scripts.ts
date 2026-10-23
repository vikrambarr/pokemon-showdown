import { Pokemon } from '../../../sim/pokemon';
import { Rulesets } from '../../pokeathlon-rulesets';
import { Abilities } from '../gen9insurgence/abilities';
import { Moves } from '../gen9insurgence/moves';

export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',
	init() {
		Object.assign(this.data.Rulesets, Rulesets);
		Object.assign(this.data.Abilities, {
			etherealshroud: Abilities.etherealshroud, phototroph: Abilities.phototroph, vampiric: Abilities.vampiric,
			vaporization: Abilities.vaporization,
		});
		Object.assign(this.data.Moves, {
			achillesheel: Moves.achillesheel, jetstream: Moves.jetstream, lunarcannon: Moves.lunarcannon,
			permafrost: Moves.permafrost, wildfire: Moves.wildfire,
		});
	},
	actions: {
		hitStepAccuracy(targets, pokemon, move) {
			const hitResults = [];
			for (const [i, target] of targets.entries()) {
				this.battle.activeTarget = target;
				let accuracy = move.accuracy;
				if (move.ohko) {
					if (!target.isSemiInvulnerable()) {
						accuracy = 30;
						if (move.ohko === 'Ice' && this.battle.gen >= 7 && !pokemon.hasType('Ice')) {
							accuracy = 20;
						}
						if (!target.volatiles['dynamax'] && pokemon.level >= target.level &&
							(move.ohko === true || !target.hasType(move.ohko))) {
							accuracy += (pokemon.level - target.level);
						} else {
							this.battle.add('-immune', target, '[ohko]');
							hitResults[i] = false;
							continue;
						}
					}
				} else {
					accuracy = this.battle.runEvent('ModifyAccuracy', target, pokemon, move, accuracy);
					if (accuracy !== true) {
						let boost = 0;
						if (!move.ignoreAccuracy) {
							const boosts = this.battle.runEvent('ModifyBoost', pokemon, null, null, { ...pokemon.boosts });
							boost = this.battle.clampIntRange(boosts['accuracy'], -6, 6);
						}
						if (!move.ignoreEvasion) {
							const boosts = this.battle.runEvent('ModifyBoost', target, null, null, { ...target.boosts });
							boost = this.battle.clampIntRange(boost - boosts['evasion'], -6, 6);
						}
						if (boost > 0) {
							accuracy = this.battle.trunc(accuracy * (3 + boost) / 3);
						} else if (boost < 0) {
							accuracy = this.battle.trunc(accuracy * 3 / (3 - boost));
						}
					}
				}
				if (
					move.alwaysHit || (move.id === 'toxic' && this.battle.gen >= 8 && pokemon.hasType('Poison')) ||
					(move.target === 'self' && move.category === 'Status' && !target.isSemiInvulnerable())
				) {
					accuracy = true;
				} else {
					accuracy = this.battle.runEvent('Accuracy', target, pokemon, move, accuracy);
				}
				if (accuracy !== true && !this.battle.randomChance(accuracy, 100)) {
					if (move.smartTarget) {
						move.smartTarget = false;
					} else {
						if (!move.spreadHit) this.battle.attrLastMove('[miss]');
						this.battle.add('-miss', pokemon, target);
					}
					if (!move.ohko && pokemon.hasItem('blunderpolicy') && pokemon.useItem()) {
						this.battle.boost({ spe: 2 }, pokemon);
					}
					if (!move.ohko && move.category !== 'Status' && pokemon.hasItem('doubledip') && pokemon.useItem()) {
						move.accuracy = true;
						this.battle.actions.useMove(move, pokemon);
					}
					if (!move.ohko && pokemon.hasAbility('pixelperfect')) {
						this.battle.boost({ accuracy: 1 }, pokemon);
					}
					hitResults[i] = false;
					continue;
				}
				hitResults[i] = true;
			}
			return hitResults;
		},
		switchIn(pokemon, pos, sourceEffect = null, isDrag) {
			if (!pokemon || pokemon.isActive) {
				this.battle.hint("A switch failed because the Pokémon trying to switch in is already in.");
				return false;
			}

			const side = pokemon.side;
			if (pos >= side.active.length) {
				throw new Error(`Invalid switch position ${pos} / ${side.active.length}`);
			}
			const oldActive = side.active[pos];
			const unfaintedActive = oldActive?.hp ? oldActive : null;
			if (unfaintedActive) {
				oldActive.beingCalledBack = true;
				let switchCopyFlag: 'copyvolatile' | 'shedtail' | boolean = false;
				if (sourceEffect && typeof (sourceEffect as Move).selfSwitch === 'string') {
					switchCopyFlag = (sourceEffect as Move).selfSwitch!;
				}
				if (!isDrag) {
					this.runPursuitActivation(oldActive);
				}
				if (oldActive.getVolatile('preventswitch')) {
					oldActive.removeVolatile('preventswitch');
					return false;
				}
				if (!this.battle.runEvent('SwitchOut', oldActive)) {
					return false;
				}
				if (!oldActive.hp) {
					if (this.battle.gen >= 5) {
						this.battle.hint("A Pokemon can't switch between when it runs out of HP and when it faints");
						return false;
					}
					this.battle.hint("Previously chosen switches continue in Gen 2-4 after a Pursuit target faints.");
				} else {
					this.battle.singleEvent('End', oldActive.getAbility(), oldActive.abilityState, oldActive);
					this.battle.singleEvent('End', oldActive.getItem(), oldActive.itemState, oldActive);

					this.battle.queue.cancelAction(oldActive);

					let newMove = null;
					if (this.battle.gen === 4 && sourceEffect) {
						newMove = oldActive.lastMove;
					}
					if (switchCopyFlag) {
						pokemon.copyVolatileFrom(oldActive, switchCopyFlag);
					}
					if (newMove) pokemon.lastMove = newMove;
					oldActive.clearVolatile();
				}
			}
			if (oldActive) {
				oldActive.isActive = false;
				oldActive.isStarted = false;
				oldActive.usedItemThisTurn = false;
				oldActive.statsRaisedThisTurn = false;
				oldActive.statsLoweredThisTurn = false;
				oldActive.pursuitActivated = false;
				oldActive.skipPursuit = false;
				oldActive.position = pokemon.position;
				if (oldActive.fainted) oldActive.status = '';
				if (this.battle.gen <= 4) {
					pokemon.lastItem = oldActive.lastItem;
					oldActive.lastItem = '';
				}
				pokemon.position = pos;
				side.pokemon[pokemon.position] = pokemon;
				side.pokemon[oldActive.position] = oldActive;
			}
			pokemon.isActive = true;
			side.active[pos] = pokemon;
			pokemon.activeTurns = 0;
			pokemon.activeMoveActions = 0;
			for (const moveSlot of pokemon.moveSlots) {
				moveSlot.used = false;
			}
			if (this.battle.gen <= 4) {
				if (pokemon.itemKnockedOff && pokemon.item) {
					this.battle.hint("In Gens 3-4, Knock Off makes a Pokémon lose its held item every time it switches in.");
					pokemon.item = '';
				}
				if (this.battle.gen <= 2) {
					for (const poke of this.battle.getAllActive()) poke.lastMove = null;
					if (this.battle.gen === 1) {
						pokemon.side.lastSelectedMoveSlot = 0;
						for (const poke of pokemon.foes()) {
							if (poke.volatiles['partialtrappinglock'] && poke.moveSlots[poke.side.lastSelectedMoveSlot].id === 'metronome') {
								poke.side.lastSelectedMove = 'metronome' as ID;
								poke.side.lastEnemySelectedMove = 'metronome' as ID;
								if (this.battle.queue.willMove(poke)) {
									this.battle.queue.changeAction(poke, { choice: 'move', poke, moveid: 'metronome' });
								}
							}
						}
					}
				}
			}
			pokemon.abilityState = this.battle.initEffectState({ id: pokemon.ability, target: pokemon });
			pokemon.itemState = this.battle.initEffectState({ id: pokemon.item, target: pokemon });
			this.battle.runEvent('BeforeSwitchIn', pokemon);
			if (sourceEffect) {
				this.battle.add(isDrag ? 'drag' : 'switch', pokemon, pokemon.getFullDetails, `[from] ${sourceEffect}`);
			} else {
				this.battle.add(isDrag ? 'drag' : 'switch', pokemon, pokemon.getFullDetails);
			}
			pokemon.previouslySwitchedIn++;

			if (this.battle.gen <= 4) {
				this.battle.runEvent('EntryHazard', pokemon);
				if (this.battle.gen <= 2 && !pokemon.side.faintedThisTurn && !isDrag) {
					this.battle.runEvent('AfterSwitchInSelf', pokemon);
				}
				if (!pokemon.hp) return false;
				if (this.battle.gen === 3 && this.battle.turn > 0) {
					this.battle.runEvent('AfterEntryHazard', pokemon);
				}
			}

			if (isDrag) {
				this.runSwitch(pokemon);
			} else {
				this.battle.queue.insertChoice({ choice: 'runSwitch', pokemon });
			}

			if (pokemon.species.id === 'tenkibo') {
				const moveIndex = pokemon.baseMoves.indexOf('starlightblast' as ID);
				if (moveIndex >= 0) {
					const move = this.battle.dex.moves.get('starlightcalling');
					pokemon.baseMoveSlots[moveIndex] = {
						move: move.name,
						id: move.id,
						pp: pokemon.baseMoveSlots[moveIndex].pp,
						maxpp: move.noPPBoosts ? move.pp : move.pp * 8 / 5,
						target: move.target,
						disabled: false,
						disabledSource: '',
						used: false,
					};
					pokemon.moveSlots = pokemon.baseMoveSlots.slice();
				}
			}

			return !!pokemon.hp;
		},
	},
	pokemon: {
		formeChange(speciesId, source, isPermanent, abilitySlot, message) {
			if (!Pokemon.prototype.formeChange.call(this, speciesId, source, isPermanent, abilitySlot, message)) return false;
			if (this.species.id === 'tenkibomagicalhero') {
				const moveIndex = this.baseMoves.indexOf('starlightcalling' as ID);
				if (moveIndex >= 0) {
					const move = this.battle.dex.moves.get('starlightblast');
					this.baseMoveSlots[moveIndex] = {
						move: move.name,
						id: move.id,
						pp: this.baseMoveSlots[moveIndex].pp,
						maxpp: move.noPPBoosts ? move.pp : move.pp * 8 / 5,
						target: move.target,
						disabled: false,
						disabledSource: '',
						used: false,
					};
					this.moveSlots = this.baseMoveSlots.slice();
				}
			}
			return true;
		},
		disableMove(moveid, isHidden, sourceEffect) {
			if (this.battle.toID(moveid) === 'ringtrue') return;
			Pokemon.prototype.disableMove.call(this, moveid, isHidden, sourceEffect);
		},
		isGrounded(negateImmunity) {
			if ('groundingstomp' in this.volatiles) return true;
			return Pokemon.prototype.isGrounded.call(this, negateImmunity);
		},
	},
};
