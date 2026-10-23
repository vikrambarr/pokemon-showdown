const SKIPPED: { [table: string]: string[] } = {
	Moves: [
		'dive', 'geomancy', 'aurawheel', 'laserfocus', 'meteorassault', 'wish', 'relicsong', 'darkvoid', 'magnitude', 'return',
		'frustration', 'gearup', 'fishiousrend', 'rollingkick', 'flameburst', 'snaptrap', 'eggbomb', 'grassyterrain',
		'electricterrain', 'psychicterrain', 'thousandarrows', 'fireball', 'infernalblade',
	],
	Abilities: ['disguise', 'illuminate', 'hivemind', 'retribution'],
	Items: ['yacheberry'],
	Conditions: ['frb', 'gem'],
};
const RENAMED: { [table: string]: string[] } = {
	Moves: [
		'bounce', 'aurasphere', 'aurorabeam', 'auroraveil', 'dazzlinggleam', 'extremespeed', 'flashcannon', 'photongeyser',
		'safeguard', 'tailglow', 'lusterpurge', 'prismaticlaser', 'hyperspacehole', 'cosmicpower', 'gravity', 'lunardance',
		'meteorbeam', 'swift', 'healingwish', 'meteormash', 'moonblast', 'astralbarrage', 'bellydrum', 'boomburst',
		'disarmingvoice', 'drumbeating', 'echoedvoice', 'growl', 'healbell', 'hypervoice', 'instruct', 'metalsound',
		'nobleroar', 'overdrive', 'perishsong', 'roar', 'round', 'screech', 'sing', 'sleeptalk', 'supersonic', 'uproar',
		'clangingscales', 'clangoroussoul', 'howl', 'fakeout', 'swagger', 'trick', 'covet', 'mistball', 'fellstinger',
		'nightdaze', 'wickedblow', 'magneticflux', 'glaciate', 'glaciallance', 'triattack', 'belch', 'smog', 'dreameater',
		'attackorder', 'firstimpression', 'infestation', 'strugglebug', 'fierywrath', 'breakingswipe', 'twister',
		'chargebeam', 'paraboliccharge', 'spark', 'thundercage', 'drainingkiss', 'fairywind', 'strangesteam', 'armthrust',
		'block', 'doublekick', 'thunderouskick', 'triplekick', 'blazekick', 'aeroblast', 'drillpeck', 'peck', 'astonish',
		'meanlook', 'memento', 'growth', 'sweetscent', 'magicalleaf', 'tropkick', 'highhorsepower', 'horndrill', 'mudslap',
		'iciclecrash', 'coil', 'rest', 'crushclaw', 'doublehit', 'freezingglare', 'megapunch', 'pound', 'slash',
		'crosspoison', 'poisonsting', 'poisonfang', 'poisontail', 'sludge', 'smokescreen', 'confusion', 'harden',
		'rockthrow', 'rollout', 'guillotine', 'metalclaw', 'steelwing', 'swordsdance', 'visegrip', 'flipturn', 'hydropump',
		'liquidation', 'muddywater', 'teatime', 'toxicthread', 'poltergeist', 'steelroller', 'scaleshot', 'burningbulwark',
		'risingvoltage',
	],
	Abilities: [
		'windrider', 'sandveil', 'snowcloak', 'icebody', 'moxie', 'cloudnine', 'waterveil', 'raindish', 'protean',
		'serenegrace', 'moody', 'emergencyexit', 'wimpout', 'rivalry', 'stakeout', 'merciless', 'justified',
		'thermalexchange', 'steadfast', 'flamebody', 'sandforce', 'cutecharm', 'ironbarbs', 'roughskin', 'healer',
		'transistor', 'hadronengine', 'bigpecks',
	],
	Items: [
		'babiriberry', 'chartiberry', 'chilanberry', 'chopleberry', 'cobaberry', 'colburberry', 'habanberry', 'kasibberry',
		'kebiaberry', 'occaberry', 'passhoberry', 'payapaberry', 'rindoberry', 'roseliberry', 'shucaberry', 'tangaberry',
		'wacanberry', 'adrenalineorb', 'rockyhelmet',
	],
};

export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	inherit: 'gen9chaos',
	init() {
		const base: AnyObject = this.mod('gen9').data;
		const data: AnyObject = this.mod('gen9soulstones').data;
		for (const table of ['Moves', 'Abilities', 'Items', 'Conditions'] as const) {
			const target: AnyObject = this.data[table];
			for (const id in data[table]) {
				const entry = data[table][id];
				if (entry === base[table][id] || SKIPPED[table].includes(id)) continue;
				if (RENAMED[table]?.includes(id)) continue;
				if (table !== 'Conditions' || !target[id]) {
					target[id] = entry;
					continue;
				}
				target[id] = { ...target[id] };
				for (const attr in entry) {
					if (target[id][attr] === base[table][id]?.[attr]) target[id][attr] = entry[attr];
				}
			}
			for (const id of RENAMED[table] || []) {
				target[`${id}ss2`] = { ...data[table][id], name: `${data[table][id].name}-SS2`, num: 0 };
			}
		}
		const { cutecharm, hadronengine } = data.Abilities;
		this.data.Abilities.cutecharm = {
			...this.data.Abilities.cutecharm, onSourceModifyDamage: cutecharm.onSourceModifyDamage,
		};
		this.data.Abilities.hadronengine = {
			...this.data.Abilities.hadronengine,
			onModifyAtkPriority: hadronengine.onModifyAtkPriority, onModifyAtk: hadronengine.onModifyAtk,
		};
		const infinity: AnyObject = this.mod('gen9infinity').data;
		for (const id of ['rocksmash', 'wildcharge', 'strength']) {
			this.data.Moves[`${id}inf`] = { ...infinity.Moves[id], name: `${infinity.Moves[id].name}-Inf`, num: 0 };
		}
	},
};
