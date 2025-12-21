import fs from "fs";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

export const command = "asignarps";
export const isVIP = true;
export const requiredLevel = 1;

const inventarioFile = "./inventario.json";
const personajesFile = "./personajes.json";
const personalizacionesFile = "./personalizaciones.json";

const fixID = jid => jid.replace(/@.+$/, "@lid");

const cargar = (f, d = {}) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : d;
const guardar = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || from);

  if (!args.length)
    return sock.sendMessage(from, { text: "Uso: .asignarps <personaje> (responde a una imagen)" }, { quoted: msg });

  const nombre = args.join(" ");
  const inv = cargar(inventarioFile);
  const pers = cargar(personajesFile);
  const per = cargar(personalizacionesFile);

  if (!inv[sender]?.includes(nombre))
    return sock.sendMessage(from, { text: "❌ No tienes ese personaje." }, { quoted: msg });

  if (!pers[nombre])
    return sock.sendMessage(from, { text: "❌ Personaje inexistente." }, { quoted: msg });

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted?.imageMessage)
    return sock.sendMessage(from, { text: "❌ Responde a una imagen." }, { quoted: msg });

  const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {}, { reuploadRequest: sock.updateMediaMessage });

  if (!fs.existsSync("./fotos_personajes")) fs.mkdirSync("./fotos_personajes");

  const path = `./fotos_personajes/${sender}_${nombre}.jpg`;
  fs.writeFileSync(path, buffer);

  per[sender] ??= {};
  per[sender][nombre] = { fotoPath: path, timestamp: Date.now() };

  guardar(personalizacionesFile, per);

  sock.sendMessage(from, { text: `✅ Foto asignada a ${nombre}` }, { quoted: msg });
}
