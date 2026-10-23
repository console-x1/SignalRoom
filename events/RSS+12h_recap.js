const certFR = require("./RSS+12h_recap/CERT-FR");
const financials = require("./RSS+12h_recap/financials");
const naturalEvents = require("./RSS+12h_recap/naturalEvents");
const RSS = require("./RSS+12h_recap/RSS")

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {

        await new Promise(function (resolve) { setTimeout(resolve, 500) });

        const startTime = Date.now()
        console.log('\n[CRON] Starting -----------------------------------------------'.grey)
        await certFR.execute(client, Date.now());
        await financials.execute(client, Date.now());
        await naturalEvents.execute(client, Date.now());
        await RSS.execute(client, Date.now());
        console.log(`[CRON] Started in ${Number((Date.now() - startTime)/1000).toFixed(2)}s --------------------------------------\n`.grey)

    }
};
