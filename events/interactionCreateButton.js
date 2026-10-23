const { EmbedBuilder } = require("discord.js");
const db = require("../utils/db.js");
const { loadLocale } = require("../utils/locales.js");
const log = require("../utils/logger.js");

module.exports = {
    name: "interactionCreate",
    async execute(client, interaction) {
        try {
            // Only handle select menus and buttons here
            if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

            const customId = interaction.customId;

            if (customId == "language_select") {

                const selectedLang = interaction.values[0];
                if (selectedLang === "__default__") return;

                let originalMessage = await interaction.channel.messages.fetch(
                    interaction.message.reference?.messageId
                )?.author?.id.catch(() => null);
                if (!originalMessage) originalMessage = interaction.user.id;

                await db.update("users", { lang: selectedLang }, { userId: interaction.user.id, guildId: interaction.guild.id });

                await interaction.update({
                    content: `${loadLocale(selectedLang).lang.confirm} **${selectedLang.toUpperCase()}**.`,
                    components: []
                });
            }


        } catch (err) {
            console.error('interactionCreate handler error:', err);
            try {
                if (!interaction.replied && !interaction.deferred) await interaction.reply({ embeds: [new EmbedBuilder().setTitle(loadLocale(interaction.guild.preferredLocale).error.title).setDescription(loadLocale(interaction.guild.preferredLocale).error.defaultInteraction)], flags: 64 });
            } catch (e) {
                console.error('Failed to reply to interaction error:', e);
            }
        }
    },
};
