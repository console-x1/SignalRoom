const fs = require("fs");
const path = require("path");
const axios = require("axios");

const LOCALES_DIR = "./locales";

/* =======================
   TRANSLATION APIS (NO KEY)
======================= */

const apis = [
  {
    name: "libre",
    translate: async (text, source, target) => {
      const res = await axios.post(
        "https://libretranslate.de/translate",
        { q: text, source, target, format: "text" },
        { timeout: 10000 }
      );
      return res.data.translatedText;
    }
  },
  {
    name: "lingva",
    translate: async (text, source, target) => {
      const res = await axios.get(
        `https://lingva.ml/api/v1/${source}/${target}/${encodeURIComponent(text)}`,
        { timeout: 10000 }
      );
      return res.data.translation;
    }
  },
  {
    name: "lingva2",
    translate: async (text, source, target) => {
      const res = await axios.get(
        `https://lingva.pussthecat.org/api/v1/${source}/${target}/${encodeURIComponent(text)}`,
        { timeout: 10000 }
      );
      return res.data.translation;
    }
  },
  {
    name: "simply",
    translate: async (text, source, target) => {
      const res = await axios.get(
        "https://simplytranslate.org/api/translate",
        {
          params: { engine: "google", text, from: source, to: target },
          timeout: 10000
        }
      );
      return res.data.translated_text;
    }
  },
  {
    name: "mymemory",
    translate: async (text, source, target) => {
      const res = await axios.get(
        "https://api.mymemory.translated.net/get",
        {
          params: { q: text, langpair: `${source}|${target}` },
          timeout: 10000
        }
      );
      return res.data.responseData.translatedText;
    }
  },
  {
    name: "argos",
    translate: async (text, source, target) => {
      const res = await axios.post(
        "https://api.argosopentech.com/translate",
        {
          q: text,
          source: { language_code: source },
          target: { language_code: target }
        },
        { timeout: 10000 }
      );
      return res.data.translatedText;
    }
  }
];

let currentApiIndex = 0;
let concurrentRequests = 0;
const MAX_CONCURRENT = 5;

async function limitConcurrency(fn) {
  while (concurrentRequests >= MAX_CONCURRENT) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  concurrentRequests++;
  try {
    return await fn();
  } finally {
    concurrentRequests--;
  }
}

/* =======================
   HELPERS
======================= */

function getLocaleFiles() {
  return fs
    .readdirSync(LOCALES_DIR)
    .filter(f => /^[a-z]{2}(-[A-Z]{2})?\.json$/.test(f));
}

async function walkAsync(obj, cb, path = []) {
  if (typeof obj === "string") {
    await cb(obj, path);
    return;
  }
  if (Array.isArray(obj)) {
    const promises = [];
    for (let i = 0; i < obj.length; i++) {
      promises.push(walkAsync(obj[i], cb, [...path, i]));
    }
    await Promise.all(promises);
    return;
  }
  if (obj && typeof obj === "object") {
    const promises = [];
    for (const k of Object.keys(obj)) {
      promises.push(walkAsync(obj[k], cb, [...path, k]));
    }
    await Promise.all(promises);
  }
}

function getDeep(obj, path) {
  let cur = obj;
  for (const p of path) {
    if (cur == null || cur[p] === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setDeep(obj, path, value) {
  let cur = obj;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    const nextKey = path[i + 1];
    if (
      cur[key] !== undefined &&
      typeof cur[key] !== "object"
    ) {
      cur[key] = typeof nextKey === "number" ? [] : {};
    }

    if (cur[key] === undefined) {
      cur[key] = typeof nextKey === "number" ? [] : {};
    }
    cur = cur[key];
  }

  cur[path[path.length - 1]] = value;
}

function protectPlaceholders(text) {
  const placeholders = [];
  const protectedText = text.replace(/\[([^\]]+)\]/g, (_, p) => {
    const token = `__PH_${placeholders.length}__`;
    placeholders.push(p);
    return token;
  });
  return { protectedText, placeholders };
}

function restorePlaceholders(text, placeholders) {
  let result = text;
  placeholders.forEach((p, i) => {
    result = result.replace(`__PH_${i}__`, `[${p}]`);
  });
  return result;
}

async function translateWithFallback(text, source, target) {
  if (
    text.length < 3 ||
    /^[A-Za-z]{1,3}$/.test(text) ||
    /^[A-Z0-9_]+$/.test(text)
  ) {
    return text;
  }

  const { protectedText, placeholders } = protectPlaceholders(text);

  let attemptsCount = 0;
  while (attemptsCount < apis.length) {
    const api = apis[currentApiIndex];
    try {
      const translated = await api.translate(protectedText, source, target);
      if (translated && translated.trim()) {
        return restorePlaceholders(translated, placeholders);
      }
      // Pas de réponse valide, on essaie la prochaine API
      currentApiIndex = (currentApiIndex + 1) % apis.length;
      attemptsCount++;
    } catch (error) {
      currentApiIndex = (currentApiIndex + 1) % apis.length;
      attemptsCount++;
    }
  }

  return text;
}

/* =======================
   MAIN
======================= */

async function main() {
  const files = getLocaleFiles();
  if (files.length < 2) throw new Error("Not enough locale files");

  const sourceFile = files.find(f => f.startsWith("fr")) || files[0];
  const sourceLang = sourceFile.split(".")[0];
  const sourceData = JSON.parse(
    fs.readFileSync(path.join(LOCALES_DIR, sourceFile), "utf8")
  );

  for (const file of files) {
    if (file === sourceFile) continue;

    currentApiIndex = 0;

    const targetLang = file.split(".")[0];
    const targetBase = targetLang.split("-")[0];
    const targetPath = path.join(LOCALES_DIR, file);
    const targetData = fs.existsSync(targetPath)
      ? JSON.parse(fs.readFileSync(targetPath, "utf8"))
      : {};

    let translatedCount = 0;
    const startTime = Date.now();
    console.log(`\n→ ${sourceLang} → ${targetLang} (using ${apis[currentApiIndex].name})`);

    await walkAsync(sourceData, async (value, keyPath) => {
      if (getDeep(targetData, keyPath) !== undefined) return;

      await limitConcurrency(async () => {
        const translated = await translateWithFallback(
          value,
          sourceLang,
          targetBase
        );
        setDeep(targetData, keyPath, translated);
        translatedCount++;
        
        if (translatedCount % 10 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (translatedCount / (Date.now() - startTime) * 1000).toFixed(1);
          console.log(`  ✓ ${translatedCount} strings (${rate}/s, ${elapsed}s)`);
        }
      });
    });

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✓ ${translatedCount} total strings translated in ${totalTime}s`);
    
    fs.writeFileSync(
      targetPath,
      JSON.stringify(targetData, null, 4)
    );
    console.log(`  ✓ Saved ${file}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
