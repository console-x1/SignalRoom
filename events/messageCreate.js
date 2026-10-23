const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { loadLocale, loadUserLocale, getAvailableLocales } = require("../utils/locales");
const db = require("../utils/db");
const log = require("../utils/logger");

module.exports = {
    name: "messageCreate",
    async execute(client, message) {
        if (!message.inGuild() || message.author.bot) return;

        const blacklist = await db.findOne("blacklist", { userId: message.author.id });
        if (blacklist) return;

        const prefixRow = await db.findOne("guilds", { guildId: message.guild.id }, "prefix");
        const prefix = prefixRow?.prefix;

        message.guild.prefix = prefix || client.config.prefix;
        if (!message.content.startsWith(message.guild.prefix)) return;

        const userLang = await loadUserLocale(message.author.id, message.guild.id);
        if (!userLang) {
            const locales = getAvailableLocales();
            const select = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("language_select")
                    .setPlaceholder(loadLocale(message.guild.preferredLocale).lang.selectDefault)
                    .addOptions(
                        {
                            label: loadLocale(message.guild.preferredLocale).lang.selectDefault,
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
            await message.reply({
                content: loadLocale(message.guild.preferredLocale).lang.ask,
                components: [select]
            });
            return;
        }
        const langue = userLang ?? loadLocale(message.guild.preferredLocale);

        const args = message.content.slice(client.config.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = client.commands.get(commandName) || client.commands.find(command => command.aliases && command.aliases.includes(commandName));
        if (!command || !command.execute) return;

        if (command.botOwnerOnly)
            if (!client.config.owners.includes(message.author.id)) return message.reply({ embeds: [new EmbedBuilder().setTitle(langue.error.title).setDescription(langue.error.botOwnerOnly).setColor("#ff0000")] }).catch(() => { });
        if (command.guildOwnerOnly)
            if (message.guild.ownerId != message.author.id && !client.config.owners.includes(message.author.id)) return message.reply({ embeds: [new EmbedBuilder().setTitle(langue.error.title).setDescription(langue.error.guildOwnerOnly).setColor("#ff0000")] }).catch(() => { });

        if (command.permissions?.length) {
            const authorPerms = message.channel.permissionsFor(message.author) || message.member.permissions;
            const permsNames = command.permissions
                .map(p => new PermissionsBitField(p).toArray().join(", "))
                .join(", ");

            if (!authorPerms.has(command.permissions) && !client.config.owners.includes(message.author.id)) return message.reply({ embeds: [new EmbedBuilder().setTitle(langue.error.title).setDescription(langue.error.permsOnly.replace("{perms}", permsNames)).setColor("#ff0000")] }).catch(() => { });
        };

        command.execute(client, message, args, langue).then(() => {
            log(`[${langue.flag}] ${message.guild.name} | ${message.channel.name} | ${message.author.tag} | ${command.name}`.green, client);
            console.log(`[CMD] - [${langue.flag}]`.blue, `${message.guild.name} | ${message.channel.name} | ${message.author.tag} | ${command.name}`.grey);
        }).catch(err => {
            message.reply({ embeds: [new EmbedBuilder().setTitle(langue.error.title).setDescription(langue.error.default).setColor("#ff0000")] }).catch(() => { });
            log(`[ERROR] ${message.guild.name} | ${message.channel.name} | ${message.author.tag} | ${command.name} :\n${err.message}`.red + `\n\nStack Trace:\n${err.stack}`.blue, client);
            console.error(`[CMD ERROR] - [${langue.flag}]`.red, `${message.guild.name} | ${message.channel.name} | ${message.author.tag} | ${command.name}`.grey, err);
        });
    }
}