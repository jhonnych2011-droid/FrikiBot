export const command = "sorteo";

import fs from "fs";

// Guardará sorteos activos por chat
globalThis.sorteosActivos = globalThis.sorteosActivos || {};

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const tiempo = args[0];

  if (!tiempo)
    return sock.sendMessage(from, { text: "⚠️ Uso: .sorteo <tiempo> (ej: 30s, 2m, 1h)" }, { quoted: msg });

  // Solo números para comparar owners
  const normalizeNumber = (jid) => jid.replace(/\D/g, "");
  const owners = ["214461239546098"]; // tu número aquí
  const senderNum = normalizeNumber(sender);

  if (!owners.includes(senderNum))
    return sock.sendMessage(from, { text: "❌ Solo los owners pueden crear sorteos." }, { quoted: msg });

  // Convertir tiempo a milisegundos
  let ms = 0;
  if (tiempo.endsWith("s")) ms = parseInt(tiempo) * 1000;
  else if (tiempo.endsWith("m")) ms = parseInt(tiempo) * 60000;
  else if (tiempo.endsWith("h")) ms = parseInt(tiempo) * 3600000;
  else return sock.sendMessage(from, { text: "⚠️ Usa s, m o h (ej: 30s, 2m, 1h)" }, { quoted: msg });

  // Evitar duplicados
  if (globalThis.sorteosActivos[from])
    return sock.sendMessage(from, { text: "⚠️ Ya hay un sorteo activo en este chat." }, { quoted: msg });

  // Crear sorteo
  globalThis.sorteosActivos[from] = {
    participantes: [],
    mensajeID: msg.key.id,
  };

  const texto = `🎉 *Sorteo iniciado*\n🕓 Tiempo para unirse: ${tiempo}\n\nTodos los que quieran participar únanse con:\n👉 *.unir sorteo*`;

  await sock.sendMessage(from, { text: texto, mentions: [sender] });

  // Terminar el sorteo después del tiempo
  setTimeout(async () => {
    const sorteo = globalThis.sorteosActivos[from];
    if (!sorteo) return;

    const lista = sorteo.participantes.length
      ? `📜 *Lista de participantes:*\n\n${sorteo.participantes.join("\n")}`
      : "⚠️ Nadie se unió al sorteo.";

    await sock.sendMessage(from, { text: lista, quoted: msg });
    delete globalThis.sorteosActivos[from];
  }, ms);
}
