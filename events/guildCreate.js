const commands = require('../index');
const { Logger } = require('term-logger');

module.exports = (client, guild) => {
    try {
        Logger.info(`Joined a new guild: ${guild.name} (ID: ${guild.id})`);

        // Deploy commands for the new guild
        const commands = client.commands.map(cmd => cmd.data.toJSON()); // Ensure your commands are properly loaded
        client.application.commands.set(commands, guild.id);

        Logger.success(`Commands deployed for guild: ${guild.name} (ID: ${guild.id})`);
    } catch (err) {
        Logger.error(`Error deploying commands to guild: ${guild.name} (ID: ${guild.id})`, err);
    }
};
