import { Rulesets } from '../../pokeathlon-rulesets';

export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',
	init() {
		Object.assign(this.data.Rulesets, Rulesets);
	},
	actions: {
		canMegaEvo(pokemon: Pokemon) {
			const species = pokemon.baseSpecies;
			const altForme = species.otherFormes && this.dex.species.get(species.otherFormes[0]);
			const item = pokemon.getItem();
			if ((this.battle.gen <= 7 || this.battle.ruleTable.has('+tag:past') ||
				this.battle.ruleTable.has('+tag:future')) &&
				altForme?.isMega && altForme?.requiredMove &&
				pokemon.baseMoves.includes(this.dex.toID(altForme.requiredMove)) && !item.zMove) {
				return altForme.name;
			}
			if (!item.megaStone) return null;
			if (species.id === 'sunflora' && pokemon.gender === 'F' && item.megaStone[species.name]) return 'Sunflora-Mega-F';
			if (item.megaStone[species.name]) return item.megaStone[species.name];
			const megaEvolution = typeof species.battleOnly === 'string' && item.megaStone[species.battleOnly];
			return megaEvolution && megaEvolution !== species.name ? megaEvolution : null;
		},
	},
	pokemon: {
		setStatus(
			status: string | Condition,
			source: Pokemon | null = null,
			sourceEffect: Effect | null = null,
			ignoreImmunities = false
		) {
			if (!this.hp) return false;
			status = this.battle.dex.conditions.get(status);
			if (this.battle.event) {
				if (!source) source = this.battle.event.source;
				if (!sourceEffect) sourceEffect = this.battle.effect;
			}
			if (!source) source = this;

			if (this.status === status.id) {
				if ((sourceEffect as Move)?.status === this.status) {
					this.battle.add('-fail', this, this.status);
				} else if ((sourceEffect as Move)?.status) {
					this.battle.add('-fail', source);
					this.battle.attrLastMove('[still]');
				}
				return false;
			}

			if (source?.hasAbility('venomous') && status.id === 'psn') status = this.battle.dex.conditions.get('tox');

			if (
				!ignoreImmunities && status.id && !(source?.hasAbility('corrosion') && ['tox', 'psn'].includes(status.id))
			) {
				if (!this.runStatusImmunity(status.id === 'tox' ? 'psn' : status.id)) {
					this.battle.debug('immune to status');
					if ((sourceEffect as Move)?.status) {
						this.battle.add('-immune', this);
					}
					return false;
				}
			}
			const prevStatus = this.status;
			const prevStatusState = this.statusState;
			if (status.id) {
				const result: boolean = this.battle.runEvent('SetStatus', this, source, sourceEffect, status);
				if (!result) {
					this.battle.debug('set status [' + status.id + '] interrupted');
					return result;
				}
			}

			this.status = status.id;
			this.statusState = this.battle.initEffectState({ id: status.id, target: this });
			if (source) this.statusState.source = source;
			if (status.duration) this.statusState.duration = status.duration;
			if (status.durationCallback) {
				this.statusState.duration = status.durationCallback.call(this.battle, this, source, sourceEffect);
			}

			if (status.id && !this.battle.singleEvent('Start', status, this.statusState, this, source, sourceEffect)) {
				this.battle.debug('status start [' + status.id + '] interrupted');
				this.status = prevStatus;
				this.statusState = prevStatusState;
				return false;
			}
			if (status.id && !this.battle.runEvent('AfterSetStatus', this, source, sourceEffect, status)) {
				return false;
			}
			return true;
		},
		formeChange(
			speciesId: string | Species, source?: Effect | null,
			isPermanent?: boolean, abilitySlot = '0', message?: string
		) {
			if (source === undefined) source = this.battle.effect;
			const rawSpecies = this.battle.dex.species.get(speciesId);

			const species = this.setSpecies(rawSpecies, source);
			if (!species) return false;

			if (this.battle.gen <= 2) return true;

			const apparentSpecies =
				this.illusion ? this.illusion.species.name : species.baseSpecies;
			if (isPermanent) {
				this.baseSpecies = rawSpecies;
				this.details = this.getUpdatedDetails();
				let details = (this.illusion || this).details;
				if (this.terastallized) details += `, tera:${this.terastallized}`;
				if (!this.illusion) this.battle.add('detailschange', this, details);
				if (!source) {
					this.formeRegression = true;
				} else if (source.effectType === 'Item') {
					this.canTerastallize = null;
					if (source.zMove) {
						this.battle.add('-burst', this, apparentSpecies, species.requiredItem);
						this.moveThisTurnResult = true;
					} else if (source.isPrimalOrb) {
						if (this.illusion) {
							this.ability = '';
							this.battle.add('-primal', this.illusion, species.requiredItem);
						} else {
							this.battle.add('-primal', this, species.requiredItem);
						}
					} else if (this.illusion) {
						const allowedItems = this.battle.dex.items.all()
							.filter(item => (!item.isNonstandard || ['Unobtainable', 'Past'].includes(item.isNonstandard)) && item.exists);
						let megaForme;
						for (const item of allowedItems) {
							const megaFormeName = item.megaStone?.[this.illusion.species.name];
							if (megaFormeName) megaForme = this.battle.dex.species.get(megaFormeName);
						}
						if (megaForme) {
							this.illusion.setSpecies(megaForme, source);
							this.battle.add('detailschange', this, this.illusion.getUpdatedDetails());
							this.battle.add('-mega', this, megaForme.name, megaForme.requiredItem);
							this.moveThisTurnResult = true;
						}
					} else {
						this.battle.add('-mega', this, apparentSpecies, species.requiredItem);
						this.moveThisTurnResult = true;
					}
					this.formeRegression = true;
				} else if (source.effectType === 'Status') {
					this.battle.add('-formechange', this, species.name, message);
				}
			} else {
				if (source?.effectType === 'Ability') {
					this.battle.add('-formechange', this, species.name, message, `[from] ability: ${source.name}`);
				} else {
					this.battle.add('-formechange', this, this.illusion ? this.illusion.species.name : species.name, message);
				}
			}
			if (isPermanent && (!source || !['disguise', 'iceface', 'proteanmaxima'].includes(source.id))) {
				if (this.illusion && source) {
					this.ability = '';
					this.addVolatile('ability:illusion');
				}
				const ability = species.abilities[abilitySlot] || species.abilities['0'];
				if (source || !this.getAbility().flags['cantsuppress']) this.setAbility(ability, null, null, true);
				this.baseAbility = this.battle.toID(ability);
			}
			if (this.terastallized) {
				this.knownType = true;
				this.apparentType = this.terastallized;
			}
			return true;
		},
		isGrounded(negateImmunity = false) {
			if ('gravity' in this.battle.field.pseudoWeather) return true;
			if ('ingrain' in this.volatiles && this.battle.gen >= 4) return true;
			if ('smackdown' in this.volatiles) return true;
			if ('groundingstomp' in this.volatiles) return true;
			const item = (this.ignoringItem() ? '' : this.item);
			if (item === 'ironball') return true;
			if (!negateImmunity && this.hasType('Flying') && !(this.hasType('???') && 'roost' in this.volatiles)) return false;
			if (this.hasAbility(['levitate', 'eelevate', 'omnitype']) && !this.battle.suppressingAbility(this)) return null;
			if ('magnetrise' in this.volatiles) return false;
			if ('telekinesis' in this.volatiles) return false;
			return item !== 'airballoon';
		},
	},
};
