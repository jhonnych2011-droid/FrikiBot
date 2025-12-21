import { makeWASocket, useMultiFileAuthState, downloadMediaMessage } from "@whiskeysockets/baileys";
import QRCode from "qrcode-terminal";
import fs from "fs";
import { spawn, exec } from "child_process";
import path from "path";
import { tmpdir } from "os";

export const ownerNumber = ["+214461239546098"];

const GEO_FILE = "./geos.json";
let BOT_ON = true;
const SUERTE_ACTIVA = {};
const DUEÑO = "593961297479@s.whatsapp.net";
const OPENAI_KEY = "TU_API_KEY_AQUI";

if (!fs.existsSync(GEO_FILE)) fs.writeFileSync(GEO_FILE, "{}");

function safeReadJSON(file) {
try { return JSON.parse(fs.readFileSync(file, "utf8") || "{}"); }
catch { return {}; }
}

const file = './data/muteados.json';
function cargarMuteados() {
if (!fs.existsSync(file)) fs.writeFileSync(file, '{}');
return JSON.parse(fs.readFileSync(file));
}
function guardarMuteados(data) {
fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

async function startBot() {
const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
const sock = makeWASocket({ auth: state });

sock.ev.on("creds.update", saveCreds);
sock.ev.on("connection.update", update => {
const { connection, qr, lastDisconnect } = update;
if (qr) QRCode.generate(qr, { small: true });
if (connection === "open") console.log("✅ Bot conectado");
if (connection === "close") {
const code = lastDisconnect?.error?.output?.statusCode;
if (code !== 401) startBot();
else console.log("❌ Sesión inválida, elimina './auth_info' y vuelve a vincular.");
}
});

sock.ev.on("messages.upsert", async m => {
const msg = m.messages[0];
if (!msg || !msg.message) return;

const from = msg.key.remoteJid;
const sender = msg.key.participant || msg.key.remoteJid;
const text =
  msg.message.conversation?.trim?.() ||
  msg.message.extendedTextMessage?.text?.trim?.() ||
  msg.message.imageMessage?.caption?.trim?.() ||
  msg.message.videoMessage?.caption?.trim?.() ||
  "";

if (!text) return;
let data = safeReadJSON(GEO_FILE);
if (!data[sender]) data[sender] = { nombre: null, geos: 0, metal: 0, lastMine: 0 };

// --- BOT ON/OFF ---
if (text === ".off") {
  if (sender === DUEÑO || sender === (sock.user && sock.user.id)) {
    if (!BOT_ON) return sock.sendMessage(from, { text: "⚠️ El bot ya estaba apagado" });
    BOT_ON = false;
    return sock.sendMessage(from, { text: "BOT APAGADO" });
  }
}
if (text === ".on") {
  if (sender === DUEÑO || sender === (sock.user && sock.user.id)) {
    if (BOT_ON) return sock.sendMessage(from, { text: "⚠️ El bot ya estaba encendido" });
    BOT_ON = true;
    return sock.sendMessage(from, { text: "BOT ENCENDIDO" });
  }
}
if (!BOT_ON) return;

// --- Registrar ---
if (text.startsWith(".registrar")) {
  const nombre = text.replace(".registrar", "").trim();
  if (!nombre) return sock.sendMessage(from, { text: "Sos down, metele nombre 😒" });
  data[sender].nombre = nombre;
  fs.writeFileSync(GEO_FILE, JSON.stringify(data, null, 2));
  return sock.sendMessage(from, { text: `✅ Registrado como ${nombre}` });
}

// --- Personas ---
if (text === ".personas") {
  const total = Object.values(data).filter(u => u.nombre).length;
  return sock.sendMessage(from, { text: `👤 Personas registradas en BotDrio: ${total}` });
}

// --- Hola ---
if (text === ".hola") return sock.sendMessage(from, { text: "Hola, bienvenido a BotDrio" });

// --- Minar ---
if (text === ".minar") {
  const now = Date.now();
  const cooldown = 2 * 60 * 1000;
  if (now - data[sender].lastMine < cooldown) {
    const remaining = Math.ceil((cooldown - (now - data[sender].lastMine)) / 1000);
    return sock.sendMessage(from, { text: `⏳ Espera ${remaining} segundos para minar de nuevo.` });
  }
  const suerteActiva = SUERTE_ACTIVA[from] && SUERTE_ACTIVA[from] > Date.now();
  const gained = Math.floor(Math.random() * 200) + 1 + (suerteActiva ? Math.floor(Math.random() * 100) : 0);
  data[sender].geos += gained;
  data[sender].lastMine = now;
  const rareChance = Math.random();
  const prob = suerteActiva ? 0.02 : 0.001;
  let nombre = data[sender].nombre || "Usuario";
  let message = `${nombre} minó ${gained} 💎 Geos`;
  if (rareChance < prob) {
    data[sender].metal += 1;
    message += `\n⭐ ¡Encontraste un Metal Extraño!`;
  }
  fs.writeFileSync(GEO_FILE, JSON.stringify(data, null, 2));
  return sock.sendMessage(from, { text: message });
}

// --- Menú ---
if (text === ".menu") {
  const totalRegistrados = Object.values(data).filter(u => u.nombre).length;
  const menuText = `📢 POR FAVOR, REGISTRATE PARA TENER CUENTA EXACTA DE GENTE REGISTRADA

👤 Registrados: ${totalRegistrados}

📜 Comandos disponibles 📜
.hola - Saluda al bot
.minar - Minar 💎
.suerte1000 - Activa suerte pagando
.añadir suerte1000 - (Dueño)
.perfil - Ver tu perfil
.personas - Ver cuántas personas están registradas
.musica (nombre) - Reproducir música
.hidetag (mensaje) - Mensaje ocultando etiquetas
.chatgpt (temporalmente de la vrg) - Pregunta a la IA
.hornet - Imagen 🔥
.s - Crear sticker de imagen/video citado
.menu - Mostrar este menú
.hd - Mejorar imagen a HD (responde imagen)
.qc - Crear sticker de texto
.toimg - Convertir sticker a imagen
.on - Encender bot (Dueño / propio)
.off - Apagar bot (Dueño / propio)
.foto - Enviar foto de perfil (etiqueta)`;
await sock.sendMessage(from, { text: menuText });
}

// --- Hornet ---
if (text === ".hornet") {
  const imagenes = [
    "https://i.postimg.cc/sgSDYXQc/39670936043d4ba6a68e.jpg",
    "https://i.postimg.cc/5NXttpxc/39670936043d4be13afe.jpg",
    "https://i.postimg.cc/j2FdXn41/39670936043d4bfd8f83.jpg"
  ];
  const randomImg = imagenes[Math.floor(Math.random() * imagenes.length)];
  return sock.sendMessage(from, { image: { url: randomImg }, caption: "Sos alto cochino, boludo 😳🔥" });
}

// --- Musica ---
if (text.startsWith(".musica ")) {
  const songName = text.replace(".musica ", "").trim();
  if (!songName) return sock.sendMessage(from, { text: "❌ Escribe el nombre de la canción." });
  await sock.sendMessage(from, { text: `🎵 Buscando "${songName}"...` });
  try {
    const ytdlp = spawn("yt-dlp", [
      "-f", "bestaudio",
      "--no-playlist",
      "--extract-audio",
      "--audio-format", "mp3",
      "--output", "-",
      `ytsearch1:${songName}`
    ]);
    const chunks = [];
    ytdlp.stdout.on("data", chunk => chunks.push(chunk));
    ytdlp.stderr.on("data", err => console.error(err.toString()));
    ytdlp.on("close", async code => {
      if (code !== 0) return sock.sendMessage(from, { text: "❌ Error al descargar la canción." });
      const buffer = Buffer.concat(chunks);
      await sock.sendMessage(from, {
        audio: buffer,
        mimetype: "audio/mpeg",
        fileName: `${songName}.mp3`
      });
    });
  } catch (err) {
    console.error(err);
    await sock.sendMessage(from, { text: "❌ Ocurrió un error inesperado." });
  }
}

// --- ChatGPT ---
if (text.startsWith(".chatgpt ")) {
  await sock.sendMessage(from, { text: "❌ .chatgpt temporalmente no configurado." });
}

// --- Sticker .s ---
if (text === ".s") {
  try {
    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) return sock.sendMessage(from, { text: "❌ Responde a una imagen o video con .s" });
    const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {});
    const input = path.join(tmpdir(), `input_${Date.now()}`);
    const output = path.join(tmpdir(), `sticker_${Date.now()}.webp`);
    fs.writeFileSync(input, buffer);
    const ff = `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,format=rgba" -loop 0 -ss 0 -t 10 -an -vsync 0 "${output}"`;
    await new Promise((resolve, reject) => exec(ff, (err) => err ? reject(err) : resolve(true)));
    const stickerBuffer = fs.readFileSync(output);
    await sock.sendMessage(from, { sticker: stickerBuffer });
    fs.unlinkSync(input);
    fs.unlinkSync(output);
  } catch (err) {
    console.error(err);
    await sock.sendMessage(from, { text: "❌ Error al crear el sticker." });
  }
}

// --- Sticker a imagen .toimg ---
if (text === ".toimg") {
  try {
    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted || !quoted.stickerMessage) return sock.sendMessage(from, { text: "❌ Responde a un sticker con .toimg" });
    const buffer = await downloadMediaMessage({ message: quoted }, "buffer", {});
    const tempWebp = path.join(tmpdir(), `stck_${Date.now()}.webp`);
    const tempPng = path.join(tmpdir(), `stck_${Date.now()}.png`);
    fs.writeFileSync(tempWebp, buffer);
    await new Promise((resolve, reject) => exec(`ffmpeg -y -i "${tempWebp}" "${tempPng}"`, (err) => err ? reject(err) : resolve(true)));
    const imgBuffer = fs.readFileSync(tempPng);
    await sock.sendMessage(from, { image: imgBuffer });
    fs.unlinkSync(tempWebp);
    fs.unlinkSync(tempPng);
  } catch (err) {
    console.error(err);
    await sock.sendMessage(from, { text: "❌ Error al convertir el sticker en imagen." });
  }
}

// --- Suerte 1000 ---
if (text === ".suerte1000") {
  if (data[sender].geos < 1000) return sock.sendMessage(from, { text: "❌ No tienes 1000 Geos" });
  data[sender].geos -= 1000;
  SUERTE_ACTIVA[from] = Date.now() + 10 * 60 * 1000;
  fs.writeFileSync(GEO_FILE, JSON.stringify(data, null, 2));
  return sock.sendMessage(from, { text: "🎉 Suerte activada por 10 minutos" });
}

// --- Perfil ---
if (text === ".perfil") {
  const nombre = data[sender].nombre || "No registrado";
  const geos = data[sender].geos;
  const metal = data[sender].metal;
  return sock.sendMessage(from, { text: `👤 ${nombre}\n💎 Geos: ${geos}\n⭐ Metal: ${metal}` });
}

fs.writeFileSync(GEO_FILE, JSON.stringify(data, null, 2));

});

console.log("🤖 Bot iniciado, esperando mensajes…");
}

startBot();
