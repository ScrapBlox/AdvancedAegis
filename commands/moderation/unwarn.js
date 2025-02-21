const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mysql = require('mysql2');
const { Logger } = require('term-logger');
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
        .setName('unwarn')
        .setDescription('Removes warnings from a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addUserOption(option =>
            option
                .setName('member')
                .setDescription('Remove warnings from this person')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(true)),
    async execute(interaction) {
        const targetMember = interaction.options.getMember('member');
        const reason = interaction.options.getString('reason');
        const guildId = targetMember.guild.id;
        const userId = targetMember.user.id;

        // Get guild's strike roles
        const GetConfigQuery = `SELECT * FROM guild_configs WHERE guild_id = ?`;
        pool.execute(GetConfigQuery, [guildId], async (err, results) => {
            if (err) {
                Logger.error('Error getting guild config:',err);
            }

            const Strike1Role = results[0]?.strike1 || 0; 
            const Strike2Role = results[0]?.strike2 || 0; 
            const Strike3Role = results[0]?.strike3 || 0; 
            const PublicModLog = results[0]?.PublicLog || 0;

            const STRIKE_ROLES = {
                1: Strike1Role,
                2: Strike2Role,
                3: Strike3Role,
            };

            const currentStrikeScore = `DELETE FROM warnings WHERE user_id = ? AND guild_id = ?`;

            pool.execute(currentStrikeScore, [userId, guildId], async (err, results) => {
                // if (!results) { return };

                // Remove strike roles
                // await handleStrikes(targetMember, interaction, strikelevel, Strike1Role, Strike2Role, Strike3Role, PublicModLog);
                for (const roleId of Object.values(STRIKE_ROLES)) {
                    if (roleId && member.roles.cache.has(roleId)) {
                        await member.roles.remove(roleId).catch(err =>
                            Logger.error(`Failed to remove role ${roleId} from ${member.user.tag}:`, err)
                        );
                        Logger.success(`Removed role ${roleId} from ${member.user.tag}`);
                    }
                }

                const embed = new EmbedBuilder()
                    .setDescription(`✅ Removed warnings from ${targetMember.user.tag}\n**Reason:** ${reason}`)
                    .setColor("#f50000");

                interaction.reply({ embeds: [embed] });
            })
        })
    },
};
