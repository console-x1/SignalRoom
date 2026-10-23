const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { createCanvas } = require("canvas");
const cron = require("node-cron");
const Chart = require("chart.js/auto");

global.Chart = Chart;
globalThis.dateFns = require("date-fns");
require("chartjs-adapter-date-fns");

/* =========================
   CONFIG
========================= */

const RISK_ASSETS = [
    { symbol: "BTCUSDT", label: "Bitcoin", color: "#ffa000", provider: "binance" },

    { symbol: "^GSPC", label: "S&P 500", color: "#00aa00", provider: "yahoo" },

    { symbol: "CL=F", label: "Oil", color: "#7a624a", provider: "yahoo" },

    { symbol: "GC=F", label: "Gold", color: "#ffe555", provider: "yahoo" },
    { symbol: "SI=F", label: "Silver", color: "#cccccc", provider: "yahoo" }
];

/* =========================
   CRON
========================= */

module.exports = {
    async execute(client, startTime) {
        await runMacroSnapshot(client);
        console.log(`[ECONOMIE] Cron du graphique économique activé en ${Number((Date.now() - startTime)/1000).toFixed(2)}s`.green);

        cron.schedule("0 10,22 * * *", async () => {
            await runMacroSnapshot(client);
        });
    }
};

/* =========================
   FETCHERS
========================= */

async function fetchBinance(symbol) {
    const url = `https://api.binance.com/api/v1/klines?symbol=${symbol}&interval=1h&limit=168`;
    const res = await fetch(url);
    const data = await res.json();

    return data.map(d => ({
        time: new Date(d[0]),
        price: parseFloat(d[4])
    }));
}

async function fetchYahoo(symbol, range = 7) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1h&range=${range}d`;
    const res = await fetch(url);
    const json = await res.json();

    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const prices = result.indicators.quote[0].close;
    const times = result.timestamp;

    const out = [];

    for (let i = 0; i < prices.length; i++) {
        if (prices[i] != null && times[i]) {
            out.push({
                time: new Date(times[i] * 1000),
                price: prices[i]
            });
        }
    }

    return out;
}

async function fetchPrices(asset) {
    return asset.provider === "binance"
        ? fetchBinance(asset.symbol)
        : fetchYahoo(asset.symbol);
}

/* =========================
   TRANSFORMATIONS
========================= */

function normalize(series) {
    if (!series?.length) return [];

    const base = series[0].price;

    return series.map(p => ({
        time: p.time,
        value: ((p.price - base) / base) * 100
    }));
}

function trimTo7d(series) {
    const now = series.at(-1).time;
    const cutoff = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

    return series.filter(p => p.time >= cutoff);
}

// ✅ FIX: cohérence % + prix
function variation(series, hours) {
    if (!series?.length) return null;

    const now = series.at(-1).time;
    const targetTime = new Date(now.getTime() - hours * 3600 * 1000);

    let closest = null;

    for (const p of series) {
        if (p.time <= targetTime) closest = p;
        else break;
    }

    if (!closest) return null;

    const current = series.at(-1).price;
    const pct = ((current - closest.price) / closest.price) * 100;

    return {
        pct,
        refPrice: closest.price
    };
}

function formatVar(v) {
    if (!v) return "N/A";

    let emoji = "<:yellow_circle:1501596833212928010>";
    if (v.pct >= 0.5) emoji = "<:green_circle:1501596729974329635>";
    else if (v.pct <= -0.5) emoji = "<:red_circle:1501596783283798218>";

    return `${emoji} \`${v.pct.toFixed(2)}%\``;
}

/* =========================
   CHART
========================= */

const zeroLinePlugin = {
    id: "zeroLine",
    afterDraw(chart) {
        const y = chart.scales.y.getPixelForValue(0);
        const ctx = chart.ctx;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(chart.chartArea.left, y);
        ctx.lineTo(chart.chartArea.right, y);
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.restore();
    }
};

function getGlobalTimeBounds(datasets) {
    let min = Infinity;
    let max = -Infinity;

    for (const d of datasets) {
        for (const p of d.data) {
            const t = p.time.getTime();
            if (t < min) min = t;
            if (t > max) max = t;
        }
    }

    return { min, max };
}

function generateChart(datasets) {
    const canvas = createCanvas(1000, 600);
    const ctx = canvas.getContext("2d");
    const { min, max } = getGlobalTimeBounds(datasets);

    new Chart(ctx, {
        type: "line",
        data: {
            datasets: datasets.map(d => ({
                label: d.label,
                data: d.data.map(p => ({ x: p.time, y: p.value })),
                borderColor: d.color,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3
            }))
        },
        options: {
            parsing: false,
            plugins: {
                legend: { labels: { color: "white" } }
            },
            scales: {
                x: {
                    type: "time",
                    min,
                    max,
                    time: { unit: "day" },
                    ticks: { color: "white" }
                },
                y: {
                    title: {
                        display: true,
                        text: "% (7d)"
                    },
                    ticks: { color: "white" }
                }
            }
        },
        plugins: [zeroLinePlugin]
    });

    return canvas.toBuffer("image/png");
}

function generateChartFx(datasets) {
    const canvas = createCanvas(1000, 600);
    const ctx = canvas.getContext("2d");
    const { min, max } = getGlobalTimeBounds(datasets);

    new Chart(ctx, {
        type: "line",
        data: {
            datasets: datasets.map(d => ({
                label: d.label,
                data: d.data.map(p => ({ x: p.time, y: p.value })),
                borderColor: d.color,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.25
            }))
        },
        options: {
            parsing: false,
            plugins: {
                legend: { labels: { color: "white" } }
            },
            scales: {
                x: {
                    type: "time",
                    min,
                    max,
                    time: { unit: "day" },
                    ticks: { color: "white" }
                },
                y: {
                    ticks: {
                        color: "white",
                        callback: v => Number(v).toFixed(3)
                    },
                    grid: {
                        color: "rgba(255,255,255,0.15)"
                    }
                }
            }
        }
    });

    return canvas.toBuffer("image/png");
}

/* =========================
   BUILDERS
========================= */

async function buildDatasets(assets, fields) {
    const datasets = [];

    for (const asset of assets) {
        const series = await fetchPrices(asset);
        if (!series?.length) continue;

        const normalized = normalize(series);
        const trimmed = trimTo7d(normalized);

        datasets.push({
            label: asset.label,
            color: asset.color,
            data: trimmed
        });

        const v1h = variation(series, 1);
        const v12h = variation(series, 12);
        const v1d = variation(series, 24);
        const v7d = variation(series, 24 * 7);

        fields.push({
            name: asset.label + ` — ${series.at(-1).price.toLocaleString()} USD`,
            value:
`01h: ${formatVar(v1h)} — \`${v1h?.refPrice?.toLocaleString() ?? "N/A"}\` USD
12h: ${formatVar(v12h)} — \`${v12h?.refPrice?.toLocaleString() ?? "N/A"}\` USD
01d: ${formatVar(v1d)} — \`${v1d?.refPrice?.toLocaleString() ?? "N/A"}\` USD
07d: ${formatVar(v7d)} — \`${v7d?.refPrice?.toLocaleString() ?? "N/A"}\` USD`,
            inline: false
        });
    }

    return datasets;
}

async function buildFXDatasets() {
    const eur = await fetchYahoo("EURUSD=X", 15);
    const jpy = await fetchYahoo("USDJPY=X", 15);
    const brl = await fetchYahoo("USDBRL=X", 15);

    if (!eur?.length || !jpy?.length || !brl?.length) return [];

    const length = Math.min(eur.length, jpy.length, brl.length);

    const datasets = [
        { label: "USD (base)", color: "#ffffff", data: [] },
        { label: "EUR per USD", color: "#0048ff", data: [] },
        { label: "100 JPY per USD", color: "#c800ff", data: [] },
        { label: "5 BRL per USD", color: "#00ff11", data: [] }
    ];

    for (let i = 0; i < length; i++) {
        const time = eur[i].time;

        datasets[0].data.push({ time, value: 1 });

        datasets[1].data.push({ time, value: 1 / eur[i].price });
        datasets[2].data.push({ time, value: jpy[i].price / 100 });
        datasets[3].data.push({ time, value: brl[i].price / 5 });
    }

    return datasets;
}

/* =========================
   CORE
========================= */

async function runMacroSnapshot(client) {
    const fields = [];

    const riskData = await buildDatasets(RISK_ASSETS, fields);
    const fxData = await buildFXDatasets();

    const riskBuffer = generateChart(riskData);
    const fxBuffer = generateChartFx(fxData);

    const channel = client.channels.cache.get(client.config.channels.financials);

    const messageSent = await channel.send({
        content: "## **📡 Market update**",
        embeds: [
            new EmbedBuilder()
                .setTitle("📊 Risk & Commodities")
                .addFields(fields)
                .setImage("attachment://risk.png")
                .setColor("Blue"),

            new EmbedBuilder()
                .setTitle("💱 FX")
                .setImage("attachment://fx.png")
                .setColor("Blue")
        ],
        files: [
            new AttachmentBuilder(riskBuffer, { name: "risk.png" }),
            new AttachmentBuilder(fxBuffer, { name: "fx.png" })
        ]
    });

    messageSent.crosspost();
}