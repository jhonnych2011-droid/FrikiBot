// comandos/trabajar.js
export const command = "trabajar";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || from);

  // Crear registro si no existe
  if (!geosDB[sender]) {
    geosDB[sender] = {
      geos: 0,
      lastTrabajar: 0
    };
  }

  const user = geosDB[sender];
  const ahora = Date.now();
  const cooldown = 3 * 60 * 1000; // 3 minutos

  // Verificar cooldown
  if (ahora - user.lastTrabajar < cooldown) {
    const restante = Math.ceil((cooldown - (ahora - user.lastTrabajar)) / 1000);
    return sock.sendMessage(
      from,
      { text: `⏳ Debes esperar *${restante} segundos* para volver a trabajar.` },
      { quoted: msg }
    );
  }

  // Recompensa entre 200 y 500 geos
  const recompensa = Math.floor(Math.random() * (500 - 200 + 1)) + 200;

  // Actualizar datos
  user.geos += recompensa;
  user.lastTrabajar = ahora;

  const mensajes = [
    `😳 Trabajaste como tremenda puta y ganaste *${recompensa} geos*.`,
    `🧹 Hoy tocó limpiar y recibiste *${recompensa} geos*.`,
    `👷‍♂️ Trabajaste en construcción y te pagaron *${recompensa} geos*.`,
    `🍔 Atendiste un local y recibiste *${recompensa} geos*.`,
    `🚗 Hiciste entregas rápidas y ganaste *${recompensa} geos*.`
  ];

  const mensaje = mensajes[Math.floor(Math.random() * mensajes.length)];

  await sock.sendMessage(from, { text: `✅ ${mensaje}` }, { quoted: msg });
}
