const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const mysql = require('mysql2');
const {dotenv} = require("dotenv").config();

// Create a MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDescription('Configure the bot for your server!')
        .addRoleOption(option =>
            option
                .setName('strikeone')
                .setDescription('Select the role for strike 1')
                .setRequired(true))
        .addRoleOption(option =>
            option
                .setName('striketwo')
                .setDescription('Select the role for strike 2')
                .setRequired(true))
        .addRoleOption(option =>
            option
                .setName('strikethree')
                .setDescription('Select the role for strike 3')
                .setRequired(true))
        .addChannelOption(option =>
            option
                .setName('privatelogs')
                .setDescription('Private logs channel')
                .setRequired(true))
        .addChannelOption(option =>
            option
                .setName('publiclogs')
                .setDescription('Public logs channel')
                .setRequired(true)),
    async execute(interaction) {
        // Retrieve the provided options
        const Strike1 = interaction.options.getRole('strikeone');
        const Strike2 = interaction.options.getRole('striketwo');
        const Strike3 = interaction.options.getRole('strikethree');
        const PrivateLogs = interaction.options.getChannel('privatelogs');
        const PublicLogs = interaction.options.getChannel('publiclogs');
                
        const guildId = interaction.guild.id;

        try {
            // Save the configuration into the database
            // const query = `
            //     INSERT INTO guild_configs (guild_id, strike1, strike2, strike3, ServerLogs, PublicLog)
            //     VALUES (?, ?, ?, ?, ?, ?)
            //     ON DUPLICATE KEY UPDATE
            //         strike1 = VALUES(strike1),
            //         strike2 = VALUES(strike2),
            //         strike3 = VALUES(strike3),
            //         ServerLogs = VALUES(ServerLogs),
            //         PublicLog = VALUES(PublicLog)
            // `;

            const query = `
                REPLACE INTO guild_configs (guild_id, strike1, strike2, strike3, ServerLogs, PublicLog)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            const values = [
                guildId,
                Strike1.id,
                Strike2.id,
                Strike3.id,
                PrivateLogs.id,
                PublicLogs.id,
                guildId,
            ];

            await pool.promise().query(query, values);

            // Send confirmation message
            await interaction.reply({
                content: '✅ Configuration saved successfully!',
                ephemeral: true
            });
        } catch (err) {
            console.error('Error saving guild configuration:', err);
            await interaction.reply({
                content: '❌ An error occurred while saving the configuration. Please try again later.',
                ephemeral: true
            });
        }
    },
};
