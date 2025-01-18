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
        .setName('warn')
        .setDescription('Warn a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addUserOption(option =>
            option
                .setName('member')
                .setDescription('The member to warn')
                .setRequired(true))
        .addNumberOption(option =>
            option
                .setName('strikelevel')
                .setDescription('Add # 1-3 to their current strike score.')
                .setMaxValue(3)
                .setMinValue(1)
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
        const strikelevel = interaction.options.getNumber('strikelevel');

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


            const currentStrikeScore = `SELECT strike_score FROM warnings WHERE user_id = ? AND guild_id = ?`;
            pool.execute(currentStrikeScore, [userId, guildId], async (err, results) => {
                // if (!results) { return };
                const StrikeScore = results[0]?.strike_score || 0;
                const newquery = `REPLACE INTO warnings (user_id,guild_id,strike_score,expiry_date)
                VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))
                `;
                pool.execute(newquery, [userId,guildId,StrikeScore+strikelevel], async (err, newresults) => {
                    if (err) {
                        Logger.error(`Error adding warning: ${err}`);
                        return interaction.reply({
                            content: '❌ Something went wrong while adding the warning.',
                            ephemeral: true
                        });
                    }

                    // Assign strike role based on the updated strike_score
                    await handleStrikes(targetMember, interaction, strikelevel, Strike1Role, Strike2Role, Strike3Role, PublicModLog);

                    const embed = new EmbedBuilder()
                        .setDescription(`✅ ${targetMember.user.tag} has been warned. [${StrikeScore} -> ${StrikeScore+strikelevel}]\n**Reason:** ${reason}`)
                        .setColor("#f50000");

                    interaction.reply({ embeds: [embed] });
                })
            })
        })
    },
};

// Function to handle assigning strike roles
async function handleStrikes(targetMember, interaction, strikelevel, Strike1Role, Strike2Role, Strike3Role, PublicModLog) {
    // Retrieve the count of warnings for the member in the guild
    const query = `
    SELECT strike_score 
    FROM warnings 
    WHERE user_id = ? AND guild_id = ?
`;
pool.execute(query, [targetMember.user.id, targetMember.guild.id], async (err, results) => {
    if (err) {
        Logger.error('Error checking warnings:', err);
        return;
    }

    const strikeScore = results[0]?.strike_score || 0;
    let roleID;
    if (strikeScore >= 1) roleID = Strike1Role;
    if (strikeScore >= 2) roleID = Strike2Role;
    if (strikeScore >= 3) roleID = Strike3Role;

    if (roleID) {
        const role = targetMember.guild.roles.cache.find(r => r.id === roleID);
        if (role) {
            try {
                await targetMember.roles.add(role);
                Logger.success(`${targetMember.user.tag} has been assigned ${roleID}`);

                const PublicLogEmbed = new EmbedBuilder()
                    .setAuthor({
                        name: `${targetMember.user.username} has been warned`,
                    })
                    .setDescription(`**[${strikeScore-strikelevel} -> ${strikeScore}]**\n${interaction.options.getString('reason')} (warned by ${interaction.user})`)
                    .setColor("#ff932e")
                    .setFooter({
                        text: `ID: ${targetMember.user.id}`,
                    })
                    .setTimestamp();

                await client.channels.cache.get(PublicModLog).send({ embeds: [PublicLogEmbed] });

                // Attempt to DM the user
                await targetMember.send({
                    content:`You recived a warning in ${targetMember.guild.name}`,
                    embeds: [PublicLogEmbed],
                }).catch(() => { });
            } catch (err) {
                Logger.error(`Error adding role to ${targetMember.user.tag}:`, err);
            }
        } else {
            Logger.error(`Role ${roleID} not found in the guild.`);
        }
    }
});
}
