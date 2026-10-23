const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: "eval",
    description: "DEVELOPPERS ONLY",
    aliases: [],
    permissions: [PermissionsBitField.Flags.Administrator],
    guildOwnerOnly: false,
    botOwnerOnly: true,
    async execute(client, message, args) {
        if (client.config.owners.includes(message.author.id)) return;
        
        let code = ""
        for (let i = 0; i < args.length; i++) {
            code += args[i] + ' '
        }

        try {
            let result = eval(code);
            if (typeof result !== 'string') result = require('util').inspect(result);
            const embed = new EmbedBuilder()
                .setColor(client.config.color)
                .setTitle('✅ Résultat :')
                .setDescription('```js\n' + result + '\n```')
                .setTimestamp()
            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            const embed = new EmbedBuilder()
                .setColor(client.config.color)
                .setTitle('❌ Erreur :')
                .setDescription(`**Erreur :**\`${error.code}\`\n\`\`\`js\n${error.message}\n\`\`\``)
                .setTimestamp()
            await message.channel.send({ embeds: [embed] });
        }
    }
}