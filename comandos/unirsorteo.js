export const command = "unir";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const nombre = msg.pushName || "Usuario";

  if (!args[0] || args[0].toLowerCase() !== "sorteo")
    return sock.sendMessage(from, { text: "⚠️ Usa: .unir sorteo" }, { quoted: msg });

  if (!globalThis.sorteosActivos[from])
    return sock.sendMessage(from, { text: "❌ No hay ningún sorteo activo." }, { quoted: msg });

  const sorteo = globalThis.sorteosActivos[from];
  if (sorteo.participantes.includes(nombre))
    return sock.sendMessage(from, { text: `⚠️ ${nombre}, ya estás unido al sorteo.` }, { quoted: msg });

  sorteo.participantes.push(nombre);
  await sock.sendMessage(from, { text: `✅ ${nombre} se unió al sorteo.` }, { quoted: msg });
}
