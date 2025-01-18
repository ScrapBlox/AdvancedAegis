const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cavecrawler')
		.setDescription('Replies with the current roblox lumber tycoon 2 cavecrawler map!'),
	async execute(interaction) {
		const period = 8;
		const unitModifier = 24 * 60 * 60 * 4; // 4 days in seconds

		function getTime() {
			return Math.floor(Date.now() / 1000); // Current time in seconds
		}

		function getCycle() {
			const time = getTime();
			return Math.floor((time % (period * unitModifier)) / unitModifier); // Current cycle index
		}

		function getNextRefreshTime() {
			const time = getTime();
			return time + (unitModifier - (time % unitModifier)); // Unix timestamp of the next refresh
		}

		const cycle = getCycle(); // Determine the current map cycle
		const nextRefreshTimestamp = getNextRefreshTime();

		// Update this base URL to where your images are hosted
		const imageBaseURL = 'https://lt2.robloxforum.net/images'; // Replace with your actual URL
		const imageURL = `${imageBaseURL}/Path${cycle}.png`;

		// Create the embed
		const embed = new EmbedBuilder()
			.setTitle('CAVECRAWLER MAPPER')
			.setDescription(`The map refreshes <t:${nextRefreshTimestamp}:R> (exact time: <t:${nextRefreshTimestamp}:F>)`)
			.setImage(imageURL)
			.setFooter({
				text: 'mapper by: ScrapBlox, captivator, and fizzy',
			});

		// Reply with the embed
		await interaction.reply({ embeds: [embed] });
	},
};
