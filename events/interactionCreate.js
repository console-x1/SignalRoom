const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { loadLocale, loadUserLocale, getAvailableLocales } = require("../utils/locales");
const db = require("../utils/db");
const log = require("../utils/logger");

module.exports = {
    name: "interactionCreate",
    async execute(client, interaction) {
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            const blacklist = await db.findOne("blacklist", { userId: interaction.user.id });
            if (blacklist) return;

            const userLang = await loadUserLocale(interaction.user.id, interaction.guildId);
            if (!userLang) {
                const locales = getAvailableLocales();
                const select = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("language_select")
                        .setPlaceholder(loadLocale(interaction.guild.preferredLocale).lang.selectDefault)
                        .addOptions(
                            {
                                label: loadLocale(interaction.guild.preferredLocale).lang.selectDefault,
                                value: "__default__",
                                default: true,
                                emoji: "📍"
                            },
                            ...locales.map(locale => ({
                                emoji: loadLocale(locale).flag,
                                label: locale.toUpperCase(),
                                value: locale,
                                default: false
                            }))
                        )
                );
                await interaction.reply({
                    content: loadLocale(interaction.guild.preferredLocale).lang.ask,
                    components: [select]
                });
                return;
            }
            const langue = userLang ?? loadLocale(interaction.guild.preferredLocale);

            if (command.botOwnerOnly)
                if (!client.config.owners.includes(interaction.user.id)) return interaction.reply({ embeds: [new EmbedBuilder().setTitle(langue.error.title).setDescription(langue.error.botOwnerOnly).setColor("#ff0000")], flags: 64 });
            if (command.guildOwnerOnly)
                if (interaction.guild.ownerId != interaction.user.id && !client.config.owners.includes(interaction.user.id)) return interaction.reply({ embeds: [new EmbedBuilder().setTitle(langue.error.title).setDescription(langue.error.guildOwnerOnly).setColor("#ff0000")], flags: 64 });

            if (command.permissions?.length) {
                const authorPerms = interaction.channel.permissionsFor(interaction.user);
                if (!authorPerms.has(command.permissions) && !client.config.owners.includes(interaction.user.id)) return interaction.reply({ embeds: [new EmbedBuilder().setTitle(langue.error.title).setDescription(langue.error.permsOnly.replace("{perms}", command.permissions.join(", "))).setColor("#ff0000")], flags: 64 });
            }

            command.executeSlash(client, interaction, langue).then(() => {
                log(`[${langue.flag}] ${interaction.guild.name} | ${interaction.channel.name} | ${interaction.user.tag} | ${command.name}`.green, client);
                console.log(`[CMD] - [${langue.flag}]`.blue, `${interaction.guild.name} | ${interaction.channel.name} | ${interaction.user.tag} | ${command.name}`.grey);
            }).catch(err => {
                interaction.reply({ embeds: [new EmbedBuilder().setTitle(langue.error.title).setDescription(langue.error.default).setColor("#ff0000")], flags: 64 }).catch(() => { });
                log(`[ERROR] ${interaction.guild.name} | ${interaction.channel.name} | ${interaction.user.tag} | ${command.name} :\n${err.message}`.red + `\n\nStack Trace:\n${err.stack}`.blue, client);
                console.error(`[CMD ERROR] - [${langue.flag}]`.red, `${interaction.guild.name} | ${interaction.channel.name} | ${interaction.user.tag} | ${command.name}`.grey, err);
            });
        }
    }
}