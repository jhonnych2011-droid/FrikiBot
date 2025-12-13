import fs from "fs";

export const command = "overloads";

const TRATOS_PATH = './tratos.json';

function cargarDB(path) {
  if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify({}, null,2));
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const db = cargarDB(TRATOS_PATH);

  const lista = Object.entries(db.overload||{}).map(([k,v])=>`${k}: ${v.tiempoLimite} min`).join("\n") || "No hay overloads";
  sock.sendMessage(from,{text:`📃 Overloads:\n${lista}`});
}
