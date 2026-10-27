const { Client, Collection, GatewayIntentBits, ActivityType, Options } = require("discord.js");
const colors = require("colors");
const fs = require("fs");
const path = require("path");



const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,
        MessageManager: 50,
        GuildMemberManager: {
            maxSize: 100,
            keepOverLimit: member => member.id === member.guild.client.user?.id
        },
        UserManager: 1000,
        ReactionManager: 0
    }),
    restTimeOffset: 0,
    failIfNotExists: false,
    presence: {
        activities: [{
            name: `🚨・SignalRoom`,
            type: ActivityType.Custom,
        }],
        status: "idle"
    },
    allowedMentions: {
        parse: ["roles", "users", "everyone"],
        repliedUser: false
    }
});


client.config = require("./config.json");
client.shadow = require("./shadow.json");

client.login(client.shadow.token);



const eventFiles = fs.readdirSync("./events").filter(file => file.endsWith(".js"));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
        client.on(event.name, (...args) => event.execute(client, ...args));
    }
};



client.commands = new Collection();
function loadCommands(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith(".js")) {
            const command = require(filePath);

            const category = path.basename(dir);
            if (category == "commands")
                command.category = "general";
            else
                command.category = category;

            client.commands.set(command.name, command);
        }
    }
}
loadCommands(path.join(__dirname, "commands"));



const backup = require('./utils/backup.js')
backup.StartCron(client)



async function errorHandler(error) {
    if (error.code == 10062) return; // Unknown interaction
    if (error.code == 40060) return; // Interaction has already been acknowledged
    if (error.code == 50013) return; // Missing permissions
    if (error.code == 10008) return; // Unknown message

    console.log(`[ERROR] ${error}`.red);
};
process.on("unhandledRejection", errorHandler);
process.on("uncaughtException", errorHandler);