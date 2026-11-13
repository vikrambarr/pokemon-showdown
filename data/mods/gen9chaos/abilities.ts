const eeveelutions: { [k: string]: string } = {
	"Water": "vaporeon",
	"Fire": "flareon",
	"Grass": "leafeon",
	"Dark": "umbreon",
	"Fairy": "sylveon",
	"Psychic": "espeon",
	"Ice": "glaceon",
	"Electric": "jolteon",
	"Ghost": "omeon",
	"Fighting": "champeon",
	"Rock": "obsideon",
	"Ground": "sphynxeon",
	"Poison": "scorpeon",
	"Steel": "guardeon",
	"Dragon": "draconeon",
	"Bug": "lepideon",
	"Flying": "nimbeon",
	"Nuclear": "nucleon",
	"???": "vareon",
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
	"omeon": "moxie",
	"champeon": "scrappy",
	"obsideon": "rockhead",
	"sphynxeon": "technician",
	"scorpeon": "poisontouch",
	"guardeon": "bulletproof",
	"draconeon": "toughclaws",
	"lepideon": "tintedlens",
	"nimbeon": "galewings",
	"eeveemega": "proteanmaxima",
};

export const Abilities: import('../../../sim/dex-abilities').ModdedAbilityDataTable = {
	proteanmaxima: {
		inherit: true,
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
	noguard: {
		inherit: true,
		onAnyInvulnerability(target, source, move) {
			if (move && !move.ohko && !source.hasItem('mankeyspaw') &&
				(source === this.effectState.target || target === this.effectState.target)) return 0;
		},
		onAnyAccuracy(accuracy, target, source, move) {
			if (move && !move.ohko && !source.hasItem('mankeyspaw') &&
				(source === this.effectState.target || target === this.effectState.target)) {
				return true;
			}
			return accuracy;
		},
	},
};
