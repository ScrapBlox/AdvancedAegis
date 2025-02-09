// Require the necessary discord.js classes
const { Client, Collection, Events, GatewayIntentBits, Partials } = require('discord.js');
const { Logger } = require("term-logger");
const loadEvents = require('./eventLoader'); // [BACK SOON™] Adjust path if needed
const {dotenv} = require("dotenv").config();

//require('./deploy_commands');
require('./cleanup');

// Create a new client instance
global.client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildModeration,
    ],
    partials: [
        Partials.Message,
        Partials.GuildMember,
        Partials.Reaction,
    ]
});

// Load Events
try {
    loadEvents(client);
    Logger.success('Successfully loaded event files');
} catch (err) {
    Logger.error(`Error loading events: ${err.message}`);
    process.exit(1); // Exit if events fail to load
}

client.commands = new Collection();

const fs = require('node:fs');
const path = require('node:path');

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			Logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		Logger.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		Logger.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
	}
});

// Log in to Discord with your client's token
client.login(process.env.TOKEN);