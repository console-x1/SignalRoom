const REACTIONS = ["🔼", "➖", "🔽"];
const THREAD_INTRO = "**This thread was created automatically; please communicate respectfully and follow the <#1478206936422944829>.**\n\n_ _";

function decodeHtmlEntities(text) {
    const namedEntities = {
        amp: "&",
        apos: "'",
        gt: ">",
        lt: "<",
        nbsp: " ",
        quot: "\"",
        rsquo: "'",
        lsquo: "'",
        rdquo: "\"",
        ldquo: "\"",
        mdash: "—",
        ndash: "–",
        hellip: "…"
    };

    return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, value) => {
        if (value[0] === "#") {
            const codePoint = value[1].toLowerCase() === "x"
                ? Number.parseInt(value.slice(2), 16)
                : Number.parseInt(value.slice(1), 10);
            return Number.isInteger(codePoint) && codePoint <= 0x10FFFF
                ? String.fromCodePoint(codePoint)
                : entity;
        }

        return namedEntities[value.toLowerCase()] ?? entity;
    });
}

function cleanDescription(description) {
    description = description.split("\n")[0];
    return decodeHtmlEntities(String(description || ""))
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function formatUtcTime(value) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
        ? `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`
        : "Unknown";
}

function createAnnouncement({ title, publishedAt, description, sourceName, sourceUrl }) {
    const safeTitle = String(title || "Cybersecurity update").replace(/\s+/g, " ").trim().slice(0, 256);
    const safeSourceName = String(sourceName || "Source").replace(/[\[\]]/g, "");
    const safeDescription = cleanDescription(description);
    const header = `🛜 **${safeTitle}**\n\nTime (UTC) : ${formatUtcTime(publishedAt)}\n\n`;
    const sourceLine = `\n\n> Source : [${safeSourceName}](${sourceUrl})`;
    const maxDescriptionLength = Math.max(0, 2000 - header.length - sourceLine.length);

    return `${header}${safeDescription.slice(0, maxDescriptionLength)}${sourceLine}`;
}

async function sendCyberAnnouncement(channel, announcement) {
    const message = await channel.send({
        content: createAnnouncement(announcement),
        allowedMentions: { parse: [] }
    }).then(message => message.crosspost().catch(() => { }));

    for (const emoji of REACTIONS) {
        try {
            await message.react(emoji);
        } catch (error) {
            console.error(`[CYBER-RSS] Impossible d'ajouter la réaction ${emoji} :`, error);
        }
    }

    const title = String(announcement.title || "Cybersecurity update");
    const threadName = title.slice(0, 50).replace(/[*_`#~]/g, "") || "Thread for news discussion";
    try {
        const thread = await message.startThread({
            name: threadName,
            autoArchiveDuration: 24 * 60,
            reason: title.slice(0, 150) || "Thread for news discussion"
        });

        await thread.setRateLimitPerUser(10);
        await thread.send({ content: THREAD_INTRO });
    } catch (error) {
        console.error(`[CYBER-RSS] Impossible de créer le fil pour « ${title} » :`, error);
    }

    return message;
}

module.exports = { sendCyberAnnouncement };
