const { sources } = require('../../utils/RSSsources.js')
const { scoreArticle } = require('../../utils/RSSscorer.js')
const { cleanText, isFresh } = require('../../utils/RSSutils.js')
const { generateHash, isDuplicate } = require('../../utils/RSSdeduplicator.js')
const { sendCyberAnnouncement } = require('../../utils/cyberAnnouncement.js')

const Parser = require("rss-parser");
const parser = new Parser({ timeout: 15000 });

const axios = require('axios')
const cron = require("node-cron");
const colors = require("colors");

const SCORE_THRESHOLD = 10;

module.exports = {
    async execute(client, startTime) {
        await runRSS(client);
        console.log(`[NEWS-RSS] Cron RSS activé en ${Number((Date.now() - startTime)/1000).toFixed(2)}s`.green);

        cron.schedule("0 */2 * * *", async () => {
            await runRSS(client, source => source.type !== "cyber");
        });

        cron.schedule("*/10 * * * *", async () => {
            await runRSS(client, source => source.type === "cyber");
        });
    }
};


async function processSource(source, client) {
  let feed;
  try {
    feed = await parser.parseURL(source.url);
  } catch (err) {
    console.error(`[NEWS-RSS] Échec du flux ${source.name} (${source.url}):`, err);
    return;
  }

  const embeds = [];
  const cyberItems = [];
  for (const item of feed.items) {
    const text = cleanText(item);

    if (!text) continue;
    if (!isFresh(item, source.maxAgeMinutes ?? 30)) continue;

    const hash = generateHash(text);

    if (isDuplicate(hash)) continue;

    if (source.type === "cyber") {
      cyberItems.push(item);
      continue;
    }

    const score = scoreArticle(text, source.weight);
    if (score < SCORE_THRESHOLD) continue;

    const event = {
      source: source.name ?? "Unknown",
      title: item.title,
      link: item.link,
      published: item.isoDate,
      score
    };
    embeds.push({
      title: `${event.title}`,
      description: `[Read here](${event.link}) - source : ${event.source} - score : ${event.score} - published : <t:${Number(new Date(event.published)) / 1000}:R>`,
      url: event.link,
      color: 0x00AAFF,
    });
  }

  if (embeds.length === 0 && cyberItems.length === 0) return;

  try {
    if (source.channelConfig) {
      const channelId = client.config.channels[source.channelConfig];
      if (!channelId) {
        console.error(`[NEWS-RSS] Canal non configuré pour ${source.name}: channels.${source.channelConfig}`);
        return;
      }

      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        console.error(`[NEWS-RSS] Canal introuvable pour ${source.name}: ${channelId}`);
        return;
      }

      for (const item of cyberItems) {
        const description = item.contentSnippet || item.summary || item.content || item.description;
        const sourceUrl = item.link;
        if (!sourceUrl) {
          console.error(`[NEWS-RSS] Article cyber ignoré pour ${source.name}: lien source manquant.`);
          continue;
        }

        try {
          await sendCyberAnnouncement(channel, {
            title: item.title,
            publishedAt: item.isoDate || item.pubDate,
            description,
            sourceName: source.name,
            sourceUrl
          });
        } catch (err) {
          console.error(`[NEWS-RSS] Échec de publication de l'article cyber de ${source.name}:`, err);
        }
      }
      return;
    }

    await axios.post(client.config.RSS.discordWebhook, {
      embeds
    });
  } catch (err) {
    console.error(`Error sending ${source.name} RSS to Discord:`, err.message);
  }
}

async function runRSS(client, filter = () => true) {
  for (const source of sources.filter(filter)) {
    await processSource(source, client);
  }
}