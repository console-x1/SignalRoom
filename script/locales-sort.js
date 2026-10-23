const path = require("path");
const fs = require("fs");

const LOCALES_DIR = "./locales";
const HEADER_KEYS = ["name", "flag"];

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = sortJson(value[key]);
        return acc;
      }, {});
  }

  return value;
}

const files = fs.readdirSync(LOCALES_DIR)
  .filter(f => f.endsWith(".json"));

for (const file of files) {
  const filePath = path.join(LOCALES_DIR, file);
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));

  const header = {};
  for (const key of HEADER_KEYS) {
    if (key in json) header[key] = json[key];
  }

  const rest = {};
  for (const key of Object.keys(json)) {
    if (!HEADER_KEYS.includes(key)) {
      rest[key] = json[key];
    }
  }

  const sorted = {
    ...header,
    ...sortJson(rest)
  };

  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 4));
  console.log(`✓ sorted ${file}`);
}