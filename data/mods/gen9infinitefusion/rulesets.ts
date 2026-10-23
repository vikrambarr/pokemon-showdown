export const Rulesets: import('../../../sim/dex-formats').ModdedFormatDataTable = {
	obtainable: {
		inherit: true,
		onValidateTeam(team, format) {
			const problems: string[] = [];
			[
				['DNA Splicers', ['Kyurem-White', 'Kyurem-Black']],
				['N-Solarizer', ['Necrozma-Dusk-Mane']],
				['N-Solarizer', ['Necrozma-Dawn-Wings']],
				['Reins of Unity', ['Calyrex-Ice', 'Calyrex-Shadow']],
			].forEach(
				data => team.some(
					set => {
						const fusion = this.dex.species.get(set.fusion).name;
						if (
							[set.species, fusion].every(name => data[1].includes(name)) ||
							([set.species, fusion].some(name => data[1].includes(name)) &&
								team.filter(obj => obj !== set).some(test => (
									[test.species, this.dex.species.get(test.fusion).name].some(name => data[1].includes(name))
								)))
						) {
							problems.push(
								`You cannot have more than one ${(data[1] as string[]).join('/')}.`,
								`(It's untradeable and you can only make one with the ${data[0] as string})`,
							);
							return true;
						}
						return false;
					}
				)
			);
			return problems;
		},
	},
};
