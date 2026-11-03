const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DB_FILE = path.resolve(__dirname, "..", "database", "sent_CERT-FR.json");
const CVE_PATTERN = /\bCVE-\d{4}-\d{4,}\b/gi;

let operationQueue = Promise.resolve();

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
        throw new Error(`Format invalide dans ${DB_FILE}: un journal d'alertes versionné est attendu.`);
    }

    return stored;
}

function saveStore(store) {
    const temporaryFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(store, null, 2));
    fs.renameSync(temporaryFile, DB_FILE);
}

function getSnapshotKeys(snapshot) {
    const text = `${snapshot.title || ""}\n${snapshot.description || ""}`;
    const cves = new Set([
        ...(text.match(CVE_PATTERN) || []),
        ...(snapshot.vulnerabilityIds || [])
    ].map(cve => cve.toUpperCase()));
    const normalizedTitle = (snapshot.title || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/^\s*\[(?:maj|update)\]\s*/i, "")
        .replace(/\b(?:security advisory|security alert|avis de securite|alerte de securite)\b/gi, "")
        .replace(/[^a-z0-9]+/gi, " ")
        .trim()
        .toLowerCase();

    return { cves, normalizedTitle };
}

function findDuplicateEntry(store, entryKey, source, snapshot) {
    const currentKeys = getSnapshotKeys(snapshot);
    if (currentKeys.cves.size === 0 && !currentKeys.normalizedTitle) {
        return null;
    }

    for (const [storedKey, entry] of Object.entries(store.entries)) {
        if (storedKey === entryKey || (entry.source || "CERT-FR") === source) {
            continue;
        }

        for (const version of entry.versions || []) {
            const storedKeys = getSnapshotKeys(version);
            if ([...currentKeys.cves].some(cve => storedKeys.cves.has(cve))) {
                return storedKey;
            }

            if (
                currentKeys.cves.size === 0 &&
                storedKeys.cves.size === 0 &&
                currentKeys.normalizedTitle &&
                currentKeys.normalizedTitle === storedKeys.normalizedTitle
            ) {
                return storedKey;
            }
        }
    }

    return null;
}

function hasEntriesFromSource(store, source) {
    return Object.values(store.entries).some(entry => entry.source === source);
}

function hashSnapshot(snapshot) {
    const title = (snapshot.title || "").replace(/^\s*\[(?:màj|update)\]\s*/i, "").trim();
    const version = { title, description: snapshot.description, publishedAt: snapshot.publishedAt };
    return crypto.createHash("sha256").update(JSON.stringify(version)).digest("hex");
}

function extractCVEIdentifiers(text) {
    return [...new Set((String(text).match(CVE_PATTERN) || []).map(cve => cve.toUpperCase()))];
}

function withCyberAlertLock(operation) {
    const result = operationQueue.then(operation);
    operationQueue = result.then(() => undefined, () => undefined);
    return result;
}

module.exports = {
    findDuplicateEntry,
    extractCVEIdentifiers,
    hasEntriesFromSource,
    hashSnapshot,
    loadStore,
    saveStore,
    withCyberAlertLock
};
