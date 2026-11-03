export const sources = [
  {
    name: "Reuters",
    url: "https://news.google.com/rss/search?q=source:reuters+world&hl=en-US&gl=US&ceid=US:en",
    weight: 3
  },
  {
    name: "Associated Press",
    url: "https://news.google.com/rss/search?q=source:apnews.com&hl=en-US&gl=US&ceid=US:en",
    weight: 3
  },
  {
    name: "BBC",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    weight: 2
  },
  {
    name: "BleepingComputer",
    url: "https://www.bleepingcomputer.com/feed/",
    type: "cyber",
    channelConfig: "cyberSecurityNews",
    maxAgeMinutes: 150
  },
  {
    name: "The Hacker News",
    url: "https://feeds.feedburner.com/TheHackersNews",
    type: "cyber",
    channelConfig: "cyberSecurityNews",
    maxAgeMinutes: 150
  },
  {
    name: "USGS Earthquakes",
    url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_hour.atom",
    weight: 3
  }
];