// reclamar.js
export const command = "reclamar";

export async function run(sock, msg, args, geosDB, dropsDB) {
  const from = msg.key.remoteJid;
  const jid = msg.key.participant || msg.key.remoteJid;

  // Validar drop
  const drop = dropsDB[from];
  if (!drop)
    return sock.sendMessage(from, { text: "❌ No hay drop activo." });

  if (drop.recogido)
    return sock.sendMessage(from, { text: "❌ Este drop ya fue reclamado." });

  // Inicializar usuario si no tiene geos
  if (!geosDB[jid]) geosDB[jid] = { geos: 0 };

  // Dar los geos correctos
  geosDB[jid].geos += drop.cantidad;

  // Marcar como reclamado
  drop.recogido = true;

  return sock.sendMessage(from, {
    text: `🎉 @${jid.split("@")[0]} reclamó *${drop.cantidad} geos*!`,
    mentions: [jid]
  });
}
