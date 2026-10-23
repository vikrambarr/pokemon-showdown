export const Moves: import('../../../sim/dex-moves').ModdedMoveDataTable = {
	hyperspacefury: {
		inherit: true,
		onTry(source) {},
	},
	ivycudgel: {
		inherit: true,
		onModifyType(move, pokemon) {
			const forme = pokemon.species.baseSpecies === 'Ogerpon' ? pokemon.species.name : pokemon.m.fusion;
			switch (forme) {
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
	ragingbull: {
		inherit: true,
		onModifyType(move, pokemon) {
			const forme = pokemon.species.name.includes('Tauros-Paldea') ? pokemon.species.name : pokemon.m.fusion;
			switch (forme) {
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
	relicsong: {
		inherit: true,
		onAfterMoveSecondarySelf(pokemon) {
			if (
				(pokemon.baseSpecies.baseSpecies === 'Meloetta' || pokemon.m.fusion?.includes('Meloetta')) && !pokemon.transformed
			) {
				if (pokemon.species.baseSpecies === 'Meloetta') {
					const meloettaForme = pokemon.species.id === 'meloettapirouette' ? '' : '-Pirouette';
					pokemon.formeChange('Meloetta' + meloettaForme, this.effect, false, '0', '[msg]');
				} else if (pokemon.m.fusion?.includes('Meloetta')) {
					const meloettaForme = pokemon.m.fusion === 'Meloetta-Pirouette' ? '' : '-Pirouette';
					pokemon.fusionChange('Meloetta' + meloettaForme, this.effect);
				}
			}
		},
	},
	orderup: {
		inherit: true,
		onAfterMoveSecondarySelf(pokemon, target, move) {
			if (!pokemon.volatiles['commanded']) return;
			let tatsugiri = pokemon.volatiles['commanded'].source;
			if (tatsugiri.baseSpecies.baseSpecies !== 'Tatsugiri') tatsugiri = this.dex.species.get(tatsugiri.m.fusion);
			switch (tatsugiri.baseSpecies.forme) {
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
	telekinesis: {
		inherit: true,
		condition: {
			duration: 3,
			onStart(target) {
				if (['Diglett', 'Dugtrio', 'Palossand', 'Sandygast'].includes(target.baseSpecies.baseSpecies) ||
					['Diglett', 'Dugtrio', 'Palossand', 'Sandygast'].includes(this.dex.species.get(target.m.fusion).baseSpecies) ||
					target.baseSpecies.name === 'Gengar-Mega') {
					this.add('-immune', target);
					return null;
				}
				if (target.volatiles['smackdown'] || target.volatiles['ingrain']) return false;
				this.add('-start', target, 'Telekinesis');
			},
			onAccuracyPriority: -1,
			onAccuracy(accuracy, target, source, move) {
				if (move && !move.ohko) return true;
			},
			onImmunity(type) {
				if (type === 'Ground') return false;
			},
			onUpdate(pokemon) {
				if (pokemon.baseSpecies.name === 'Gengar-Mega') {
					delete pokemon.volatiles['telekinesis'];
					this.add('-end', pokemon, 'Telekinesis', '[silent]');
				}
			},
			onResidualOrder: 19,
			onEnd(target) {
				this.add('-end', target, 'Telekinesis');
			},
		},
	},
	dive: {
		inherit: true,
		onTryMove(attacker, defender, move) {
			if (attacker.removeVolatile(move.id)) {
				return;
			}
			if (attacker.hasAbility('gulpmissile') && !attacker.transformed) {
				const forme = attacker.hp <= attacker.maxhp / 2 ? 'cramorantgorging' : 'cramorantgulping';
				if (attacker.species.name === 'Cramorant') {
					attacker.formeChange(forme, move);
				} else if (attacker.m.fusion === 'Cramorant') {
					attacker.fusionChange(forme, move);
				}
			}
			this.add('-prepare', attacker, move.name);
			if (!this.runEvent('ChargeMove', attacker, defender, move)) {
				return;
			}
			attacker.addVolatile('twoturnmove', defender);
			return null;
		},
	},
	watershuriken: {
		inherit: true,
		basePowerCallback(pokemon, target, move) {
			if ([pokemon.species.name, pokemon.m.fusion].includes('Greninja-Ash') && pokemon.hasAbility('battlebond') &&
				!pokemon.transformed) {
				return move.basePower + 5;
			}
			return move.basePower;
		},
	},
	aurawheel: {
		inherit: true,
		onTry(source) {
			if (source.species.baseSpecies === 'Morpeko' || source.m.fusion?.includes('Morpeko')) {
				return;
			}
			this.attrLastMove('[still]');
			this.add('-fail', source, 'move: Aura Wheel');
			this.hint("Only a Pokemon whose form or fusion is Morpeko or Morpeko-Hangry can use this move.");
			return null;
		},
		onModifyType(move, pokemon) {
			if ([pokemon.species.name, pokemon.m.fusion].includes('Morpeko-Hangry')) {
				move.type = 'Dark';
			} else {
				move.type = 'Electric';
			}
		},
	},
	darkvoid: {
		inherit: true,
		onTry(source, target, move) {
			if ([source.species.name, source.m.fusion].includes('Darkrai') || move.hasBounced) {
				return;
			}
			this.add('-fail', source, 'move: Dark Void');
			this.hint("Only a Pokemon whose form or fusion is Darkrai can use this move.");
			return null;
		},
	},
};
