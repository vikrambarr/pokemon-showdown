import { Utils } from '../../../lib';
import { Abilities } from '../champions/abilities';
import { Conditions } from '../champions/conditions';
import { Items } from '../champions/items';
import { Moves } from '../champions/moves';
import { Scripts as Champions } from '../champions/scripts';

export const Scripts: ModdedBattleScriptsData = {
	...Champions,
	inherit: 'gen9mariomon',
	init() {
		const tables: { [table: string]: AnyObject } = { Moves, Abilities, Items, Conditions };
		for (const table in tables) {
			const data: AnyObject = this.data[table as 'Moves'];
			for (const id in tables[table]) {
				const { inherit, isNonstandard, ...entry } = Utils.deepClone(tables[table][id]);
				if (entry.condition?.inherit) {
					delete entry.condition.inherit;
					entry.condition = { ...data[id].condition, ...entry.condition };
				}
				data[id] = inherit ? { ...data[id], ...entry } : entry;
			}
		}
		Champions.init!.call(this);
		for (const id in this.data.Pokedex) {
			let prevo = this.data.Pokedex[id].prevo;
			if (!prevo || !this.data.Learnsets[id]?.learnset) continue;
			const learnset = this.modData('Learnsets', id).learnset;
			while (prevo) {
				const prevoid = this.toID(prevo);
				for (const [moveid, sources] of Object.entries(this.data.Learnsets[prevoid]?.learnset || {})) {
					learnset[moveid] ||= sources;
				}
				prevo = this.data.Pokedex[prevoid]?.prevo;
			}
		}
	},
	pokemon: {
		...Champions.pokemon,
		inherit: true,
	},
	actions: {
		...Champions.actions,
		inherit: true,
		modifyDamage(baseDamage, pokemon, target, move, suppressMessages) {
			const tr = this.battle.trunc;
			if (!move.type) move.type = '???';
			const type = move.type;

			baseDamage += 2;

			if (move.spreadHit) {
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
				if (!suppressMessages) this.battle.add('-supereffective', target, Math.min(typeMod, 2));

				for (let i = 0; i < typeMod; i++) {
					baseDamage *= 2;
				}
			}
			if (typeMod < 0) {
				if (!suppressMessages) this.battle.add('-resisted', target, Math.min(-typeMod, 2));

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

			if (pokemon.status === 'frb' && move.category === 'Special') {
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
