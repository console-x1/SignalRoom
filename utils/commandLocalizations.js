const { loadLocale, getAvailableLocales } = require("./locales");
const { Locale } = require("discord-api-types/v10");

function toDiscordLocale(langCode) {
    // already valid? just return it
    if (Object.values(Locale).includes(langCode)) return langCode;
    // try match by prefix (e.g. "en" -> "en-US")
    const maybe = Object.values(Locale).find(l => l.startsWith(langCode + "-"));
    if (maybe) return maybe;
    if (langCode === "en") return "en-US";
    return langCode;
}

function buildLocalizations(keyPath) {
    const mappings = {};
    for (const lang of getAvailableLocales()) {
        const locale = loadLocale(lang);
        const value = keyPath.split('.').reduce((o, k) => o && o[k], locale);
        if (!value) continue;

        // special case: we only maintain a single `en.json` file but want Discord to see both en-US and en-GB localizations.
        if (lang === 'en') {
            mappings['en-US'] = value;
            mappings['en-GB'] = value;
            continue;
        }

        mappings[toDiscordLocale(lang)] = value;
    }
    return mappings;
}

module.exports = { toDiscordLocale, buildLocalizations };