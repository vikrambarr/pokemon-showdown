const baseLearnsets = require('../../learnsets').Learnsets;

function flattenLearnset(learnset: ModdedLearnsetData, removals: string[] = [], additions: string[] = []) {
	let finalLearnset: ModdedLearnsetData = {learnset: {}};
	let moves = learnset.learnset;
	if (finalLearnset.learnset) {
		for (const move in moves) {
			if (!removals.includes(move)) {
				finalLearnset.learnset[move] = ["9M"];
			}
		}
		for (const addition of additions) {
			if (!(addition in finalLearnset.learnset)) {
				finalLearnset.learnset[addition] = ["9M"];
			}
		}
	}
	return finalLearnset;
}

export const Learnsets: {[k: string]: ModdedLearnsetData} = {
	// Modded
	florges: flattenLearnset(baseLearnsets.florges),
	electrode: flattenLearnset(baseLearnsets.florges, ['gigaimpact']),

	// Additions
	soulply: {
		learnset: {
			terablast: ["9M"],
			shadowclaw: ["9M"],
			switcheroo: ["9M"],
			thief: ["9M"],
			fling: ["9M"],
			comeuppance: ["9M"],
			boxin: ["9M"],
			curse: ["9M"],
			eggbomb: ["9M"],
			firstimpression: ["9M"],
			uturn: ["9M"],
			workup: ["9M"],
			wakeupslap: ["9M"],
			spite: ["9M"],
			trickroom: ["9M"],
			toxic: ["9M"],
			memento: ["9M"],
			confuseray: ["9M"],
			embargo: ["9M"],
			imprison: ["9M"],
			nightmare: ["9M"],
			snatch: ["9M"],
			endeavor: ["9M"],
			lashout: ["9M"],
			shadowsneak: ["9M"],
			payback: ["9M"],
			swordsdance: ["9M"],
			swagger: ["9M"],
			surf: ["9M"],
			sunnyday: ["9M"],
			suckerpunch: ["9M"],
			substitute: ["9M"],
			slackoff: ["9M"],
			speedswap: ["9M"],
			slash: ["9M"],
			scratch: ["9M"],
			cut: ["9M"],
			nightslash: ["9M"],
			metalclaw: ["9M"],
			honeclaws: ["9M"],
			fakeout: ["9M"],
			destinybond: ["9M"],
			metronome: ["9M"],
			dragonclaw: ["9M"],
			playrough: ["9M"],
			poltergeist : ["9M"],
			shadowpunch: ["9M"],
			leer: ["9M"],
			astonish: ["9M"],
			furyswipes: ["9M"],
			furycutter: ["9M"],
			frustration: ["9M"],
			phantomforce: ["9M"],
			copycat: ["9M"],
			rage: ["9M"],
			protect: ["9M"],
			defensecurl: ["9M"],
			barrier: ["9M"],
			knockoff: ["9M"],
			revenge: ["9M"],
			pursuit: ["9M"],
			brutalswing: ["9M"],
			retaliate: ["9M"],
			scaryface: ["9M"],
			hiddenpower: ["9M"],
			rest: ["9M"],
			attract: ["9M"],
			return: ["9M"],
			captivate: ["9M"],
			doubleedge: ["9M"],
			doubleteam: ["9M"],
			facade: ["9M"],
			round: ["9M"],
			sleeptalk: ["9M"],
			confide: ["9M"],
		},
	},
	imitotion: {
		learnset: {
			terablast: ["9M"],
			rest: ["9M"],
			protect: ["9M"],
			endure: ["9M"],
			substitute: ["9M"],
			attract: ["9M"],
			captivate: ["9M"],
			doubleteam: ["9M"],
			facade: ["9M"],
			round: ["9M"],
			swagger: ["9M"],
			sleeptalk: ["9M"],
			confide: ["9M"],
			aircutter: ["9M"],
			ancientpower: ["9M"],
			assurance: ["9M"],
			bounce: ["9M"],
			breakingswipe: ["9M"],
			bugbuzz: ["9M"],
			dracometeor: ["9M"],
			dragonclaw: ["9M"],
			dragonpulse: ["9M"],
			firefang: ["9M"],
			fly: ["9M"],
			furyswipes: ["9M"],
			heal: ["9M"],
			icefang: ["9M"],
			icywind: ["9M"],
			pluck: ["9M"],
			poisonfang: ["9M"],
			quiverdance: ["9M"],
			roar: ["9M"],
			roost: ["9M"],
			silverwind: ["9M"],
			skittersmack: ["9M"],
			smackdown: ["9M"],
			snarl: ["9M"],
			strugglebug: ["9M"],
			superfang: ["9M"],
			tailwind: ["9M"],
			takedown: ["9M"],
			toxic: ["9M"],
			twister: ["9M"],
			uturn: ["9M"],
			wingattack: ["9M"],
		},
	},
	aviotion: {
		learnset: {
			terablast: ["9M"],
			rest: ["9M"],
			protect: ["9M"],
			endure: ["9M"],
			substitute: ["9M"],
			attract: ["9M"],
			captivate: ["9M"],
			doubleteam: ["9M"],
			facade: ["9M"],
			round: ["9M"],
			swagger: ["9M"],
			sleeptalk: ["9M"],
			confide: ["9M"],
			aerialace: ["9M"],
			aircutter: ["9M"],
			airslash: ["9M"],
			ancientpower: ["9M"],
			assurance: ["9M"],
			bounce: ["9M"],
			breakingswipe: ["9M"],
			bugbuzz: ["9M"],
			dracometeor: ["9M"],
			dragonclaw: ["9M"],
			dragonpulse: ["9M"],
			dualwingbeat: ["9M"],
			earthpower: ["9M"],
			firefang: ["9M"],
			firstimpression: ["9M"],
			fly: ["9M"],
			furyswipes: ["9M"],
			heal: ["9M"],
			hyperheal: ["9M"],
			hypervoice: ["9M"],
			icefang: ["9M"],
			icywind: ["9M"],
			pluck: ["9M"],
			poisonfang: ["9M"],
			psychicfangs: ["9M"],
			quiverdance: ["9M"],
			roar: ["9M"],
			roost: ["9M"],
			silverwind: ["9M"],
			skittersmack: ["9M"],
			skyattack: ["9M"],
			skydrop: ["9M"],
			smackdown: ["9M"],
			snarl: ["9M"],
			strugglebug: ["9M"],
			superfang: ["9M"],
			tailwind: ["9M"],
			takedown: ["9M"],
			toxic: ["9M"],
			twister: ["9M"],
			uturn: ["9M"],
			wingattack: ["9M"],
		},
	},
	dracotion: {
		learnset: {
			terablast: ["9M"],
			rest: ["9M"],
			protect: ["9M"],
			endure: ["9M"],
			substitute: ["9M"],
			attract: ["9M"],
			captivate: ["9M"],
			doubleteam: ["9M"],
			facade: ["9M"],
			round: ["9M"],
			swagger: ["9M"],
			sleeptalk: ["9M"],
			confide: ["9M"],
			aerialace: ["9M"],
			aircutter: ["9M"],
			airslash: ["9M"],
			ancientpower: ["9M"],
			assurance: ["9M"],
			bounce: ["9M"],
			breakingswipe: ["9M"],
			bugbuzz: ["9M"],
			dracometeor: ["9M"],
			dragonbreath: ["9M"],
			dragonclaw: ["9M"],
			dragondance: ["9M"],
			dragonpulse: ["9M"],
			dragonrage: ["9M"],
			dragonrush: ["9M"],
			dualwingbeat: ["9M"],
			earthpower: ["9M"],
			firefang: ["9M"],
			firstimpression: ["9M"],
			flamethrower: ["9M"],
			fly: ["9M"],
			fullheal: ["9M"],
			furyswipes: ["9M"],
			heal: ["9M"],
			hyperfang: ["9M"],
			hyperheal: ["9M"],
			hypervoice: ["9M"],
			icefang: ["9M"],
			icywind: ["9M"],
			outrage: ["9M"],
			fireblast: ["9M"],
			pluck: ["9M"],
			poisonfang: ["9M"],
			psychicfangs: ["9M"],
			psyshock: ["9M"],
			quiverdance: ["9M"],
			roar: ["9M"],
			roost: ["9M"],
			silverwind: ["9M"],
			skittersmack: ["9M"],
			skyattack: ["9M"],
			skydrop: ["9M"],
			smackdown: ["9M"],
			snarl: ["9M"],
			strugglebug: ["9M"],
			superfang: ["9M"],
			tailwind: ["9M"],
			takedown: ["9M"],
			thunder: ["9M"],
			thunderbolt: ["9M"], 
			toxic: ["9M"],
			twister: ["9M"],
			uproar: ["9M"],
			uturn: ["9M"],
			wingattack: ["9M"],
		},
	},
	bunnor: {
		learnset: {
			terablast: ["9M"],
			rest: ["9M"],
			protect: ["9M"],
			endure: ["9M"],
			substitute: ["9M"],
			attract: ["9M"],
			captivate: ["9M"],
			doubleteam: ["9M"],
			facade: ["9M"],
			round: ["9M"],
			swagger: ["9M"],
			sleeptalk: ["9M"],
			confide: ["9M"],
			assist: ["9M"],
			blazekick: ["9M"],
			chipaway: ["9M"],
			copycat: ["9M"],
			cottonguard: ["9M"],
			cottonspore: ["9M"],
			counter: ["9M"],
			covet: ["9M"],
			fakeout: ["9M"],
			faketears: ["9M"],
			feint: ["9M"],
			feintattack: ["9M"],
			grassyglide: ["9M"],
			growl: ["9M"],
			hail: ["9M"],
			hyperbeam: ["9M"],
			icefang: ["9M"],
			iceshard: ["9M"],
			icespinner: ["9M"],
			leer: ["9M"],
			lick: ["9M"],
			lockon: ["9M"],
			lunge: ["9M"],
			mefirst: ["9M"],
			metronome: ["9M"],
			nightslash: ["9M"],
			payback: ["9M"],
			playnice: ["9M"],
			playrough: ["9M"],
			quickattack: ["9M"],
			scratch: ["9M"],
			snowscape: ["9M"],
			trailblaze: ["9M"],
			triplekick: ["9M"],
			zenheadbutt: ["9M"],
		},
	},
	rabbicicle: {
		learnset: {
			terablast: ["9M"],
			rest: ["9M"],
			protect: ["9M"],
			endure: ["9M"],
			substitute: ["9M"],
			attract: ["9M"],
			captivate: ["9M"],
			doubleteam: ["9M"],
			facade: ["9M"],
			round: ["9M"],
			swagger: ["9M"],
			sleeptalk: ["9M"],
			confide: ["9M"],
			assist: ["9M"],
			assurance: ["9M"],
			beatup: ["9M"],
			bellydrum: ["9M"],
			bite: ["9M"],
			blazekick: ["9M"],
			bulkup: ["9M"],
			chipaway: ["9M"],
			copycat: ["9M"],
			cottonguard: ["9M"],
			cottonspore: ["9M"],
			counter: ["9M"],
			covet: ["9M"],
			crunch: ["9M"],
			cut: ["9M"],
			extremespeed: ["9M"],
			fakeout: ["9M"],
			faketears: ["9M"],
			falseswipe: ["9M"],
			feint: ["9M"],
			feintattack: ["9M"],
			furycutter: ["9M"],
			furyswipes: ["9M"],
			grassyglide: ["9M"],
			growl: ["9M"],
			guillotine: ["9M"],
			hail: ["9M"],
			headbutt: ["9M"],
			headcharge: ["9M"],
			highhorsepower: ["9M"],
			highjumpkick: ["9M"],
			hyperbeam: ["9M"],
			hyperfang: ["9M"],
			icefang: ["9M"],
			iceshard: ["9M"],
			icespinner: ["9M"],
			jawlock: ["9M"],
			leer: ["9M"],
			lick: ["9M"],
			lockon: ["9M"],
			lunge: ["9M"],
			mefirst: ["9M"],
			megakick: ["9M"],
			metronome: ["9M"],
			nightslash: ["9M"],
			nobleroar: ["9M"],
			payback: ["9M"],
			playnice: ["9M"],
			playrough: ["9M"],
			poisonfang: ["9M"],
			quickattack: ["9M"],
			rage: ["9M"],
			scratch: ["9M"],
			snowscape: ["9M"],
			strength: ["9M"],
			superfang: ["9M"],
			thunderfang: ["9M"],
			trailblaze: ["9M"],
			triplekick: ["9M"],
			zenheadbutt: ["9M"],
			noretreat: ["9M"],
		},
	},
	enchantobra: {
		learnset: {
			terablast: ["9M"],
			rest: ["9M"],
			protect: ["9M"],
			endure: ["9M"],
			substitute: ["9M"],
			attract: ["9M"],
			captivate: ["9M"],
			doubleteam: ["9M"],
			facade: ["9M"],
			round: ["9M"],
			swagger: ["9M"],
			sleeptalk: ["9M"],
			confide: ["9M"],
			absorb: ["9M"],
			babydolleyes: ["9M"],
			beatup: ["9M"],
			bind: ["9M"],
			bite: ["9M"],
			charm: ["9M"],
			coil: ["9M"],
			crunch: ["9M"],
			dazzlinggleam: ["9M"],
			dig: ["9M"],
			dragonbreath: ["9M"],
			dragontail: ["9M"],
			faketears: ["9M"],
			fireblast: ["9M"],
			firefang: ["9M"],
			firelash: ["9M"],
			flamethrower: ["9M"],
			flareblitz: ["9M"],
			flash: ["9M"],
			flatter: ["9M"],
			foulplay: ["9M"],
			gigadrain: ["9M"],
			glare: ["9M"],
			headbutt: ["9M"],
			headcharge: ["9M"],
			hypervoice: ["9M"],
			incinerate: ["9M"],
			irontail: ["9M"],
			leechlife: ["9M"],
			lick: ["9M"],
			lockon: ["9M"],
			megadrain: ["9M"],
			mistyexplosion: ["9M"],
			moonblast: ["9M"],
			mudsport: ["9M"],
			overheat: ["9M"],
			playrough: ["9M"],
			poisonfang: ["9M"],
			psyshock: ["9M"],
			revenge: ["9M"],
			reversal: ["9M"],
			scaleshot: ["9M"],
			snarl: ["9M"],
			swallow: ["9M"],
			taunt: ["9M"],
			uproar: ["9M"],
			willowisp: ["9M"],
			wrap: ["9M"],
			zenheadbutt: ["9M"],
		},
	},
	eyespy: {
		learnset: {
			terablast: ["9M"],
			rest: ["9M"],
			protect: ["9M"],
			endure: ["9M"],
			substitute: ["9M"],
			attract: ["9M"],
			captivate: ["9M"],
			doubleteam: ["9M"],
			facade: ["9M"],
			round: ["9M"],
			swagger: ["9M"],
			sleeptalk: ["9M"],
			confide: ["9M"],
			aurorabeam: ["9M"],
			chargebeam: ["9M"],
			icebeam: ["9M"],
			psybeam: ["9M"],
			signalbeam: ["9M"],
			simplebeam: ["9M"],
			agility: ["9M"],
			amnesia: ["9M"],
			barrier: ["9M"],
			calmmind: ["9M"],
			healpulse: ["9M"],
			hypnosis: ["9M"],
			reflect: ["9M"],
			lightscreen: ["9M"],
			roleplay: ["9M"],
			trick: ["9M"],
			trickroom: ["9M"],
			wonderroom: ["9M"],
			magicroom: ["9M"],
			psywave: ["9M"],
			psychic: ["9M"],
			laserfocus: ["9M"],
			thunderbolt: ["9M"],
			mirrorshot: ["9M"],
			mudshot: ["9M"],
			partingshot: ["9M"],
			darkpulse: ["9M"],
			terrainpulse: ["9M"],
		},
	},
	icyall: {
		learnset: {
			terablast: ["9M"],
			rest: ["9M"],
			protect: ["9M"],
			endure: ["9M"],
			substitute: ["9M"],
			attract: ["9M"],
			captivate: ["9M"],
			doubleteam: ["9M"],
			facade: ["9M"],
			round: ["9M"],
			swagger: ["9M"],
			sleeptalk: ["9M"],
			confide: ["9M"],
			aurorabeam: ["9M"],
			chargebeam: ["9M"],
			icebeam: ["9M"],
			psybeam: ["9M"],
			signalbeam: ["9M"],
			simplebeam: ["9M"],
			flashcannon: ["9M"],
			agility: ["9M"],
			amnesia: ["9M"],
			barrier: ["9M"],
			calmmind: ["9M"],
			gravity: ["9M"],
			healpulse: ["9M"],
			hypnosis: ["9M"],
			reflect: ["9M"],
			lightscreen: ["9M"],
			roleplay: ["9M"],
			trick: ["9M"],
			trickroom: ["9M"],
			wonderroom: ["9M"],
			magicroom: ["9M"],
			psywave: ["9M"],
			psyshock: ["9M"],
			psychic: ["9M"],
			laserfocus: ["9M"],
			thunderbolt: ["9M"],
			focusblast: ["9M"],
			moonblast: ["9M"],
			mirrorshot: ["9M"],
			mudshot: ["9M"],
			partingshot: ["9M"],
			darkpulse: ["9M"],
			terrainpulse: ["9M"],
		},
	},
	ironeverlasting: {
		learnset: {
			autotomize: ["9M"],
			brickbreak: ["9M"],
			captivate: ["9M"],
			chatter: ["9M"],
			confide: ["9M"],
			defensecurl: ["9M"],
			dizzypunch: ["9M"],
			doublehit: ["9M"],
			doubleslap: ["9M"],
			doubleteam: ["9M"],
			endure: ["9M"],
			facade: ["9M"],
			fakeout: ["9M"],
			flail: ["9M"],
			fling: ["9M"],
			focuspunch: ["9M"],
			furyswipes: ["9M"],
			gearup: ["9M"],
			gigaimpact: ["9M"],
			growl: ["9M"],
			hammerarm: ["9M"],
			headbutt: ["9M"],
			irondefense: ["9M"],
			ironhead: ["9M"],
			irontail: ["9M"],
			lastresort: ["9M"],
			megapunch: ["9M"],
			metalclaw: ["9M"],
			metalsound: ["9M"],
			protect: ["9M"],
			psychic: ["9M"],
			rest: ["9M"],
			rocksmash: ["9M"],
			roleplay: ["9M"],
			round: ["9M"],
			runtimeexception: ["9M"],
			screech: ["9M"],
			shiftgear: ["9M"],
			shockwave: ["9M"],
			sleeptalk: ["9M"],
			spotlight: ["9M"],
			strength: ["9M"],
			substitute: ["9M"],
			swagger: ["9M"],
			tailslap: ["9M"],
			terablast: ["9M"],
			thrash: ["9M"],
			thunder: ["9M"],
			thunderbolt: ["9M"],
			uturn: ["9M"],
			wakeupslap: ["9M"],
			wildcharge: ["9M"],
			workup: ["9M"],
		},
	},
	golisopodshogun: {
		learnset: {
			terablast: ["9M"],
			rest: ["9M"],
			protect: ["9M"],
			endure: ["9M"],
			substitute: ["9M"],
			attract: ["9M"],
			captivate: ["9M"],
			doubleteam: ["9M"],
			facade: ["9M"],
			round: ["9M"],
			swagger: ["9M"],
			sleeptalk: ["9M"],
			confide: ["9M"],
			acrobatics: ["9M"],
			aerialace: ["9M"],
			assurance: ["9M"],
			brickbreak: ["9M"],
			bugbite: ["9M"],
			bulkup: ["9M"],
			bulletpunch: ["9M"],
			closecombat: ["9M"],
			counter: ["9M"],
			defensecurl: ["9M"],
			falseswipe: ["9M"],
			feint: ["9M"],
			firstimpression: ["9M"],
			flashcannon: ["9M"],
			fling: ["9M"],
			focusenergy: ["9M"],
			furycutter: ["9M"],
			gigaimpact: ["9M"],
			hyperbeam: ["9M"],
			icywind: ["9M"],
			irondefense: ["9M"],
			ironhead: ["9M"],
			leechlife: ["9M"],
			metalclaw: ["9M"],
			mudshot: ["9M"],
			nightslash: ["9M"],
			payback: ["9M"],
			pinmissile: ["9M"],
			poisonjab: ["9M"],
			pounce: ["9M"],
			pursuit: ["9M"],
			quickattack: ["9M"],
			quickguard: ["9M"],
			reversal: ["9M"],
			rockslide: ["9M"],
			rocksmash: ["9M"],
			rocktomb: ["9M"],
			sandattack: ["9M"],
			screech: ["9M"],
			shadowclaw: ["9M"],
			slash: ["9M"],
			sludgebomb: ["9M"],
			smartstrike: ["9M"],
			snarl: ["9M"],
			snore: ["9M"],
			snowscape: ["9M"],
			spikes: ["9M"],
			spite: ["9M"],
			stealthrock: ["9M"],
			steelbeam: ["9M"],
			strugglebug: ["9M"],  
			suckerpunch: ["9M"],
			superpower: ["9M"],
			swift: ["9M"],
			swordsdance: ["9M"],
			taunt: ["9M"],
			thief: ["9M"],
			throatchop: ["9M"],
			trailblaze: ["9M"],
			uturn: ["9M"],
			venoshock: ["9M"],
			xscissor: ["9M"],
		}
	},
	tinkatonrhinian: {
		learnset: {
			afteryou: ["9M"],
			allyswitch: ["9M"],
			attract: ["9M"],
			babydolleyes: ["9M"],
			batonpass: ["9M"],
			block: ["9M"],
			bodyslam: ["9M"],
			captivate: ["9M"],
			confide: ["9M"],
			doubleedge: ["9M"],
			doubleteam: ["9M"],
			embargo: ["9M"],
			encore: ["9M"],
			endeavor: ["9M"],
			endure: ["9M"],
			facade: ["9M"],
			fairywind: ["9M"],
			fakeout: ["9M"],
			faketears: ["9M"],
			foulplay: ["9M"],
			gigatonhammer: ["9M"],
			grudge: ["9M"],
			healblock: ["9M"],
			helpinghand: ["9M"],
			icehammer: ["9M"],
			instruct: ["9M"],
			irondefense: ["9M"],
			knockoff: ["9M"],
			lightscreen: ["9M"],
			magiccoat: ["9M"],
			meanlook: ["9M"],
			moonblast: ["9M"],
			partingshot: ["9M"],
			payback: ["9M"],
			playrough: ["9M"],
			powersplit: ["9M"],
			powertrip: ["9M"],
			protect: ["9M"],
			quash: ["9M"],
			recycle: ["9M"],
			reflect: ["9M"],
			rest: ["9M"],
			reversal: ["9M"],
			round: ["9M"],
			slackoff: ["9M"],
			sleeptalk: ["9M"],
			snore: ["9M"],
			spiritbreak: ["9M"],
			stealthrock: ["9M"],
			substitute: ["9M"],
			swagger: ["9M"],
			swift: ["9M"],
			swordsdance: ["9M"],
			taunt: ["9M"],
			terablast: ["9M"],
			trick: ["9M"],
			trickroom: ["9M"],
			uproar: ["9M"],
			woodhammer: ["9M"],
			yawn: ["9M"],
			zenheadbutt: ["9M"],
		},
	},
	regimyo: {
		learnset: {
			ancientpower: ["9M"],
			armthrust: ["9M"],
			attract: ["9M"],
			brickbreak: ["9M"],
			bulldoze: ["9M"],
			calmmind: ["9M"],
			captivate: ["9M"],
			circlethrow: ["9M"],
			confide: ["9M"],
			defensecurl: ["9M"],
			doubleteam: ["9M"],
			drainpunch: ["9M"],
			dynamicpunch: ["9M"],
			endure: ["9M"],
			facade: ["9M"],
			fibregraft: ["9M"],
			firepunch: ["9M"],
			focusblast: ["9M"],
			forcepalm: ["9M"],
			foresight: ["9M"],
			hammerarm: ["9M"],
			howl: ["9M"],
			hurricane: ["9M"],
			icepunch: ["9M"],
			inferno: ["9M"],
			lowkick: ["9M"],
			lowsweep: ["9M"],
			machpunch: ["9M"],
			magnitude: ["9M"],
			meditate: ["9M"],
			mudslap: ["9M"],
			poweruppunch: ["9M"],
			protect: ["9M"],
			quickguard: ["9M"],
			raindance: ["9M"],
			rest: ["9M"],
			revenge: ["9M"],
			rockslide: ["9M"],
			rocktomb: ["9M"],
			rollout: ["9M"],
			round: ["9M"],
			sandstorm: ["9M"],
			sleeptalk: ["9M"],
			smackdown: ["9M"],
			snowscape: ["9M"],
			stormthrow: ["9M"],
			submission: ["9M"],
			substitute: ["9M"],
			sunnyday: ["9M"],
			superpower: ["9M"],
			swagger: ["9M"],
			takedown: ["9M"],
			terablast: ["9M"],
			thunderbolt: ["9M"],
			thunderpunch: ["9M"],
			tickle: ["9M"],
			vacuumwave: ["9M"],
			zenheadbutt: ["9M"],
		},
	},
	jovianshk: {
		learnset: {
			agility: ["9M"],
			amnesia: ["9M"],
			assurance: ["9M"],
			astonish: ["9M"],
			attract: ["9M"],
			bodyslam: ["9M"],
			calmmind: ["9M"],
			captivate: ["9M"],
			coil: ["9M"],
			confide: ["9M"],
			confuseray: ["9M"],
			confusion: ["9M"],
			curse: ["9M"],
			darkpulse: ["9M"],
			disable: ["9M"],
			doubleteam: ["9M"],
			dracometeor: ["9M"],
			dragonbreath: ["9M"],
			dragonclaw: ["9M"],
			dragondance: ["9M"],
			dragonrush: ["9M"],
			dragontail: ["9M"],
			earthpower: ["9M"],
			endeavor: ["9M"],
			endure: ["9M"],
			extrasensory: ["9M"],
			facade: ["9M"],
			fireblast: ["9M"],
			glare: ["9M"],
			gravity: ["9M"],
			helpinghand: ["9M"],
			honeclaws: ["9M"],
			hurricane: ["9M"],
			hypnosis: ["9M"],
			icywind: ["9M"],
			inferno: ["9M"],
			outrage: ["9M"],
			powertrick: ["9M"],
			protect: ["9M"],
			psybeam: ["9M"],
			psychic: ["9M"],
			psychicfangs: ["9M"],
			psychocut: ["9M"],
			psychoshift: ["9M"],
			psyshock: ["9M"],
			raindance: ["9M"],
			rest: ["9M"],
			roar: ["9M"],
			round: ["9M"],
			sleeptalk: ["9M"],
			smog: ["9M"],
			snarl: ["9M"],
			snowscape: ["9M"],
			stoneedge: ["9M"],
			substitute: ["9M"],
			sunnyday: ["9M"],
			surf: ["9M"],
			swagger: ["9M"],
			swift: ["9M"],
			teleport: ["9M"],
			terablast: ["9M"],
			thunder: ["9M"],
			trick: ["9M"],
			twister: ["9M"],
			zapcannon: ["9M"],
			zenheadbutt: ["9M"],
		},
	},
	lunachi: {
		learnset: {
			acrobatics: ["9M"],
			aerialace: ["9M"],
			agility: ["9M"],
			attract: ["9M"],
			beatup: ["9M"],
			brutalswing: ["9M"],
			bulkup: ["9M"],
			calmmind: ["9M"],
			captivate: ["9M"],
			chargebeam: ["9M"],
			confide: ["9M"],
			darkestlariat: ["9M"],
			darkpulse: ["9M"],
			dazzlinggleam: ["9M"],
			doubleedge: ["9M"],
			doubleteam: ["9M"],
			earthpower: ["9M"],
			endeavor: ["9M"],
			endure: ["9M"],
			extrasensory: ["9M"],
			facade: ["9M"],
			faketears: ["9M"],
			foulplay: ["9M"],
			grassknot: ["9M"],
			gravity: ["9M"],
			healbell: ["9M"],
			healingwish: ["9M"],
			icebeam: ["9M"],
			icywind: ["9M"],
			memento: ["9M"],
			moonblast: ["9M"],
			moonlight: ["9M"],
			nightslash: ["9M"],
			playrough: ["9M"],
			powergem: ["9M"],
			protect: ["9M"],
			pursuit: ["9M"],
			quickattack: ["9M"],
			recycle: ["9M"],
			rest: ["9M"],
			rockslide: ["9M"],
			round: ["9M"],
			shadowball: ["9M"],
			sleeptalk: ["9M"],
			spiritbreak: ["9M"],
			storedpower: ["9M"],
			substitute: ["9M"],
			suckerpunch: ["9M"],
			swagger: ["9M"],
			taunt: ["9M"],
			terablast: ["9M"],
			trick: ["9M"],
			wideguard: ["9M"],
			zenheadbutt: ["9M"],
		},
	},
	ockthane: {
		learnset: {
			amnesia: ["9M"],
			attract: ["9M"],
			auroraveil: ["9M"],
			blizzard: ["9M"],
			brine: ["9M"],
			calmmind: ["9M"],
			captivate: ["9M"],
			charge: ["9M"],
			chargebeam: ["9M"],
			confide: ["9M"],
			darkpulse: ["9M"],
			discharge: ["9M"],
			dive: ["9M"],
			doubleteam: ["9M"],
			electroball: ["9M"],
			endure: ["9M"],
			facade: ["9M"],
			fly: ["9M"],
			focusblast: ["9M"],
			followme: ["9M"],
			gust: ["9M"],
			icebeam: ["9M"],
			icespinner: ["9M"],
			icywind: ["9M"],
			iondeluge: ["9M"],
			lightscreen: ["9M"],
			magnetrise: ["9M"],
			mudshot: ["9M"],
			nastyplot: ["9M"],
			octazooka: ["9M"],
			protect: ["9M"],
			psychic: ["9M"],
			reflect: ["9M"],
			rest: ["9M"],
			round: ["9M"],
			shockwave: ["9M"],
			sleeptalk: ["9M"],
			snarl: ["9M"],
			snowscape: ["9M"],
			soak: ["9M"],
			spark: ["9M"],
			substitute: ["9M"],
			swagger: ["9M"],
			taunt: ["9M"],
			terablast: ["9M"],
			thunder: ["9M"],
			thunderbolt: ["9M"],
			thundershock: ["9M"],
			thunderwave: ["9M"],
			tickle: ["9M"],
			voltswitch: ["9M"],
			whirlpool: ["9M"],
			whirlwind: ["9M"],
			wideguard: ["9M"],
			wildcharge: ["9M"],
			withdraw: ["9M"],
			wrap: ["9M"],
		},
	},
	raikousupra: {
		learnset: {
			terablast: ["9M"],
			rest: ["9M"],
			protect: ["9M"],
			substitute: ["9M"],
			attract: ["9M"],
			return: ["9M"],
			frustration: ["9M"],
			captivate: ["9M"],
			doubleedge: ["9M"],
			doubleteam: ["9M"],
			facade: ["9M"],
			round: ["9M"],
			swagger: ["9M"],
			sleeptalk: ["9M"],
			confide: ["9M"],
			deserttempest: ["9M"],
			sandstorm: ["9M"],
			heatwave: ["9M"],
			solarbeam: ["9M"],
			sunnyday: ["9M"],
			earthquake: ["9M"],
			earthpower: ["9M"],
			powergem: ["9M"],
			meteorbeam: ["9M"],
			headsmash: ["9M"],
			skullbash: ["9M"],
			stoneedge: ["9M"],
			stealthrock: ["9M"],
			thunderwave: ["9M"],
			voltswitch: ["9M"],
			irondefense: ["9M"],
			agility: ["9M"],
			calmmind: ["9M"],
			extremespeed: ["9M"],
			scald: ["9M"],
			quickattack: ["9M"],
			accelerock: ["9M"],
			bite: ["9M"],
			roar: ["9M"],
			thunderfang: ["9M"],
			crunch: ["9M"],
			ancientpower: ["9M"],
			reflect: ["9M"],
			ironhead: ["9M"],
			focusblast: ["9M"],
			closecombat: ["9M"],
			dazzlinggleam: ["9M"],  
			aurasphere: ["9M"],  
			bodyslam: ["9M"],  
			bulldoze: ["9M"],   
			flashcannon: ["9M"],   
			dig: ["9M"],   
			flareblitz: ["9M"],
			endure: ["9M"],  
			flash: ["9M"],  
			gigaimpact: ["9M"],  
			helpinghand: ["9M"],  
			hiddenpower: ["9M"],  
			hyperbeam: ["9M"],
			irontail: ["9M"],  
			lightscreen: ["9M"],  
			psychup: ["9M"],   
			rockclimb: ["9M"],  
			rocksmash: ["9M"],  
			shadowball: ["9M"],  
			shockwave: ["9M"],  
			snarl: ["9M"],  
			snore: ["9M"],  
			strength: ["9M"],  
			swift: ["9M"],  
			throatchop: ["9M"],
		},
	},
	heatransupra: {
		learnset: {
			bloomsday: ["9M"],
			terablast: ["9M"],
			rest: ["9M"],
			protect: ["9M"],
			endure: ["9M"],
			substitute: ["9M"],
			attract: ["9M"],
			captivate: ["9M"],
			doubleteam: ["9M"],
			facade: ["9M"],
			round: ["9M"],
			swagger: ["9M"],
			sleeptalk: ["9M"],
			confide: ["9M"],
			bite: ["9M"],
			burnup: ["9M"],
			earthpower: ["9M"],
			earthquake: ["9M"],
			ember: ["9M"],
			fierydance: ["9M"],
			fireblast: ["9M"],
			flamethrower: ["9M"],
			flareblitz: ["9M"],
			forestscurse: ["9M"],
			foulplay: ["9M"],
			gigadrain: ["9M"],
			growth: ["9M"],
			headbutt: ["9M"],
			healpulse: ["9M"],
			incinerate: ["9M"],
			inferno: ["9M"],
			leafstorm: ["9M"],
			leechseed: ["9M"],
			overheat: ["9M"],
			psybeam: ["9M"],
			seedbomb: ["9M"],
			solarbeam: ["9M"],
			solarblade: ["9M"],
			takedown: ["9M"],
			vinewhip: ["9M"],
			weatherball: ["9M"],
			woodhammer: ["9M"],
		},
	},
	mosster: {
		learnset: {
			ancientpower: ["9M"],
			attract: ["9M"],
			bide: ["9M"],
			block: ["9M"],
			bodypress: ["9M"],
			bodyslam: ["9M"],
			bubble: ["9M"],
			bubblebeam: ["9M"],
			captivate: ["9M"],
			chipaway: ["9M"],
			confide: ["9M"],
			crabhammer: ["9M"],
			curse: ["9M"],
			defensecurl: ["9M"],
			dive: ["9M"],
			doubleteam: ["9M"],
			earthpower: ["9M"],
			earthquake: ["9M"],
			endure: ["9M"],
			energyball: ["9M"],
			facade: ["9M"],
			gastroacid: ["9M"],
			gigadrain: ["9M"],
			grassyglide: ["9M"],
			headsmash: ["9M"],
			heavyslam: ["9M"],
			helpinghand: ["9M"],
			honeclaws: ["9M"],
			ingrain: ["9M"],
			irondefense: ["9M"],
			leafage: ["9M"],
			muddywater: ["9M"],
			mudshot: ["9M"],
			powergem: ["9M"],
			protect: ["9M"],
			recycle: ["9M"],
			rest: ["9M"],
			rockpolish: ["9M"],
			rocktomb: ["9M"],
			rollout: ["9M"],
			round: ["9M"],
			safeguard: ["9M"],
			sandstorm: ["9M"],
			seedbomb: ["9M"],
			sleeptalk: ["9M"],
			solarbeam: ["9M"],
			stealthrock: ["9M"],
			stoneedge: ["9M"],
			substitute: ["9M"],
			superpower: ["9M"],
			swagger: ["9M"],
			synthesis: ["9M"],
			terablast: ["9M"],
			toxic: ["9M"],
			trailblaze: ["9M"],
			venomdrench: ["9M"],
			whirlpool: ["9M"],
			wideguard: ["9M"],
			woodhammer: ["9M"],
		},
	},
	barrimander: {
		learnset: {
			terablast: ["9M"],
			rest: ["9M"],
			protect: ["9M"],
			endure: ["9M"],
			substitute: ["9M"],
			attract: ["9M"],
			captivate: ["9M"],
			doubleteam: ["9M"],
			facade: ["9M"],
			round: ["9M"],
			swagger: ["9M"],
			sleeptalk: ["9M"],
			confide: ["9M"],
			acid: ["9M"],
			agility: ["9M"],
			allyswitch: ["9M"],
			ancientpower: ["9M"],
			aquatail: ["9M"],
			assurance: ["9M"],
			astonish: ["9M"],
			banefulbunker: ["9M"],
			barrier: ["9M"],
			beatup: ["9M"],
			block: ["9M"],
			bulwark: ["9M"],
			chillingwater: ["9M"],
			corrosivegas: ["9M"],
			dragonpulse: ["9M"],
			dragontail: ["9M"],
			embargo: ["9M"],
			encore: ["9M"],
			expandingforce: ["9M"],
			extrasensory: ["9M"],
			fakeout: ["9M"],
			faketears: ["9M"],
			feintattack: ["9M"],
			flail: ["9M"],
			flatter: ["9M"],
			fling: ["9M"],
			foulplay: ["9M"],
			frustration: ["9M"],
			futuresight: ["9M"],
			gigaimpact: ["9M"],
			gravity: ["9M"],
			gunkshot: ["9M"],
			healblock: ["9M"],
			helpinghand: ["9M"],
			hiddenpower: ["9M"],
			hyperbeam: ["9M"],
			hypnosis: ["9M"],
			knockoff: ["9M"],
			lick: ["9M"],
			lightscreen: ["9M"],
			magiccoat: ["9M"],
			memento: ["9M"],
			mudshot: ["9M"],
			nastyplot: ["9M"],
			partingshot: ["9M"],
			payback: ["9M"],
			poisongas: ["9M"],
			poisontail: ["9M"],
			pound: ["9M"],
			psybeam: ["9M"],
			psychicterrain: ["9M"],
			psychoshift: ["9M"],
			psyshock: ["9M"],
			psywave: ["9M"],
			quash: ["9M"],
			recover: ["9M"],
			reflect: ["9M"],
			refresh: ["9M"],
			retaliate: ["9M"],
			return: ["9M"],
			safeguard: ["9M"],
			shadowsneak: ["9M"],
			skillswap: ["9M"],
			sludge: ["9M"],
			sludgebomb: ["9M"],
			snarl: ["9M"],
			snatch: ["9M"],
			snore: ["9M"],
			switcheroo: ["9M"],
			teleport: ["9M"],
			thief: ["9M"],
			throatchop: ["9M"],
			thunderwave: ["9M"],
			topsyturvy: ["9M"],
			torment: ["9M"],
			toxic: ["9M"],
			toxicspikes: ["9M"],
			trickroom: ["9M"],
			venoshock: ["9M"],
			wrap: ["9M"],
			yawn: ["9M"],
		},
	},
	meditao: flattenLearnset(baseLearnsets.medicham, [], ['snatch', 'darkpulse']),
	bewitwing: {
		learnset: {
			acrobatics: ["9M"],
			airslash: ["9M"],
			allyswitch: ["9M"],
			attract: ["9M"],
			bite: ["9M"],
			captivate: ["9M"],
			confide: ["9M"],
			copycat: ["9M"],
			crunch: ["9M"],
			curse: ["9M"],
			dazzlinggleam: ["9M"],
			destinybond: ["9M"],
			doubleteam: ["9M"],
			drainingkiss: ["9M"],
			dualwingbeat: ["9M"],
			endure: ["9M"],
			facade: ["9M"],
			fairywind: ["9M"],
			firefang: ["9M"],
			flatter: ["9M"],
			followme: ["9M"],
			foulplay: ["9M"],
			frustration: ["9M"],
			hex: ["9M"],
			leer: ["9M"],
			lightscreen: ["9M"],
			magicpowder: ["9M"],
			metronome: ["9M"],
			mistyterrain: ["9M"],
			moonblast: ["9M"],
			nastyplot: ["9M"],
			nightshade: ["9M"],
			ominouswind: ["9M"],
			pixietrick: ["9M"],
			playrough: ["9M"],
			protect: ["9M"],
			psychicfangs: ["9M"],
			reflect: ["9M"],
			rest: ["9M"],
			return: ["9M"],
			round: ["9M"],
			scratch: ["9M"],
			shadowball: ["9M"],
			shadowclaw: ["9M"],
			shadowsneak: ["9M"],
			slash: ["9M"],
			sleeptalk: ["9M"],
			snarl: ["9M"],
			snatch: ["9M"],
			spite: ["9M"],
			substitute: ["9M"],
			swagger: ["9M"],
			switcheroo: ["9M"],
			swordsdance: ["9M"],
			tailwind: ["9M"],
			terablast: ["9M"],
			thunderwave: ["9M"],
			trick: ["9M"],
			uturn: ["9M"],
			willowisp: ["9M"],
		},
	},
	eidolburgh: {
		learnset: {
			aircutter: ["9M"],
			airslash: ["9M"],
			amnesia: ["9M"],
			ancientpower: ["9M"],
			attract: ["9M"],
			barrage: ["9M"],
			bind: ["9M"],
			bodypress: ["9M"],
			bodyslam: ["9M"],
			bugbite: ["9M"],
			bugbuzz: ["9M"],
			bulldoze: ["9M"],
			calmmind: ["9M"],
			captivate: ["9M"],
			clearsmog: ["9M"],
			confide: ["9M"],
			craftyshield: ["9M"],
			curse: ["9M"],
			dazzlinggleam: ["9M"],
			defog: ["9M"],
			disarmingvoice: ["9M"],
			doubleteam: ["9M"],
			dragonpulse: ["9M"],
			drainingkiss: ["9M"],
			earthpower: ["9M"],
			earthquake: ["9M"],
			embargo: ["9M"],
			endure: ["9M"],
			explosion: ["9M"],
			facade: ["9M"],
			fairylock: ["9M"],
			fairywind: ["9M"],
			featherdance: ["9M"],
			fellstinger: ["9M"],
			flamethrower: ["9M"],
			flashcannon: ["9M"],
			fly: ["9M"],
			gravity: ["9M"],
			gust: ["9M"],
			gyroball: ["9M"],
			healbell: ["9M"],
			healblock: ["9M"],
			healpulse: ["9M"],
			heavyslam: ["9M"],
			imprison: ["9M"],
			infestation: ["9M"],
			irondefense: ["9M"],
			leechlife: ["9M"],
			lockon: ["9M"],
			lunge: ["9M"],
			moonblast: ["9M"],
			moonlight: ["9M"],
			nobleroar: ["9M"],
			perishsong: ["9M"],
			pinmissile: ["9M"],
			playrough: ["9M"],
			pollenpuff: ["9M"],
			powergem: ["9M"],
			protect: ["9M"],
			quash: ["9M"],
			rest: ["9M"],
			roar: ["9M"],
			rockblast: ["9M"],
			rockpolish: ["9M"],
			rockslide: ["9M"],
			rocktomb: ["9M"],
			roost: ["9M"],
			round: ["9M"],
			safeguard: ["9M"],
			screech: ["9M"],
			sleeptalk: ["9M"],
			spite: ["9M"],
			stealthrock: ["9M"],
			steelwing: ["9M"],
			stoneedge: ["9M"],
			stringshot: ["9M"],
			strugglebug: ["9M"],
			substitute: ["9M"],
			swagger: ["9M"],
			terablast: ["9M"],
			twister: ["9M"],
			weatherball: ["9M"],
			whirlwind: ["9M"],
			wideguard: ["9M"],
			workup: ["9M"],
		},
	},
	snorlaxfrost: {
		learnset: {
			ancientpower: ["9M"],
			armthrust: ["9M"],
			attract: ["9M"],
			avalanche: ["9M"],
			bellydrum: ["9M"],
			bite: ["9M"],
			bodypress: ["9M"],
			bulkup: ["9M"],
			captivate: ["9M"],
			closecombat: ["9M"],
			confide: ["9M"],
			crunch: ["9M"],
			curse: ["9M"],
			defensecurl: ["9M"],
			doubleedge: ["9M"],
			doublehit: ["9M"],
			doubleslap: ["9M"],
			doubleteam: ["9M"],
			earthpower: ["9M"],
			earthquake: ["9M"],
			endure: ["9M"],
			explosion: ["9M"],
			facade: ["9M"],
			firefang: ["9M"],
			fissure: ["9M"],
			grudge: ["9M"],
			haze: ["9M"],
			headlongrush: ["9M"],
			heavyslam: ["9M"],
			hex: ["9M"],
			hyperfang: ["9M"],
			iceball: ["9M"],
			icebeam: ["9M"],
			icefang: ["9M"],
			icepunch: ["9M"],
			icespinner: ["9M"],
			iciclecrash: ["9M"],
			icywind: ["9M"],
			lick: ["9M"],
			magnitude: ["9M"],
			mist: ["9M"],
			mudbomb: ["9M"],
			mudslap: ["9M"],
			mudslide: ["9M"],
			nastyplot: ["9M"],
			nightmare: ["9M"],
			payback: ["9M"],
			poisonfang: ["9M"],
			powdersnow: ["9M"],
			poweruppunch: ["9M"],
			protect: ["9M"],
			psychicfangs: ["9M"],
			rest: ["9M"],
			return: ["9M"],
			revenge: ["9M"],
			rockslide: ["9M"],
			round: ["9M"],
			shadowclaw: ["9M"],
			sheercold: ["9M"],
			sleeptalk: ["9M"],
			snarl: ["9M"],
			snowscape: ["9M"],
			spikes: ["9M"],
			spite: ["9M"],
			stealthrock: ["9M"],
			stompingtantrum: ["9M"],
			stoneedge: ["9M"],
			substitute: ["9M"],
			superfang: ["9M"],
			superpower: ["9M"],
			swagger: ["9M"],
			taunt: ["9M"],
			terablast: ["9M"],
			thunderfang: ["9M"],
			torment: ["9M"],
			zenheadbutt: ["9M"],
		},
	},
	heracrosssubarctic: {
		learnset: {
			agility: ["9M"],
			ancientpower: ["9M"],
			attract: ["9M"],
			aurorabeam: ["9M"],
			avalanche: ["9M"],
			blizzard: ["9M"],
			bodyslam: ["9M"],
			bugbite: ["9M"],
			bugbuzz: ["9M"],
			bulldoze: ["9M"],
			calmmind: ["9M"],
			captivate: ["9M"],
			chillingwater: ["9M"],
			confide: ["9M"],
			cottonguard: ["9M"],
			dig: ["9M"],
			disarmingvoice: ["9M"],
			doubleedge: ["9M"],
			doubleteam: ["9M"],
			earthpower: ["9M"],
			earthquake: ["9M"],
			echoedvoice: ["9M"],
			endeavor: ["9M"],
			endure: ["9M"],
			energyball: ["9M"],
			facade: ["9M"],
			falseswipe: ["9M"],
			flashcannon: ["9M"],
			fling: ["9M"],
			focusblast: ["9M"],
			freezedry: ["9M"],
			frostbreath: ["9M"],
			furycutter: ["9M"],
			gigadrain: ["9M"],
			haze: ["9M"],
			helpinghand: ["9M"],
			hyperbeam: ["9M"],
			hypnosis: ["9M"],
			icebeam: ["9M"],
			icepunch: ["9M"],
			iceshard: ["9M"],
			icespinner: ["9M"],
			iciclespear: ["9M"],
			icywind: ["9M"],
			infestation: ["9M"],
			irondefense: ["9M"],
			knockoff: ["9M"],
			leer: ["9M"],
			lunge: ["9M"],
			magicalleaf: ["9M"],
			megahorn: ["9M"],
			mist: ["9M"],
			packin: ["9M"],
			poisonjab: ["9M"],
			pollenpuff: ["9M"],
			pounce: ["9M"],
			powdersnow: ["9M"],
			protect: ["9M"],
			psybeam: ["9M"],
			ragepowder: ["9M"],
			raindance: ["9M"],
			rest: ["9M"],
			rockblast: ["9M"],
			round: ["9M"],
			shadowball: ["9M"],
			skittersmack: ["9M"],
			sleeptalk: ["9M"],
			snore: ["9M"],
			snowscape: ["9M"],
			spikes: ["9M"],
			strugglebug: ["9M"],
			substitute: ["9M"],
			swagger: ["9M"],
			swift: ["9M"],
			swordsdance: ["9M"],
			tackle: ["9M"],
			takedown: ["9M"],
			terablast: ["9M"],
			trailblaze: ["9M"],
			uturn: ["9M"],
			vacuumwave: ["9M"],
			venoshock: ["9M"],
			weatherball: ["9M"],
			workup: ["9M"],
		},
	},
};
