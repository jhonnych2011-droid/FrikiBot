import fs from "fs";

export const command = "cambiarnombre";
export const isVIP = true;
export const requiredLevel = 1;

const inventarioFile = "./inventario.json";
const personajesFile = "./personajes.json";
const nombresFile = "./nombres_personalizados.json";

const fixID = jid => jid.replace(/@.+$/, "@lid");
const cargar = (f, d = {}) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : d;
const guardar = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || from);

  if (args.length < 2)
    return sock.sendMessage(from, { text: "Uso: .cambiarnombre <personaje> <nuevo nombre>" }, { quoted: msg });

  const personaje = args[0];
  const nuevo = args.slice(1).join(" ");

  const inv = cargar(inventarioFile);
  const pers = cargar(personajesFile);
  const nombres = cargar(nombresFile);

  if (!inv[sender]?.includes(personaje))
    return sock.sendMessage(from, { text: "❌ No tienes ese personaje." }, { quoted: msg });

  if (!pers[personaje])
    return sock.sendMessage(from, { text: "❌ Personaje inexistente." }, { quoted: msg });

  nombres[sender] ??= {};
  nombres[sender][personaje] = { nombrePersonalizado: nuevo };

  guardar(nombresFile, nombres);

  sock.sendMessage(from, { text: `✅ Nombre cambiado a 👑 ${nuevo}` }, { quoted: msg });
}
