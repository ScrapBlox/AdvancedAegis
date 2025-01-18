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
        .setName('ban')
        .setDescription('Bans a member from the Discord server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option
                .setName('member')
                .setDescription('Member to ban')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The reason for banning')),
    async execute(interaction) {
        const targetMember = interaction.options.getMember('member'); // Get member to ban
        const reason = `${interaction.options.getString('reason')} (banned by > ${interaction.user})` || `No reason provided (banned by > ${interaction.user})`;
        const guildName = interaction.guild.name;

        if (!targetMember) {
            return await interaction.reply({
                content: '❌ Unable to find the specified member.',
                ephemeral: true
            });
        }

        if (!targetMember.bannable) {
            return await interaction.reply({
                content: '❌ A greater force is preventing me from banning that user.',
                ephemeral: true
            });
        }

        // Attempt to DM the user
        await targetMember.send(`You have been banned from **${guildName}**.\n**Reason:** ${reason}`).catch(() => { });

        // Finish Him
        targetMember.ban({reason});

        // Confirmation embed
        const embed = new EmbedBuilder()
            .setDescription(`✅ **${targetMember.user.tag}** has been banned.`)
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
                            name: `${targetMember.user.username} has been banned\n**Reason: **${reason}`,
                        })
                        .setDescription(`**[${StrikeScore} -> Ban]**\n${reason}`)
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
