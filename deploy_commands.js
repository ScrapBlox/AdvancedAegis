const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { Logger } = require('term-logger');
const { dotenv } = require("dotenv").config();

const commands = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    // Grab all the command files from the commands directory
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            Logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.TOKEN); // Using token from config.json or environment variables

// Deploy global commands
(async () => {
    try {
        Logger.start(`Started refreshing ${commands.length} application (/) commands globally.`);

        // The put method is used to fully refresh all global commands
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID), // Note: Using global endpoint here
            { body: commands },
        );

        Logger.success(`Successfully reloaded ${data.length} application (/) commands globally.`);
    } catch (error) {
        // Log any errors
        Logger.error(error);
    }
})();
