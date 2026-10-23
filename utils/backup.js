const fs = require("fs");
const path = require("path");
const cron = require("node-cron")

const log = require("./logger");

async function StartCron(client) {
    const backupUrl = client.config.backup?.url;
    const backupToken = client.shadow.backup;

    if (!backupUrl || !backupToken) {
        console.log("[BACKUP] Configuration backup manquante, backup désactivé.".yellow);
        return;
    }

    cron.schedule("22 2 * * *", async () => {
        let filesSync = 0;
        const databasePath = path.join(__dirname, "..", "database");
        const logsPath = path.join(__dirname, "..", "logs");

        try {
            const databaseFiles = await fs.promises.readdir(databasePath);

            await Promise.all(
                databaseFiles.map(async file => {
                    const prefix = file.split(".sqlite")[0];

                    await backupFile(file, prefix, client, backupUrl, backupToken);
                    filesSync += 1;
                })
            );

            await new Promise(resolve => setTimeout(resolve, 30 * 1000));

            const logFiles = await fs.promises.readdir(logsPath);

            await Promise.all(
                logFiles.map(async file => {
                    const prefix = file.split(".log")[0];

                    await backupFile(file, prefix, client, backupUrl, backupToken);
                    filesSync += 1;
                })
            );

            log(`[BACKUP] ${filesSync} backed up`.green, client);

        } catch (err) {
            console.error("❌ Erreur lors du backup :", err);
        }
    });
}

async function backupFile(file, prefix, client, backupUrl, backupToken) {
    const src = path.join(__dirname, '..', 'database', file);
    const srcLogs = path.join(__dirname, '..', 'logs', file)

    if (!fs.existsSync(src) && !fs.existsSync(srcLogs)) {
        console.error(`\n\n ⚠️ Fichier ${file} introuvable, backup annulé.\n\n`);
        return;
    }

    const date = new Date().toISOString().replace(/:/g, '-').split('T')[0];
    const ext = path.extname(file) || ".json";
    const fileName = `${prefix}-${date}${ext}`;

    try {
        let fileBuffer;
        if (fileName.includes('log')) {
            fileBuffer = fs.readFileSync(srcLogs);
        } else {
            fileBuffer = fs.readFileSync(src);
        }
        const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });

        const formData = new FormData();
        formData.append("file", blob, fileName);

        const response = await fetch(backupUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${backupToken}`
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.text();
            console.error(`❌ Échec de l'upload distant pour ${fileName} :`, err);
        }
    } catch (error) {
        console.error(`❌ Erreur réseau lors de la sauvegarde de ${fileName} :`, error);
    }
}

module.exports = { StartCron };
