const { sources } = require('../../utils/RSSsources.js')
const { scoreArticle } = require('../../utils/RSSscorer.js')
const { cleanText, isFresh } = require('../../utils/RSSutils.js')
const { generateHash, isDuplicate } = require('../../utils/RSSdeduplicator.js')

const Parser = require("rss-parser");
const parser = new Parser();

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
  try {
    const feed = await parser.parseURL(source.url);

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
    await axios.post(client.config.RSS.discordWebhook, {
      embeds
    });

  } catch (err) {
    if (err.message == 'Request failed with status code 400') return;
    console.error(`Error with ${source.name}:`, err.message);
  }
}

async function runRSS(client) {
  for (const source of sources) {
    await processSource(source, client);
  }
}