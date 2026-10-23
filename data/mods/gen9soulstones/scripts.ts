import { Field } from '../../../sim/field';
import { Pokemon } from '../../../sim/pokemon';
import { Rulesets } from '../../pokeathlon-rulesets';

export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',
	init() {
		Object.assign(this.data.Rulesets, Rulesets);
	},
	field: {
		effectiveTerrain(this: Field, target) {
			for (const pokemon of this.battle.getAllActive()) {
				if (pokemon.hasAbility('cloudnine') && !pokemon.abilityState.ending) return '';
			}
			return Field.prototype.effectiveTerrain.call(this, target);
		},
	},
	pokemon: {
		isGrounded(negateImmunity) {
			if ('vanguard' in this.volatiles) return true;
			return Pokemon.prototype.isGrounded.call(this, negateImmunity);
		},
		setStatus(status, source, sourceEffect, ignoreImmunities) {
			if (this.battle.toID(status) === 'frz') status = 'frb';
			return Pokemon.prototype.setStatus.call(this, status, source, sourceEffect, ignoreImmunities);
		},
		runImmunity(source, message) {
			if (!source) return true;
			const type: string = typeof source !== 'string' ? source.type : source;
			if (typeof source !== 'string') {
				if (source.ignoreImmunity && (source.ignoreImmunity === true || source.ignoreImmunity[type])) {
					return true;
				}
			}
			if (!type || type === '???') return true;
			if (!this.battle.dex.types.isName(type)) {
				throw new Error("Use runStatusImmunity for " + type);
			}

			const negateImmunity = !this.battle.runEvent('NegateImmunity', this, type);
			const notImmune = type === 'Ground' && !this.hasType('Cosmic') ?
				this.isGrounded(negateImmunity) :
				negateImmunity || this.battle.dex.getImmunity(type, this);
			if (notImmune) return true;
			if (!message) return false;
			if (notImmune === null) {
				if (this.hasAbility('levitate')) {
					this.battle.add('-immune', this, '[from] ability: Levitate');
				} else if (this.hasAbility('eelevate')) {
					this.battle.add('-immune', this, '[from] ability: Eelevate');
				} else {
					this.battle.add('-immune', this);
				}
			} else {
				this.battle.add('-immune', this);
			}
			return false;
		},
	},
	actions: {
		modifyDamage(baseDamage, pokemon, target, move, suppressMessages) {
			const tr = this.battle.trunc;
			if (!move.type) move.type = '???';
			const type = move.type;

			baseDamage += 2;

			if (move.spreadHit && !pokemon.hasAbility('resonant')) {
				const spreadModifier = this.battle.gameType === 'freeforall' ? 0.5 : 0.75;
				this.battle.debug(`Spread modifier: ${spreadModifier}`);
				baseDamage = this.battle.modify(baseDamage, spreadModifier);
			} else if (move.multihitType === 'parentalbond' && move.hit > 1) {
				const bondModifier = this.battle.gen > 6 ? 0.25 : 0.5;
				this.battle.debug(`Parental Bond modifier: ${bondModifier}`);
				baseDamage = this.battle.modify(baseDamage, bondModifier);
			}

			baseDamage = this.battle.priorityEvent('WeatherModifyDamage', pokemon, target, move, baseDamage);

			const isCrit = target.getMoveHitData(move).crit;
			if (isCrit) {
				baseDamage = tr(baseDamage * (move.critModifier || (this.battle.gen >= 6 ? 1.5 : 2)));
			}

			baseDamage = this.battle.randomizer(baseDamage);

			if (type !== '???') {
				let stab: number | [number, number] = 1;

				const isSTAB = move.forceSTAB || pokemon.hasType(type) || pokemon.getTypes(false, true).includes(type);
				if (isSTAB) {
					stab = 1.5;
				}

				if (pokemon.terastallized === 'Stellar') {
					if (!pokemon.stellarBoostedTypes.includes(type) || move.stellarBoosted) {
						stab = isSTAB ? 2 : [4915, 4096];
						move.stellarBoosted = true;
						if (pokemon.species.name !== 'Terapagos-Stellar') {
							pokemon.stellarBoostedTypes.push(type);
						}
					}
				} else {
					if (pokemon.terastallized === type && pokemon.getTypes(false, true).includes(type)) {
						stab = 2;
					}
					stab = this.battle.runEvent('ModifySTAB', pokemon, target, move, stab);
				}

				baseDamage = this.battle.modify(baseDamage, stab);
			}

			let typeMod = target.runEffectiveness(move);
			typeMod = this.battle.clampIntRange(typeMod, -6, 6);
			target.getMoveHitData(move).typeMod = typeMod;
			if (typeMod > 0) {
				if (!suppressMessages) this.battle.add('-supereffective', target);

				for (let i = 0; i < typeMod; i++) {
					baseDamage *= 2;
				}
			}
			if (typeMod < 0) {
				if (!suppressMessages) this.battle.add('-resisted', target);

				for (let i = 0; i > typeMod; i--) {
					baseDamage = tr(baseDamage / 2);
				}
			}

			if (isCrit && !suppressMessages) this.battle.add('-crit', target);

			if (pokemon.status === 'brn' && move.category === 'Physical' && !pokemon.hasAbility('guts')) {
				if (this.battle.gen < 6 || move.id !== 'facade') {
					baseDamage = this.battle.modify(baseDamage, 0.5);
				}
			}

			if (pokemon.status === 'frb' && move.category === 'Special' && !pokemon.hasAbility('attunement')) {
				if (this.battle.gen < 6 || move.id !== 'facade') {
					baseDamage = this.battle.modify(baseDamage, 0.5);
				}
			}

			if (this.battle.gen === 5 && !baseDamage) baseDamage = 1;

			baseDamage = this.battle.runEvent('ModifyDamage', pokemon, target, move, baseDamage);

			const bypassProtect = target.getMoveHitData(move).bypassProtect;
			if (bypassProtect) {
				baseDamage = this.battle.modify(baseDamage, 0.25);
				if (bypassProtect !== true && bypassProtect.effectType === 'Ability') {
					this.battle.add('-ability', pokemon, bypassProtect.name);
				}
				this.battle.add('-zbroken', target);
			}

			if (this.battle.gen !== 5 && !baseDamage) return 1;

			return tr(baseDamage, 16);
		},
	},
};
