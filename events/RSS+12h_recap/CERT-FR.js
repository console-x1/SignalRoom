const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const Parser = require("rss-parser");
const parser = new Parser();
const cron = require("node-cron");
const colors = require("colors");
const {
    extractCVEIdentifiers,
    findDuplicateEntry,
    hashSnapshot,
    loadStore,
    saveStore,
    withCyberAlertLock
} = require("../../utils/cyberAlertStore");

const RSS_URLS = [
    "https://www.cert.ssi.gouv.fr/alerte/feed/",
    "https://www.cert.ssi.gouv.fr/avis/feed/"
];
const PAGE_CVE_RECHECK_INTERVAL = 60 * 60 * 1000;
const CERT_FR_HOSTS = new Set([
    "cert.ssi.gouv.fr",
    "www.cert.ssi.gouv.fr",
    "cert.cyber.gouv.fr",
    "www.cert.cyber.gouv.fr"
]);
const TRANSLATION_SEPARATOR = "__CERT_FR_DESCRIPTION_SEPARATOR__";

module.exports = {
    async execute(client, startTime) {
        await checkRSScertFR(client);
        console.log(`[CYBER-1-] Cron des alertes CERT-FR activé en ${Number((Date.now() - startTime)/1000).toFixed(2)}s`.green);

        cron.schedule("0 */5 * * *", async () => {
            await checkRSScertFR(client);
        });
    }
};

function createSnapshot(item) {
    const title = item.title || "Sans titre";
    const description = item.contentSnippet || item.content || item.summary || "Aucune description disponible.";
    const publishedDate = item.isoDate || item.pubDate;
    const publishedAt = publishedDate && !Number.isNaN(new Date(publishedDate).getTime())
        ? new Date(publishedDate).toISOString()
        : null;
    const version = { title, description, publishedAt };

    return {
        ...version,
        vulnerabilityIds: extractCVEIdentifiers(`${title}\n${description}`),
        publishedAt,
        detectedAt: new Date().toISOString(),
        hash: hashSnapshot(version)
    };
}

async function addPageVulnerabilityIds(item, snapshot) {
    if (snapshot.vulnerabilityIds.length || !item.link) {
        return snapshot;
    }

    let pageUrl;
    try {
        pageUrl = new URL(item.link);
    } catch {
        return snapshot;
    }

    if (!CERT_FR_HOSTS.has(pageUrl.hostname)) {
        return snapshot;
    }

    try {
        const response = await axios.get(pageUrl.toString(), {
            timeout: 10000,
            maxContentLength: 2 * 1024 * 1024,
            responseType: "text"
        });
        return {
            ...snapshot,
            vulnerabilityIds: extractCVEIdentifiers(response.data),
            vulnerabilityIdsAttemptedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error(`[CERT-FR] Impossible de lire les CVE de ${pageUrl}:`, error.message);
        return {
            ...snapshot,
            vulnerabilityIdsAttemptedAt: new Date().toISOString()
        };
    }
}

function hasNewVulnerabilityMetadata(previous, snapshot) {
    const previousIds = new Set(previous.vulnerabilityIds || []);
    return (
        (snapshot.vulnerabilityIds || []).some(id => !previousIds.has(id)) ||
        previous.vulnerabilityIdsAttemptedAt !== snapshot.vulnerabilityIdsAttemptedAt
    );
}

async function translateToEnglish(text) {
    const providers = [
        async () => {
            const response = await axios.get(
                "https://api.mymemory.translated.net/get",
                {
                    params: { q: text, langpair: "fr|en" },
                    timeout: 10000
                }
            );
            return response.data.responseData.translatedText;
        },
        async () => {
            const response = await axios.post(
                "https://libretranslate.de/translate",
                { q: text, source: "fr", target: "en", format: "text" },
                { timeout: 10000 }
            );
            return response.data.translatedText;
        },
        async () => {
            const response = await axios.get(
                `https://lingva.ml/api/v1/fr/en/${encodeURIComponent(text)}`,
                { timeout: 10000 }
            );
            return response.data.translation;
        },
        async () => {
            const response = await axios.get(
                "https://simplytranslate.org/api/translate",
                {
                    params: { engine: "google", text, from: "fr", to: "en" },
                    timeout: 10000
                }
            );
            return response.data.translated_text;
        }
    ];
    const errors = [];

    for (const translate of providers) {
        try {
            const translated = await translate();
            if (
                typeof translated === "string" &&
                translated.trim() &&
                translated !== text &&
                translated.includes(TRANSLATION_SEPARATOR)
            ) {
                return translated;
            }
            errors.push("Le service de traduction a renvoyé un résultat vide ou invalide.");
        } catch (error) {
            errors.push(error.message);
        }
    }

    throw new Error(`Tous les services de traduction ont échoué : ${errors.join(" ; ")}`);
}

async function translateSnapshot(snapshot) {
    const text = `${snapshot.title}\n\n${TRANSLATION_SEPARATOR}\n\n${snapshot.description}`;
    const translated = await translateToEnglish(text);
    const separatorIndex = translated.indexOf(TRANSLATION_SEPARATOR);

    if (separatorIndex === -1) {
        throw new Error("Le séparateur entre le titre et la description a été perdu.");
    }

    return {
        ...snapshot,
        title: translated.slice(0, separatorIndex).trim(),
        description: translated.slice(separatorIndex + TRANSLATION_SEPARATOR.length).trim()
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
    return withCyberAlertLock(() => runRSScertFR(client));
}

async function runRSScertFR(client) {
    try {
        const channel = await client.channels.fetch(client.config.channels.cyberSecurity);
        if (!channel) {
            console.error("Error : cyberSecurity channel not found.");
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

            let snapshot = createSnapshot(item);
            const entryKey = getEntryKey(entryUrl);
            const previousKey = [entryUrl, item.id]
                .map(getEntryKey)
                .map(key => Object.keys(store.entries).find(storedKey => getEntryKey(storedKey) === key))
                .find(Boolean);
            const entry = previousKey ? store.entries[previousKey] : null;
            const previousVersion = entry?.versions?.at(-1);
            const previousAttemptAt = Date.parse(previousVersion?.vulnerabilityIdsAttemptedAt || "");
            const pageCveCheckIsDue = (
                !previousAttemptAt ||
                Date.now() - previousAttemptAt >= PAGE_CVE_RECHECK_INTERVAL
            );
            if (
                !snapshot.vulnerabilityIds.length &&
                (
                    !previousVersion ||
                    hashSnapshot(previousVersion) !== snapshot.hash ||
                    (!previousVersion.vulnerabilityIds?.length && pageCveCheckIsDue)
                )
            ) {
                snapshot = await addPageVulnerabilityIds(item, snapshot);
            } else if (!snapshot.vulnerabilityIds.length) {
                snapshot.vulnerabilityIds = previousVersion.vulnerabilityIds || [];
                snapshot.vulnerabilityIdsAttemptedAt = previousVersion.vulnerabilityIdsAttemptedAt;
            }

            if (!entry) {
                const duplicateOf = findDuplicateEntry(store, entryKey, "CERT-FR", snapshot);
                if (duplicateOf) {
                    store.entries[entryKey] = {
                        url: entryUrl,
                        source: "CERT-FR",
                        duplicateOf,
                        firstSeenAt: snapshot.detectedAt,
                        versions: [snapshot]
                    };
                    saveStore(store);
                    console.log(`[CERT-FR] Alerte déjà publiée par une autre source : ${snapshot.title}`);
                    continue;
                }

                const isAlert = entryUrl.includes("/alerte/");
                let translatedSnapshot = snapshot;
                try {
                    translatedSnapshot = await translateSnapshot(snapshot);
                } catch (error) {
                    console.error(`[CERT-FR] Traduction anglaise impossible pour ${entryUrl} :`, error.message);
                }
                const embed = createEmbed(item, translatedSnapshot, isAlert ? 0xFF0000 : 0xFFA500);
                const roleId = client.config.roles.cyberSecurity;

                await channel.send({
                    content: isAlert ? `<@&${roleId}> **🚨 CERT-FR Security Alert 🚨**` : "**⚠️ CERT-FR Security Advisory ⚠️**",
                    embeds: [embed],
                    allowedMentions: { roles: isAlert && roleId ? [roleId] : [] },
                }).then(message => message.crosspost());

                store.entries[entryKey] = {
                    url: entryUrl,
                    source: "CERT-FR",
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
            } else if (entry.duplicateOf) {
                const latestVersion = entry.versions.at(-1);
                if (
                    hashSnapshot(latestVersion) !== snapshot.hash ||
                    hasNewVulnerabilityMetadata(latestVersion, snapshot)
                ) {
                    entry.versions.push(snapshot);
                    saveStore(store);
                }
            } else if (
                hashSnapshot(entry.versions.at(-1)) === snapshot.hash &&
                hasNewVulnerabilityMetadata(entry.versions.at(-1), snapshot)
            ) {
                entry.versions.push(snapshot);
                saveStore(store);
            } else if (hashSnapshot(entry.versions.at(-1)) !== snapshot.hash) {
                let translatedSnapshot = snapshot;
                try {
                    translatedSnapshot = await translateSnapshot(snapshot);
                } catch (error) {
                    console.error(`[CERT-FR] Traduction anglaise impossible pour ${entryUrl} :`, error.message);
                }
                const embed = createEmbed(item, translatedSnapshot, 0x5865F2);

                await channel.send({
                    content: "**🔄 CERT-FR Update**",
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
