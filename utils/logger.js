const fs = require('fs');
const { EmbedBuilder } = require("discord.js");

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////
////////// logs discord + logs.log
//////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = function loggD(msg, client) {
  const embed = new EmbedBuilder()
  .setDescription(`\`\`\`ansi\n${msg}\`\`\``)
  .setTimestamp();

  if (msg.toLowerCase().includes('api') || msg.toLowerCase().includes('error') || msg.toLowerCase().includes('config')) embed.setColor('Red')
  else if (msg.toLowerCase().includes('backup') || msg.toLowerCase().includes('backed up')) embed.setColor('Yellow')
  else embed.setColor(client.config.color) // PUTAIN DE COULEUR DE CON QUI EST PAS DEFINIIIIIII

  client.channels.cache.get(client.config.channels.logs)?.send({ embeds: [embed] })

  const logData = `${new Date().toISOString()} - ${msg}\n`;
  fs.appendFile('logs/logs.log', logData, (err) => {
    if (err && err.code === 'ENOENT') {
      fs.mkdir('logs', { recursive: true }, (mkdirErr) => {
        if (mkdirErr) console.error('Erreur création dossier logs:', mkdirErr);
        else {
          fs.appendFile('logs/logs.log', logData, (appendErr) => {
            if (appendErr) console.error('Erreur écriture logs après création dossier:', appendErr);
          });
        }
      });
    } else if (err) console.error('Erreur écriture logs:', err);
  });
};
