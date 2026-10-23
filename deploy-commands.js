const { Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
const fs = require('fs');
const path = require("path");

const shadow = require("./shadow.json");
const config = require("./config.json");
const clientId = config.id;

const commands = [];
function loadSlashCommands(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            loadSlashCommands(filePath);
        } else if (file.endsWith(".js")) {
            const command = require(filePath);

            if (command.data && !command.botOwnerOnly) {
                commands.push(command.data.toJSON());
            }
        }
    }
}

loadSlashCommands(path.join(__dirname, "commands"));

const rest = new REST({ version: '10' }).setToken(shadow.token);

rest.put(
    Routes.applicationCommands(clientId), { body: commands }
    )
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);