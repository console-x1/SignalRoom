const db = require("../utils/db");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        console.log(`[READY] ${client.user.tag} est prêt | ${client.guilds.cache.size ?? 0} serveurs | ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} utilisateurs`.green);

        const guilds = client.guilds.cache;
        for (const guild of guilds.values()) {
            await db.insertOrIgnore("guilds", { guildId: guild.id, prefix: client.config.prefix });
        }
    }
}