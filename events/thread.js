const db = require("../utils/db");

module.exports = {
    name: "messageCreate",
    async execute(client, message) {
        if (!message.inGuild() || message.author.bot) return;

        const blacklist = await db.findOne("blacklist", { userId: message.author.id });
        if (blacklist) return;

        const prefixRow = await db.findOne("guilds", { guildId: message.guild.id }, "prefix");
        const prefix = prefixRow?.prefix;

        message.guild.prefix = prefix || client.config.prefix;
        if (message.content.startsWith(message.guild.prefix)) return;

        if (client.config.channels.newsCategory.includes(message.channel.parentId)) {
            message.react("🔼").catch(() => { });
            message.react("➖").catch(() => { });
            message.react("🔽").catch(() => { });
            const thread = await message.startThread({
                name: message.content.split("\n")[0].slice(0, 50).replace(/[*_`#~]/g, '') || "Thread for news discussion",
                autoArchiveDuration: 24 * 60,
                reason: message.content.split("\n")[0].slice(0, 150) || "Thread for news discussion"
            });

            await thread.setRateLimitPerUser(10);

            thread.send({ content: `**This thread was created automatically; please communicate respectfully and follow the <#1478206936422944829>.**\n\n_ _` }).catch(() => { });
        }
    }
}