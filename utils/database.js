const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const colors = require("colors");

const baseDir = path.resolve(__dirname, "../", "database");
if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
}

const dbPath = path.join(baseDir, "database.sqlite");
const db = new sqlite3.Database(dbPath);

const tableSchemas = {
    guilds: {
        guildId: "TEXT",
        name: "TEXT",
        prefix: "TEXT",
        primaryKey: ["guildId"]
    },
    users: {
        guildId: "TEXT",
        userId: "TEXT",
        lang: "TEXT DEFAULT NULL",
        primaryKey: ["guildId", "userId"]
    },
    blacklist: {
        userId: "TEXT",
        reason: "TEXT",
        primaryKey: ["userId"]
    }
};

function syncTable(tableName, schema) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
            if (err) return reject(err);

            const existingCols = rows.map(r => r.name);

            if (existingCols.length === 0) {
                const columns = Object.entries(schema)
                    .filter(([k]) => k !== "primaryKey")
                    .map(([k, v]) => `${k} ${v}`)
                    .join(",\n  ");

                const pk = schema.primaryKey
                    ? `,\n  PRIMARY KEY (${schema.primaryKey.join(", ")})`
                    : "";

                const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columns}${pk}\n);`;

                db.run(sql, err => {
                    if (err) reject(err);
                    else {
                        console.log(`[INIT-DB] Table ${tableName} créée.`.red);
                        resolve();
                    }
                });
            } else {
                const missing = Object.entries(schema)
                    .filter(([k]) => k !== "primaryKey" && !existingCols.includes(k));

                Promise.all(
                    missing.map(([col, def]) =>
                        new Promise(res => {
                            db.run(
                                `ALTER TABLE ${tableName} ADD COLUMN ${col} ${def};`,
                                err => {
                                    if (!err)
                                        console.log(
                                            `[INIT-DB] Ajout colonne ${col} → ${tableName}`.red
                                        );
                                    res();
                                }
                            );
                        })
                    )
                ).then(resolve);
            }
        });
    });
}

const ready = (async () => {
    console.log(`\n[INIT-DB] Synchronisation des tables...`.grey);
    for (const [table, schema] of Object.entries(tableSchemas)) {
        await syncTable(table, schema);
    }
    console.log(`[INIT-DB] Synchronisation terminée.\n`.grey);
})();

db.ready = ready;
module.exports = db;