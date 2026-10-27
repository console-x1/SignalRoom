const { EmbedBuilder } = require("discord.js");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const Parser = require("rss-parser");
const parser = new Parser();
const cron = require("node-cron");
const colors = require("colors");

const RSS_URLS = [
    "https://www.cert.ssi.gouv.fr/alerte/feed/",
    "https://www.cert.ssi.gouv.fr/avis/feed/"
];
const CERT_FR_HOSTS = new Set([
    "cert.ssi.gouv.fr",
    "www.cert.ssi.gouv.fr",
    "cert.cyber.gouv.fr",
    "www.cert.cyber.gouv.fr"
]);
const DB_FILE = path.resolve(__dirname, "..", "..", "database", "sent_CERT-FR.json");

module.exports = {
    async execute(client, startTime) {
        await checkRSScertFR(client);
        console.log(`[CYBER---] Cron des alertes CERT-FR activé en ${Number((Date.now() - startTime)/1000).toFixed(2)}s`.green);

        cron.schedule("0 */5 * * *", async () => {
            await checkRSScertFR(client);
        });
    }
};

function loadStore() {
    if (!fs.existsSync(DB_FILE)) {
        return { version: 1, entries: {} };
    }

    let stored;
    try {
        stored = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } catch (error) {
        throw new Error(`Impossible de lire ${DB_FILE}: ${error.message}`);
    }

    if (Array.isArray(stored)) {
        const entries = {};
        for (const url of stored) {
            if (typeof url !== "string") {
                throw new Error(`Format invalide dans ${DB_FILE}: les anciennes entrées doivent être des liens.`);
            }
            entries[url] = { url, firstSeenAt: null, versions: [] };
        }
        return { version: 1, entries };
    }

    if (stored?.version !== 1 || !stored.entries || typeof stored.entries !== "object" || Array.isArray(stored.entries)) {
        throw new Error(`Format invalide dans ${DB_FILE}: un journal CERT-FR versionné est attendu.`);
    }

    return stored;
}

function saveStore(store) {
    const temporaryFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(store, null, 2));
    fs.renameSync(temporaryFile, DB_FILE);
}

function createSnapshot(item) {
    const title = (item.title || "Sans titre").replace("Màj", "Update");
    const description = item.contentSnippet || item.content || item.summary || "No description available.";
    const publishedDate = item.isoDate || item.pubDate;
    const publishedAt = publishedDate && !Number.isNaN(new Date(publishedDate).getTime())
        ? new Date(publishedDate).toISOString()
        : null;
    const version = { title, description, publishedAt };

    return {
        ...version,
        publishedAt,
        detectedAt: new Date().toISOString(),
        hash: crypto.createHash("sha256").update(JSON.stringify(version)).digest("hex")
    };
}

function getEntryKey(value) {
    try {
        const url = new URL(value);
        if (CERT_FR_HOSTS.has(url.hostname)) {
            const pathname = url.pathname.replace(/\/+$/, "");
            return `https://www.cert.ssi.gouv.fr${pathname}`;
        }
    } catch {
        // RSS identifiers are not necessarily URLs.
    }

    return value;
}

function createEmbed(item, snapshot, color) {
    const embed = new EmbedBuilder()
        .setTitle(snapshot.title)
        .setURL(item.link)
        .setDescription(snapshot.description.replace(/\*\*\[/gi, "\n\n**"))
        .setColor(color)
        .setFooter({ text: "Source: CERT-FR" });

    if (snapshot.publishedAt) {
        embed.setTimestamp(new Date(snapshot.publishedAt));
    }

    return embed;
}

async function checkRSScertFR(client) {
    try {
        const channel = await client.channels.fetch(client.config.channels.certFR);
        if (!channel) {
            console.error("Error : certFR channel not found.");
            return;
        }

        const store = loadStore();
        const allItems = [];

        for (const url of RSS_URLS) {
            try {
                const feed = await parser.parseURL(url);
                allItems.push(...feed.items);
            } catch (error) {
                console.error(`Erreur sur le flux ${url} :`, error.message);
            }
        }

        allItems.sort((a, b) => new Date(a.pubDate) - new Date(b.pubDate));

        for (const item of allItems) {
            const entryUrl = item.link || item.id;
            if (!entryUrl) {
                console.error("[CERT-FR] Élément RSS ignoré : aucun lien ni identifiant.");
                continue;
            }

            const snapshot = createSnapshot(item);
            const entryKey = getEntryKey(entryUrl);
            const previousKey = [entryUrl, item.id]
                .map(getEntryKey)
                .map(key => Object.keys(store.entries).find(storedKey => getEntryKey(storedKey) === key))
                .find(Boolean);
            const entry = previousKey ? store.entries[previousKey] : null;

            if (!entry) {
                const isAlert = entryUrl.includes("/alerte/");
                const embed = createEmbed(item, snapshot, isAlert ? 0xFF0000 : 0xFFA500);
                const roleId = client.config.roles.certFR;

                await channel.send({
                    content: isAlert ? `<@&${roleId}> **🚨 CERT-FR Alert 🚨**` : "**⚠️ CERT-FR Avis ⚠️**",
                    embeds: [embed],
                    allowedMentions: { roles: isAlert && roleId ? [roleId] : [] }
                });

                store.entries[entryKey] = {
                    url: entryUrl,
                    firstSeenAt: snapshot.detectedAt,
                    versions: [snapshot]
                };
                saveStore(store);

                if (isAlert) {
                    console.log(`[CERT-FR] 🚨 ALERT: ${snapshot.title} - ${entryUrl}`.red);
                }

                await new Promise(resolve => setTimeout(resolve, 800));
            } else if (!entry.versions.length) {
                entry.url = entryUrl;
                entry.versions.push(snapshot);
                if (previousKey !== entryKey) {
                    delete store.entries[previousKey];
                    store.entries[entryKey] = entry;
                }
                saveStore(store);
            } else if (entry.versions.at(-1).hash !== snapshot.hash) {
                const embed = createEmbed(item, snapshot, 0x5865F2);

                await channel.send({
                    content: "**🔄 Update CERT-FR**",
                    embeds: [embed],
                    allowedMentions: { parse: [] }
                });

                entry.url = entryUrl;
                entry.versions.push(snapshot);
                if (previousKey !== entryKey) {
                    delete store.entries[previousKey];
                    store.entries[entryKey] = entry;
                }
                saveStore(store);
                console.log(`[CERT-FR] 🔄 Update: ${snapshot.title} - ${entryUrl}`.blue);

                await new Promise(resolve => setTimeout(resolve, 800));
            }

        }
    } catch (error) {
        console.error("Erreur générale lors de la vérification CERT-FR :", error);
    }
}
