import { Scripts as Insurgence } from '../gen9insurgence/scripts';
import { Scripts as Mariomon } from '../gen9mariomon/scripts';
import { Scripts as Pokeathlon } from '../gen9pokeathlon/scripts';

const MODS = ['gen9pokeathlon', 'gen9insurgence', 'gen9uranium', 'gen9infinity', 'gen9mariomon', 'gen9infinitefusion'];
const EXCLUDED: { [mod: string]: { [table: string]: string[] } } = {
	gen9insurgence: { Abilities: ['illusion'] },
	gen9uranium: { Abilities: ['illusion'] },
	gen9infinity: { Moves: ['strength', 'cut', 'wildcharge', 'rocksmash', 'skydrop'] },
	gen9mariomon: { Conditions: ['frz'] },
};

export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9',
	init() {
		const base: AnyObject = this.mod('gen9').data;
		const tables = ['Moves', 'Abilities', 'Items', 'Conditions', 'Rulesets'] as const;
		const own = new Set(tables.flatMap(table => Object.keys(this.data[table])
			.filter(id => this.data[table][id] !== base[table][id]).map(id => `${table}:${id}`)));
		const taken = new Map<string, Set<string>>();
		for (const mod of MODS) {
			const data: AnyObject = this.mod(mod).data;
			for (const table of tables) {
				const target: AnyObject = this.data[table];
				for (const id in data[table]) {
					const entry = data[table][id];
					const original = base[table][id];
					const key = `${table}:${id}`;
					if (entry === original || own.has(key) || EXCLUDED[mod]?.[table]?.includes(id)) continue;
					if (mod === 'gen9pokeathlon') {
						target[id] = entry;
						own.add(key);
						continue;
					}
					if (!taken.has(key)) {
						taken.set(key, new Set());
						target[id] = { ...original };
					}
					for (const attr in entry) {
						if (['isNonstandard', 'num', 'gen'].includes(attr) || taken.get(key)!.has(attr) ||
							entry[attr] === original?.[attr]) continue;
						target[id][attr] = entry[attr];
						taken.get(key)!.add(attr);
					}
				}
			}
		}
	},
	actions: {
		canMegaEvo: Insurgence.actions!.canMegaEvo,
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
					if (pokemon.hasAbility('glitchout')) {
						const glitchmoves = [
							'swordsdance', 'mindreader', 'vanish', 'irondefense', 'nastyplot', 'amnesia', 'agility', 'whirlwind',
							'stealthrock', 'spikes', 'toxicspikes', 'stickyweb', 'reflect', 'lightscreen',
						];
						this.battle.actions.useMove(this.battle.sample(glitchmoves), pokemon);
					}
					hitResults[i] = false;
					continue;
				}
				hitResults[i] = true;
			}
			return hitResults;
		},
		runMegaEvo(pokemon) {
			const speciesid = pokemon.canMegaEvo || pokemon.canUltraBurst;
			if (!speciesid) return false;

			if (!this.battle.ruleTable.has('mixandmegamod')) pokemon.formeChange(speciesid, pokemon.getItem(), true);

			const wasMega = pokemon.canMegaEvo;
			for (const ally of pokemon.side.pokemon) {
				if (wasMega) {
					ally.canMegaEvo = false;
				} else {
					ally.canUltraBurst = null;
				}
			}

			this.battle.runEvent('AfterMega', pokemon);
			return true;
		},
		switchIn: Pokeathlon.actions!.switchIn,
	},
	pokemon: {
		formeChange(
			speciesId: string | Species, source: Effect | null = null, isPermanent?: boolean, abilitySlot = '0', message?: string
		) {
			const changed = Insurgence.pokemon!.formeChange!.call(this, speciesId, source!, isPermanent, abilitySlot, message);
			if (!changed) return false;
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
		disableMove: Pokeathlon.pokemon!.disableMove,
		tryTrap: Mariomon.pokemon!.tryTrap,
		ignoringAbility: Mariomon.pokemon!.ignoringAbility,
		setStatus: Insurgence.pokemon!.setStatus,
		isGrounded: Insurgence.pokemon!.isGrounded,
	},
};
