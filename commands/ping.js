const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require("discord.js");
const { buildLocalizations } = require("../utils/commandLocalizations");

module.exports = {
    name: "ping",
    description: "Afficher le ping du bot.",
    aliases: [],
    permissions: [PermissionsBitField.Flags.ViewChannel],
    guildOwnerOnly: false,
    botOwnerOnly: false,

    async execute(client, message, args, langue) {
        message.reply({ embeds: [new EmbedBuilder().setTitle(langue.commands.ping.title).setDescription(langue.commands.ping.description.replace("{ping}", client.ws.ping))] }).catch(() => {});
    },
    async executeSlash(client, interaction, langue) {
        interaction.reply({ embeds: [new EmbedBuilder().setTitle(langue.commands.ping.title).setDescription(langue.commands.ping.description.replace("{ping}", client.ws.ping))] }).catch(() => {});
    },
    get data() {
        const builder = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description);

        const descLocs = buildLocalizations('commands.ping.commandDescription');
        if (Object.keys(descLocs).length) builder.setDescriptionLocalizations(descLocs);

        return builder;
    }
}