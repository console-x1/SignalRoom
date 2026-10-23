const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require("discord.js");
const { buildLocalizations } = require("../utils/commandLocalizations");

module.exports = {
    name: "mention",
    description: "Allow to mention a role without having the required permissions.",
    aliases: [],
    permissions: [PermissionsBitField.Flags.SendMessages],
    guildOwnerOnly: false,
    botOwnerOnly: false,

    async execute(client, message, args, langue) {
        if (!client.guilds.cache.get(message.guild.id).members.cache.get(message.author.id).roles.cache.has('1478200663484665907') && !client.config.channels.newsCategory.includes(message.channel.id))
            return message.reply({ content: langue.commands.mention.noPermission }).catch(() => { });

        if (!args[0])
            return message.reply({ content: langue.commands.mention.noRole }).catch(() => { });
        
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]) || message.guild.roles.cache.find(r => r.name.toLowerCase() === args.slice(0).join(" ").toLowerCase());
        if (!role)
            return message.reply({ content: langue.commands.mention.roleNotFound }).catch(() => { });
        
        if (!role.name.includes('Discord') && !role.name.includes('News')) 
            return message.reply({ content: langue.commands.mention.invalidRole }).catch(() => { });
        
        message.channel.send({ content: `<@&${role.id}>` }).catch(() => { });
    },
    async executeSlash(client, interaction, langue) {
        const role = interaction.options.getRole("role");

        if (!interaction.member.roles.cache.has('1478200663484665907') && !client.config.channels.newsCategory.includes(interaction.channelId))
            return interaction.reply({ content: langue.commands.mention.noPermission, flags: 64 }).catch(() => { });

        if (!role.name.includes('Discord') && !role.name.includes('News')) {
            return interaction.reply({ content: langue.commands.mention.invalidRole, flags: 64 }).catch(() => { });
        }
        interaction.channel.send({ content: `<@&${role.id}>` }).catch(() => { });
        interaction.reply({ content: langue.commands.mention.mentionSent, flags: 64 }).catch(() => { });
    },
    get data() {
        const builder = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description);

        const descLocs = buildLocalizations('commands.mention.commandDescription');
        if (Object.keys(descLocs).length) builder.setDescriptionLocalizations(descLocs);

        builder.addRoleOption(option => {
            option.setName("role")
                .setDescription("The role to mention")
                .setRequired(true);

            const roleDescLocs = buildLocalizations('commands.mention.options.role');
            if (Object.keys(roleDescLocs).length) option.setDescriptionLocalizations(roleDescLocs);
            return option;
        });

        return builder;
    }
}