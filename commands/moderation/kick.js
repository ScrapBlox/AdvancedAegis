const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { dotenv } = require("dotenv").config();
const mysql = require('mysql2');
const { Logger } = require('term-logger');

// Create a MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks a member from the Discord server')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option
                .setName('member')
                .setDescription('Member to kick')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The reason for kicking')),
    async execute(interaction) {
        const targetMember = interaction.options.getMember('member'); // Get member to ban
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const guildName = interaction.guild.name;

        if (!targetMember) {
            return await interaction.reply({
                content: '❌ Unable to find the specified member.',
                ephemeral: true
            });
        }

        if (!targetMember.kickable) {
            return await interaction.reply({
                content: '❌ A greater force is preventing me from kicking that user.',
                ephemeral: true
            });
        }

        // Attempt to DM the user
        await targetMember.send(`You have been kicked from **${guildName}**.\n**Reason:** ${reason}`).catch(() => { });

        // Finish Him
        targetMember.kick({reason});

        // Confirmation embed
        const embed = new EmbedBuilder()
            .setDescription(`✅ **${targetMember.user.tag}** has been kicked\n**Reason: **${reason}`)
            .setColor("#f50000");

        await interaction.reply({ embeds: [embed] });


        // Get guild's strike roles
        const GetConfigQuery = `SELECT * FROM guild_configs WHERE guild_id = ?`;
        pool.execute(GetConfigQuery, [interaction.guild.id], async (err, gcres) => {
            if (err) {
                Logger.error('Error getting guild config:',err);
            }


            const currentStrikeScore = `SELECT strike_score FROM warnings WHERE user_id = ? AND guild_id = ?`;
            pool.execute(currentStrikeScore, [targetMember.user.id, interaction.guild.id], async (err, csres) => {
                const StrikeScore = csres[0]?.strike_score || 0;

                const PublicLog = gcres[0]?.PublicLog || 0;

                const PublicLogEmbed = new EmbedBuilder()
                .setAuthor({
                    name: `${targetMember.user.username} has been kicked\n**Reason: **${reason}`,
                })
                .setDescription(`**[${StrikeScore} -> Kick]**\n${reason}`)
                .setColor("#f50000")
                .setFooter({
                    text: `ID: ${targetMember.user.id}`,
                })
                .setTimestamp();

                await client.channels.cache.get(PublicLog).send({ embeds: [PublicLogEmbed] });

            })
        })
    },
};
