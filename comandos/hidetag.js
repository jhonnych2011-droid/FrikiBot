import fs from "fs";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));

function esOwner(jid) {
  return owners.includes(fixID(jid));
}

export const command = "hidetag";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // Solo funciona en grupos
  if (!from.endsWith("@g.us")) {
    return sock.sendMessage(from, {
      text: "❌ Este comando solo funciona en grupos."
    }, { quoted: msg });
  }

  // Obtener metadata del grupo
  const metadata = await sock.groupMetadata(from);
  const participantes = metadata.participants;

  // ID del que ejecutó el comando
  const user = msg.key.participant || msg.key.remoteJid;

  // Verificación admin
  const isAdmin = participantes.some(p =>
    p.id === user && (p.admin === "admin" || p.admin === "superadmin")
  );

  // Verificación owner
  const isOwner = esOwner(user);

  // Debe ser admin O owner
  if (!isAdmin && !isOwner) {
    return sock.sendMessage(from, {
      text: "❌ Solo los administradores y owners pueden usar este comando."
    }, { quoted: msg });
  }

  // Texto del mensaje
  const texto = args.join(" ");
  if (!texto) {
    return sock.sendMessage(from, {
      text: "❌ Usa: .hidetag {mensaje}"
    }, { quoted: msg });
  }

  try {
    const ids = participantes.map(p => p.id);

    // Enviar mensaje citando y mencionando
    await sock.sendMessage(from, {
      text: texto,
      mentions: ids
    }, { quoted: msg });

  } catch (err) {
    console.error("❌ Error en hidetag:", err);
    await sock.sendMessage(from, {
      text: "❌ Ocurrió un error al ejecutar el comando."
    }, { quoted: msg });
  }
}
