const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const cron = require("node-cron");
const colors = require("colors");

module.exports = {
    async execute(client, startTime) {
        await sendNaturalEventsAlert(client);
        console.log(`[NATURELS] Cron des événements naturels activé en ${Number((Date.now() - startTime)/1000).toFixed(2)}s`.green);

        cron.schedule('0 10,22 * * *', async () => {
            await sendNaturalEventsAlert(client);
        });

    }
};

async function sendNaturalEventsAlert(client) {
    try {
        const { eonet, usgs, firms } = await fetchAllEvents(client);

        const eonetEvents = await processEONET(eonet);
        const usgsEvents = await processUSGS(usgs);
        const firmsEvents = await processFIRMS(parseCSV(firms));

        const allFiltered = [
            ...eonetEvents.filtered,
            ...usgsEvents.filtered,
            ...firmsEvents.filtered
        ].sort((a, b) => b.score - a.score);

        const embedEvents = allFiltered.filter(e => e.score >= 6).slice(0, 10);

        const mention = embedEvents.some(e => e.score >= 10)
            ? `<@&${client.config.roles.naturalEvents}>`
            : "";

        const embed = buildEmbed(embedEvents);

        const heure = new Date().toISOString().split('T')[1].split(':')

        const jsonBuffer = Buffer.from(JSON.stringify(allFiltered, null, 2));
        const attachment = new AttachmentBuilder(jsonBuffer, {
            name: `events_${new Date().toISOString().split('T')[0]}_${heure[0] + 'h' + heure[1]}.json`
        });

        const channel = client.channels.cache.get(client.config.channels.naturalEvents);

        const message = await channel.send({
            content: `${mention} 🌍 **Natural Events Alert**`,
            embeds: [embed],
            files: [attachment]
        });
        message.crosspost();

    } catch (err) {
        console.error("Erreur natural events:", err);
    }
}

// =======================
// FETCH
// =======================

async function fetchAllEvents(client) {
    const eonet = await fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open")
        .then(r => r.json());

    const usgs = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson")
        .then(r => r.json());

    const firms = await fetch(
        `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${client.config.api.firms}/VIIRS_SNPP_NRT/world/2`
    ).then(r => r.text());

    return { eonet, usgs, firms };
}

// =======================
// EONET
// =======================

async function processEONET(data) {
    let kept = [];

    if (!data.events || !Array.isArray(data.events)) return { filtered: kept };
    for (const e of data.events) {
        const type = e.categories?.[0]?.id;
        if (!type) continue;

        if (type === "wildfires" || type === "earthquakes") continue;

        const date = new Date(e.geometry?.at(-1)?.date);
        if (isNaN(date)) continue;

        const hours = (Date.now() - date) / 3600000;
        if (hours > 12) continue;

        let score = 0;

        if (type === "volcanoes") score += 6;
        if (type === "severeStorms") score += 5;
        if (type === "floods") score += 4;

        if (hours < 6) score += 3;

        if (score >= 6) {
            kept.push({
                source: "EONET",
                type,
                title: e.title || "Unknown event",
                date,
                score
            });
        }
    }

    return { filtered: kept };
}

// =======================
// USGS
// =======================

async function processUSGS(data) {
    let kept = [];

    if (!data.features || !Array.isArray(data.features)) return { filtered: kept };
    for (const e of data.features) {
        const mag = e.properties.mag;
        const date = new Date(e.properties.time);

        if (isNaN(date)) continue;

        const hours = (Date.now() - date) / 3600000;
        if (hours > 12) continue;

        if (mag >= 5) {
            kept.push({
                source: "USGS",
                type: "earthquake",
                title: e.properties.place,
                magnitude: mag,
                date,
                score: mag * 1.5
            });
        }
    }

    return { filtered: kept };
}

// =======================
// FIRMS
// =======================

async function processFIRMS(data) {
    let raw = [];

    if (!data || !Array.isArray(data)) return { filtered: kept };
    for (const f of data) {
        const frp = parseFloat(f.frp);
        const lat = parseFloat(f.latitude);
        const lon = parseFloat(f.longitude);

        if (!frp || isNaN(lat) || isNaN(lon)) continue;

        const time = (f.acq_time || "").padStart(4, "0");

        const date = new Date(
            `${f.acq_date}T${time.slice(0, 2)}:${time.slice(2)}:00Z`
        );

        if (isNaN(date)) continue;

        const hours = (Date.now() - date) / 3600000;
        if (hours > 12) continue;

        if (frp < 100) continue;

        raw.push({ lat, lon, frp, date, hours });
    }

    // =======================
    // CLUSTER
    // =======================

    const map = new Map();

    for (const f of raw) {
        const key = `${Math.floor(f.lat / 1)},${Math.floor(f.lon / 1)}`;

        if (!map.has(key)) {
            map.set(key, {
                lat: f.lat,
                lon: f.lon,
                frp: f.frp,
                count: 1,
                hours: f.hours
            });
        } else {
            const e = map.get(key);
            e.count++;
            e.frp = Math.max(e.frp, f.frp);
        }
    }

    let clusters = Array.from(map.values());

    // =======================
    // SCORE
    // =======================

    for (let c of clusters) {
        if (c.count < 5) {
            // On delete le cluster
            clusters = clusters.filter(cl => cl !== c);
            continue;
        }
        let title = "";
        const { city, principalSubdivision, countryName } = await reverseGeocode(c.lat, c.lon);

        title = `${city ? city + ", " : ""}${principalSubdivision ? principalSubdivision + ", " : ""}${countryName || ""}`.trim().replace(/,\s*$/, "");

        if (!title) title = `${c.lat.toFixed(2)}, ${c.lon.toFixed(2)}`;

        c.title = title;
        c.score = computeScore(c.frp, c.count);
        c.source = "FIRMS";
        c.type = "wildfires";
    }

    return {
        filtered: clusters
            .filter(c => c.score >= 5)
            .sort((a, b) => b.score - a.score)
    };
}

// =======================
// CSV PARSER
// =======================

function parseCSV(csv) {
    const lines = csv.trim().split("\n");
    const headers = lines[0].split(",");

    return lines.slice(1).map(line => {
        const values = line.split(",");
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i]);
        return obj;
    });
}

// =======================
// EMBED
// =======================

function buildEmbed(events) {
    if (events.length === 0) {
        return new EmbedBuilder()
            .setDescription("**No significant natural events detected in the last 12 hours.**")
            .setColor('Green')
            .setFooter({ text: "Next embed in 12h — Data sources: EONET, USGS, FIRMS" });
    }

    return new EmbedBuilder()
        .setDescription("# 🌍 Natural Events")
        .setColor('Red')
        .addFields(
            events.map(e => ({
                name: `${e.isCritical ? "🚨" : getEmoji(e)} ${e.type.slice(0, 1).toUpperCase() + e.type.slice(1).toLowerCase()} ${e.title}`,
                value: e.type === "wildfires" ? formatFireEvent(e) : formatEvent(e),
                inline: false
            }))
        )
        .setFooter({ text: "Next embed in 12h — Data sources: EONET, USGS, FIRMS" });
}

// =======================
// HELPERS
// =======================

function getEmoji(e) {
    if (e.type === "wildfires") return "<:fire:1501001740877828116>";
    if (e.type === "volcanoes") return "🌋";
    if (e.type === "earthquake") return "🌍";
    if (e.type === "severeStorms") return "🌪️";
    if (e.type === "floods") return "🌊";
    return "⚠️";
}

function formatEvent(e) {
    const hours = Math.round((Date.now() - new Date(e.date)) / 3600000);

    let txt = "";

    if (e.magnitude) txt += `\n📈 Magnitude: ${e.magnitude}`;
    if (e.frp) txt += `\n<:flamme:1501001706937258094> FRP: ${e.frp}`;

    txt += `\n⏱️ ${hours}h ago`;

    txt += `\n\n_ _`;
    return txt;
}

function formatFireEvent(e) {
    const map = `https://www.google.com/maps?q=${e.lat},${e.lon}&z=6`;
    const hours = Math.round(e.hours);

    return (
        `📍 [Google Maps](${map})\n` +
        `<:flamme:1501001706937258094> FRP: ${Math.round(e.frp)}\n` +
        `📊 Detections: ${e.count}\n` +
        `⏱️ ${hours}h ago\n` +
        `\n_ _`
    );
}

function computeScore(frp, count) {
    let score = Math.min(10, Math.log10(frp) * 2.5);

    if (count >= 10) score += 1;
    else if (count >= 20) score += 2;
    else if (count >= 30) score += 3;
    else if (count >= 40) score += 4;

    return Math.min(10, score);
}

async function reverseGeocode(lat, lon) {
    const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );

    const data = await res.json();

    return {
        city: data.city,
        principalSubdivision: data.principalSubdivision,
        countryName: data.countryName
    };
}