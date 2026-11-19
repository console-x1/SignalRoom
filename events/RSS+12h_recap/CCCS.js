const { EmbedBuilder } = require("discord.js");
const Parser = require("rss-parser");
const cron = require("node-cron");
const colors = require("colors");
const {
    findDuplicateEntry,
    hasEntriesFromSource,
    hashSnapshot,
    loadStore,
    saveStore,
    withCyberAlertLock
} = require("../../utils/cyberAlertStore");

const RSS_URL = "https://www.cyber.gc.ca/api/cccs/atom/v1/get?feed=alerts_advisories&lang=en";
const parser = new Parser({ timeout: 15000 });

module.exports = {
    async execute(client, startTime) {
        await checkCCCS(client);
        console.log(`[CYBER-2-] Cron du Centre Canadien pour la CyberSécurité activé en ${Number((Date.now() - startTime) / 1000).toFixed(2)}s`.green);

        cron.schedule("0 */5 * * *", async () => {
            await checkCCCS(client);
        });
    }
};

function createSnapshot(item) {
    const title = item.title || "Untitled advisory";
    const description = item.contentSnippet || item.summary || item.content || "No description available.";
    const publishedDate = item.isoDate || item.updated || item.pubDate;
    const publishedAt = publishedDate && !Number.isNaN(new Date(publishedDate).getTime())
        ? new Date(publishedDate).toISOString()
        : null;
    const version = { title, description, publishedAt };

    return {
        ...version,
        detectedAt: new Date().toISOString(),
        hash: hashSnapshot(version)
    };
}

function getEntryKey(value) {
    try {
        const url = new URL(value);
        url.hash = "";
        url.search = "";
        return url.toString().replace(/\/+$/, "");
    } catch {
        return value;
    }
}

function createEmbed(item, snapshot, isUpdate = false) {
    const embed = new EmbedBuilder()
        .setTitle(snapshot.title.slice(0, 256))
        .setURL(item.link)
        .setDescription(snapshot.description.replace(/<[^>]*>/g, "").slice(0, 4096))
        .setColor(isUpdate ? 0x5865F2 : 0xFF0000)
        .setFooter({ text: "Source: Canadian Centre for Cyber Security" });

    if (snapshot.publishedAt) {
        embed.setTimestamp(new Date(snapshot.publishedAt));
    }

    return embed;
}

async function checkCCCS(client) {
    return withCyberAlertLock(() => runCCCS(client));
}

async function runCCCS(client) {
    try {
        const channel = await client.channels.fetch(client.config.channels.cyberSecurity);
        if (!channel) {
            console.error("[CCCS] Canal de cybersécurité introuvable.");
            return;
        }

        const feed = await parser.parseURL(RSS_URL);
        const store = loadStore();
        const items = [...feed.items].sort((a, b) => new Date(a.isoDate || a.updated || 0) - new Date(b.isoDate || b.updated || 0));
        const isInitialSync = !hasEntriesFromSource(store, "CCCS");
        let initializedCount = 0;

        for (const item of items) {
            const entryUrl = item.link || item.id;
            if (!entryUrl) {
                console.error("[CCCS] Élément Atom ignoré : aucun lien ni identifiant.");
                continue;
            }

            const snapshot = createSnapshot(item);
            const entryKey = getEntryKey(entryUrl);
            const entry = store.entries[entryKey];

            if (!entry) {
                const duplicateOf = findDuplicateEntry(store, entryKey, "CCCS", snapshot);
                if (duplicateOf) {
                    store.entries[entryKey] = {
                        url: entryUrl,
                        source: "CCCS",
                        duplicateOf,
                        firstSeenAt: snapshot.detectedAt,
                        versions: [snapshot]
                    };
                    saveStore(store);
                    console.log(`[CCCS] Alerte déjà publiée par une autre source : ${snapshot.title}`);
                    continue;
                }

                if (isInitialSync) {
                    store.entries[entryKey] = {
                        url: entryUrl,
                        source: "CCCS",
                        firstSeenAt: snapshot.detectedAt,
                        versions: [snapshot]
                    };
                    saveStore(store);
                    initializedCount++;
                    continue;
                }

                await channel.send({
                    content: "**🚨 Canadian Cyber Security Advisory 🚨**",
                    embeds: [createEmbed(item, snapshot)],
                    allowedMentions: { parse: [] }
                }).then(message => message.crosspost());

                store.entries[entryKey] = {
                    url: entryUrl,
                    source: "CCCS",
                    firstSeenAt: snapshot.detectedAt,
                    versions: [snapshot]
                };
                saveStore(store);
                console.log(`[CCCS] 🚨 ${snapshot.title} - ${entryUrl}`.red);
                await new Promise(resolve => setTimeout(resolve, 800));
            } else if (entry.duplicateOf) {
                if (hashSnapshot(entry.versions.at(-1)) !== snapshot.hash) {
                    entry.versions.push(snapshot);
                    saveStore(store);
                }
            } else if (hashSnapshot(entry.versions.at(-1)) !== snapshot.hash) {
                await channel.send({
                    content: "**🔄 Canadian Cyber Security Advisory Update**",
                    embeds: [createEmbed(item, snapshot, true)],
                    allowedMentions: { parse: [] }
                });

                entry.url = entryUrl;
                entry.versions.push(snapshot);
                saveStore(store);
                console.log(`[CCCS] 🔄 ${snapshot.title} - ${entryUrl}`.blue);
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }

        if (isInitialSync && initializedCount > 0) {
            console.log(`[CCCS] Initialisation : ${initializedCount} alertes existantes enregistrées sans publication.`);
        }
    } catch (error) {
        console.error("[CCCS] Erreur lors de la vérification des alertes :", error);
    }
}
