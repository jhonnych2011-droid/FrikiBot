import fs from 'fs';

export const command = "cooldowns";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

export async function run(sock, msg, args) {

  // Solo owners
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  const owners = JSON.parse(fs.readFileSync('./owners.json', 'utf8')).map(fixID);
  if (!owners.includes(sender)) {
    return sock.sendMessage(msg.key.remoteJid, { text: "❌ Solo los *OWNERS* pueden usar este comando." }, { quoted: msg });
  }

  try {
    // Cargar geos
    const geosPath = './geos.json';
    let geosDB = {};
    if (fs.existsSync(geosPath)) {
      geosDB = JSON.parse(fs.readFileSync(geosPath, 'utf8'));
    }

    // Poner a 0 todos los "last*"
    for (let user in geosDB) {
      for (let key in geosDB[user]) {
        if (key.startsWith("last") && typeof geosDB[user][key] === "number") {
          geosDB[user][key] = 0;
        }
      }
    }

    // Guardar cambios
    fs.writeFileSync(geosPath, JSON.stringify(geosDB, null, 2));

    await sock.sendMessage(msg.key.remoteJid, { 
      text: "✔️ *Todos los cooldowns (last*) han sido puestos a 0 correctamente.*" 
    }, { quoted: msg });

  } catch (e) {
    console.log("❌ Error reseteando cooldowns:", e);

    await sock.sendMessage(msg.key.remoteJid, { 
      text: "❌ Hubo un error reseteando los cooldowns." 
    }, { quoted: msg });
  }
}
