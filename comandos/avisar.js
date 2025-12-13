import fs from "fs";

// Normaliza JID a @lid
function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

// Cargar owners.json
const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));

// Verificar si es owner
function esOwner(jid) {
  const id = fixID(jid);
  return owners.includes(id);
}

export const command = "avisar";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  // Solo owners
  if (!esOwner(sender)) {
    return sock.sendMessage(from, { text: "❌ No tienes permisos para usar este comando." });
  }

  if (!args.length) {
    return sock.sendMessage(from, { text: "⚠️ Uso: .avisar <mensaje>" }, { quoted: msg });
  }

  const mensaje = args.join(" ");

  // Formato del mensaje con link correcto
  const textoFinal = `📩 *Mensaje del creador:*\n\n${mensaje}\n\n🔗 *Grupo Oficial De FrikiBot:*\nhttps://chat.whatsapp.com/FvmAr3qHTGMKE2C51J3ZEC?mode=wwt`;

  // Obtener todos los chats del bot
  const chats = await sock.groupFetchAllParticipating();
  const grupos = Object.keys(chats); // solo JID de grupos

  let enviados = 0;
  let bloque = 0;

  for (let i = 0; i < grupos.length; i++) {
    const idGrupo = grupos[i];

    try {
      await sock.sendMessage(idGrupo, { text: textoFinal });
      enviados++;
    } catch (e) {
      console.log("Error enviando a", idGrupo, e);
    }

    bloque++;

    // Cada 4 grupos -> esperar 16 segundos
    if (bloque === 4) {
      bloque = 0;
      await new Promise(res => setTimeout(res, 16000));
    }
  }

  return sock.sendMessage(from, {
    text: `📢 Mensaje enviado a *${enviados} grupos* exitosamente.`
  });
}
