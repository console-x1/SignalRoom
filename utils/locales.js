const fs = require('fs')
const path = require('path')
const db = require('./db.js');

async function loadUserLocale(userId, guildId) {
    const userLang = await db.findOne("users", { userId, guildId }, "lang");
    if (userLang && userLang.lang) {
        return loadLocale(userLang.lang);
    }
    return null;
}

function loadLocale(language) {
    language = language.slice(0, 2)
    const localePath = path.join(__dirname, '..', 'locales', `${language}.json`);

    if (fs.existsSync(localePath)) {
        const localeData = JSON.parse(fs.readFileSync(localePath, 'utf8'));
        return localeData;
    } else {
        console.log(`Locale pour ${language} non trouvée, utilisation du FR par défaut.`.yellow);
        return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'locales', 'fr.json'), 'utf8'));
    }
}

function getAvailableLocales() {
    const localesPath = path.join(__dirname, "..", "locales");

    return fs
        .readdirSync(localesPath)
        .filter(file => file.endsWith(".json"))
        .map(file => file.replace(".json", ""));
}

module.exports = {
    loadUserLocale,
    loadLocale,
    getAvailableLocales
};