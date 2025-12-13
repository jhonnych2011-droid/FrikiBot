import fs from 'fs';

export const command = "formatear";

export async function run(sock, msg, args) {

  // Función para limpiar IDs
  function fixID(jid) {
    if (!jid) return '';
    return jid.replace(/@.+$/, '').replace(/:\d+/, '');
  }

  // Solo owners
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderFixed = fixID(sender);

  const owners = JSON.parse(fs.readFileSync('./owners.json', 'utf8')).map(fixID);
  if (!owners.includes(senderFixed)) {
    return sock.sendMessage(msg.key.remoteJid, { text: "❌ Solo los *OWNERS* pueden usar este comando." }, { quoted: msg });
  }

  if (args[0] !== "geos") {
    return sock.sendMessage(msg.key.remoteJid, { text: "Usa: *.formatear geos*" }, { quoted: msg });
  }

  try {
    // Cargar geos
    const geosPath = './geos.json';
    let geosDB = {};
    if (fs.existsSync(geosPath)) {
      geosDB = JSON.parse(fs.readFileSync(geosPath, 'utf8'));
    }

    // Poner geos a 0
    for (let user in geosDB) {
      if (typeof geosDB[user] === 'object' && geosDB[user] !== null) {
        geosDB[user].geos = 0;
      } else {
        geosDB[user] = 0;
      }
    }

    // Guardar cambios
    fs.writeFileSync(geosPath, JSON.stringify(geosDB, null, 2));

    await sock.sendMessage(msg.key.remoteJid, { 
      text: "✔️ *Todos los geos han sido puestos a 0 correctamente.*" 
    }, { quoted: msg });

  } catch (e) {
    console.log("❌ Error poniendo geos a 0:", e);

    await sock.sendMessage(msg.key.remoteJid, { 
      text: "❌ Hubo un error poniendo los geos a 0." 
    }, { quoted: msg });
  }
}
