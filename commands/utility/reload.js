const { SlashCommandBuilder } = require('discord.js');
const { dotenv } = require('dotenv');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('[DEV] Reloads all the bots commands'),
	async execute(interaction) {
		if (interaction.user.id != 559426150619676682) {
			interaction.reply({
				content: 'not authorized'
			});
		} else {
			require('../../deploy_commands');
			interaction.reply({
				content: 'reload file called'
			});
		}
		
	},
};
