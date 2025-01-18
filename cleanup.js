const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const mysql = require('mysql2');
const { Logger } = require('term-logger');
require('dotenv').config();

// Create a MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Schedule the task to run every minute for testing (adjust as needed for production)
cron.schedule('* * * * *', async () => {
    Logger.info('Running cleanup job to adjust roles and remove expired warnings...');

    try {
        // Step 1: Fetch all guild configurations
        const guildConfigQuery = `SELECT * FROM guild_configs`;
        const [guildConfigs] = await pool.promise().query(guildConfigQuery);

        for (const config of guildConfigs) {
            const { guild_id, strike1, strike2, strike3, PublicLog } = config;

            const STRIKE_ROLES = {
                1: strike1,
                2: strike2,
                3: strike3,
            };

            // Step 2: Fetch all warnings for the current guild
            const warningsQuery = `
                SELECT user_id, strike_score, expiry_date 
                FROM warnings 
                WHERE guild_id = ? AND expiry_date < NOW()
            `;
            const [expiredWarnings] = await pool.promise().query(warningsQuery, [guild_id]);

            for (const { user_id, strike_score } of expiredWarnings) {
                // Step 3: Fetch the guild and member
                const guild = await global.client.guilds.fetch(guild_id).catch(() => null);
                if (!guild) {
                    Logger.warn(`Guild ${guild_id} not found or bot not in guild.`);
                    continue;
                }

                const member = await guild.members.fetch(user_id).catch(() => null);
                if (!member) {
                    Logger.warn(`Member ${user_id} not found in guild ${guild_id}.`);
                    continue;
                }

                // Step 4: Remove all strike roles from the member
                for (const roleId of Object.values(STRIKE_ROLES)) {
                    if (roleId && member.roles.cache.has(roleId)) {
                        await member.roles.remove(roleId).catch(err =>
                            Logger.error(`Failed to remove role ${roleId} from ${member.user.tag}:`, err)
                        );
                        Logger.success(`Removed role ${roleId} from ${member.user.tag}`);
                    }
                }

                // Step 5: Log the action in the public log channel
                const PublicLogEmbed = new EmbedBuilder()
                    .setAuthor({ name: `${member.user.username} | All warnings expired` })
                    .setDescription(`**All warnings expired.**\nStrike level reset to 0.`)
                    .setColor("#3cff2e")
                    .setFooter({ text: `ID: ${member.user.id}` })
                    .setTimestamp();

                const logChannel = global.client.channels.cache.get(PublicLog);
                if (logChannel) {
                    await logChannel.send({ embeds: [PublicLogEmbed] }).catch(err =>
                        Logger.error(`Failed to send log to channel ${PublicLog}:`, err)
                    );
                } else {
                    Logger.warn(`Public log channel ${PublicLog} not found for guild ${guild_id}.`);
                }
            }

            // Step 6: Delete expired warnings for the current guild
            const deleteQuery = 'DELETE FROM warnings WHERE guild_id = ? AND expiry_date < NOW()';
            const [deleteResults] = await pool.promise().query(deleteQuery, [guild_id]);
            Logger.info(`Expired warnings deleted for guild ${guild_id}: ${deleteResults.affectedRows}`);
        }
    } catch (err) {
        Logger.error('Error during cleanup job:', err);
    }
});
