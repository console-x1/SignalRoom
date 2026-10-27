const { sources } = require('../../utils/RSSsources.js')
const { scoreArticle } = require('../../utils/RSSscorer.js')
const { cleanText, isFresh } = require('../../utils/RSSutils.js')
const { generateHash, isDuplicate } = require('../../utils/RSSdeduplicator.js')

const Parser = require("rss-parser");
const parser = new Parser({ timeout: 15000 });

const axios = require('axios')
const cron = require("node-cron");
const colors = require("colors");

const SCORE_THRESHOLD = 10;
const POLL_INTERVAL = 120 * 1000;

module.exports = {
    async execute(client, startTime) {
        await runRSS(client);
        console.log(`[NEWS-RSS] Cron RSS activé en ${Number((Date.now() - startTime)/1000).toFixed(2)}s`.green);

        cron.schedule("0 */2 * * *", async () => {
            await runRSS(client);
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

  const embeds = []
  for (const item of feed.items) {
    const text = cleanText(item);

    if (!text) continue;
    if (!isFresh(item, 30)) continue;

    const hash = generateHash(text);

    if (isDuplicate(hash)) continue;

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

  if (embeds.length === 0) return;

  try {
    await axios.post(client.config.RSS.discordWebhook, {
      embeds
    });
  } catch (err) {
    console.error(`Error sending ${source.name} RSS to Discord:`, err.message);
  }
}

async function runRSS(client) {
  for (const source of sources) {
    await processSource(source, client);
  }
}