const {
    SlashCommandBuilder,
} = require('discord.js');
const createConfig = require('../../functions/create_config');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/database.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adddemotionexception')
        .setDescription('Adds a player to be excluded from demotion checks.')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The name of the player you want to be exemept from demotion checks.')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({
            ephemeral: true,
        });

        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '..', '..', 'configs', `${guildId}.json`);

        try {
            let config = {};

            if (fs.existsSync(filePath)) {
                const fileData = fs.readFileSync(filePath, 'utf-8');
                config = JSON.parse(fileData);
            } else {
                await createConfig(interaction.client, guildId);

                const fileData = fs.readFileSync(filePath, 'utf-8');
                config = JSON.parse(fileData);
            }

            const adminRoleId = config.adminRole;
            const memberRoles = interaction.member.roles.cache;

            if ((interaction.member.id !== interaction.member.guild.ownerId) && (!memberRoles.has(adminRoleId) && interaction.member.roles.highest.position < interaction.guild.roles.cache.get(adminRoleId).position)) {
                await interaction.editReply('You do not have the required permissions to run this command.');
                return;
            }

            const guildName = config.guildName;

            if (!guildName) {
                await interaction.editReply({
                    content: 'The server you are in does not have a guild set.',
                    ephemeral: true,
                });
                return;
            }

            const username = interaction.options.getString('username');

            return new Promise((resolve, reject) => {
                db.all(
                    'SELECT username FROM players WHERE username = ? AND guildName = ?', [username, guildName],
                    async (err, row) => {
                        if (err) {
                            console.error('Error retrieving player data:', err);
                            reject(err);
                            return;
                        }

                        if (row.length > 0) {
                            if (!config['demotionExceptions']) {
                                config['demotionExceptions'] = [];
                            }

                            if (config['demotionExceptions'].includes(username)) {
                                await interaction.editReply({
                                    content: `${username} is already exempt from demotions`,
                                    ephemeral: true,
                                });
                                return;
                            }

                            config['demotionExceptions'].push(username);

                            fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');

                            await interaction.editReply({
                                content: `${username} is now exempt from demotions`,
                                ephemeral: true,
                            });
                            return;
                        } else {
                            await interaction.editReply({
                                content: `${username} is not a member of ${guildName}`,
                                ephemeral: true,
                            });
                            return;
                        }
                    },
                );
            });
        } catch (error) {
            console.log(error);
            await interaction.editReply('Error adding demotion exception.');
            return;
        }

        
    },
};
