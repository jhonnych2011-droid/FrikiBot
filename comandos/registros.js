import fs from "fs";

export const command = "registros";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  let usuarios = {};
  try {
    if (fs.existsSync("./usuarios.json")) {
      usuarios = JSON.parse(fs.readFileSync("./usuarios.json", "utf8"));
    }
  } catch (err) {
    return sock.sendMessage(from, { text: "❌ Error leyendo usuarios.json." }, { quoted: msg });
  }

  const total = Object.keys(usuarios).length;
  sock.sendMessage(from, { text: `📋 Total de usuarios registrados: ${total}` }, { quoted: msg });
}
