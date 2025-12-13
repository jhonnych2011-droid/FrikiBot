import fs from "fs";
const USERS_FILE = "./usuarios.json";

export const command = "registrar";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // Detectar correctamente el ID del usuario
  const sender =
    msg.key.participant ||
    msg.participant ||
    msg.key.remoteJid;

  // Si no ponen nombre → mensaje sarcástico
  if (!args.length) {
    return sock.sendMessage(
      from,
      {
        text: "Tenes mucha sida, ponele nombre, down"
      },
      { quoted: msg }
    );
  }

  const nombre = args.join(" ");

  // Leer archivo usuarios.json
  let usuarios = {};
  if (fs.existsSync(USERS_FILE)) {
    usuarios = JSON.parse(fs.readFileSync(USERS_FILE));
  }

  // Verificar si ya está registrado
  if (usuarios[sender]) {
    return sock.sendMessage(
      from,
      { text: "⚠️ Ya estás registrado." },
      { quoted: msg }
    );
  }

  // Registrar usuario
  usuarios[sender] = { nombre };

  fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2));

  // Mensaje de confirmación
  await sock.sendMessage(
    from,
    { text: `✅ Registrado como *${nombre}*` },
    { quoted: msg }
  );
}
