import { makeWASocket, useMultiFileAuthState, downloadMediaMessage } from "@whiskeysockets/baileys";
import QRCode from "qrcode-terminal";
import fs from "fs";
import OpenAI from "openai";
import { spawn, exec } from "child_process";
import path from "path";
import { tmpdir } from "os";

const GEO_FILE = "./geos.json";
const PERSONAJES_FILE = "./personajes.json";
const MUTE_FILE = "./muteados.json";
const CATEGORIAS = ["Común","Raro","Épico","Legendario"];
let BOT_ON = true;
const SUERTE_ACTIVA = {};
const DUEÑO = "991944530@s.whatsapp.net";
const OWNER_LIDS = ["164055369146382@lid","214461239546098@lid","123025596936285@lid","79251156033587@lid"];

let muteados = {};
if (!fs.existsSync(GEO_FILE)) fs.writeFileSync(GEO_FILE, "{}");
if (!fs.existsSync(PERSONAJES_FILE)) fs.writeFileSync(PERSONAJES_FILE, "[]");
if (!fs.existsSync(MUTE_FILE)) fs.writeFileSync(MUTE_FILE, "{}");
try { muteados = JSON.parse(fs.readFileSync(MUTE_FILE, "utf8")); } catch {}

const openai = new OpenAI({ apiKey: "TU_API_KEY_AQUI" });

async function startBot() {
try {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
  const sock = makeWASocket({ auth: state, browser: ["BotDrio","Chrome","1.0"] });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", update => {
    const { connection, qr, lastDisconnect } = update;
    if (qr) QRCode.generate(qr, { small: true });
    if (connection === "open") console.log("✅ Bot conectado");
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(`⚠️ Conexión cerrada (${code})`);
      if (code !== 401) setTimeout(() => startBot(), 5000);
      else console.log("❌ Sesión inválida. Elimina './auth_info' y vuelve a vincular.");
    }
  });

  sock.ev.on("messages.upsert", async m => {
    const msg = m.messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;
    const text =
      msg.message.conversation?.trim() ||
      msg.message.extendedTextMessage?.text?.trim() ||
      msg.message.imageMessage?.caption?.trim() ||
      msg.message.videoMessage?.caption?.trim() ||
      "";

    if (!text) return;

    // eliminar mensajes de muteados
    if (from.endsWith("@g.us") && muteados[from]?.includes(sender)) {
      try { await sock.sendMessage(from, { delete: msg.key }); } catch {}
      return;
    }

    if (!BOT_ON && !(OWNER_LIDS.includes(sender.split("@")[0]+"@lid"))) return;

    let data = JSON.parse(fs.readFileSync(GEO_FILE, "utf8"));
    if (!data[sender]) data[sender] = { nombre:null, geos:0, metal:0, lastMine:0, personajes:[] };

    // ON / OFF
    if (text === ".off" && OWNER_LIDS.includes(sender.split("@")[0]+"@lid")) {
      BOT_ON = false;
      return sock.sendMessage(from,{text:"BOT APAGADO"});
    }
    if (text === ".on" && OWNER_LIDS.includes(sender.split("@")[0]+"@lid")) {
      BOT_ON = true;
      return sock.sendMessage(from,{text:"BOT ENCENDIDO"});
    }

    // REGISTRO
    if (text.startsWith(".registrar")) {
      const nombre = text.replace(".registrar","").trim();
      if (!nombre) return sock.sendMessage(from,{text:"Sos down, metele nombre 😒"});
      data[sender].nombre = nombre;
      fs.writeFileSync(GEO_FILE, JSON.stringify(data,null,2));
      return sock.sendMessage(from,{text:`✅ Registrado como ${nombre}`});
    }

    if (text === ".personas") {
      const total = Object.values(data).filter(u=>u.nombre).length;
      return sock.sendMessage(from,{text:`👤 Personas registradas en BotDrio: ${total}`});
    }

    if (text === ".hola") return sock.sendMessage(from,{text:"Hola, bienvenido a BotDrio"});

    // MINAR
    if (text === ".minar") {
      const now = Date.now();
      const cooldown = 2*60*1000;
      if (now - data[sender].lastMine < cooldown) {
        const remaining = Math.ceil((cooldown - (now - data[sender].lastMine))/1000);
        return sock.sendMessage(from,{text:`⏳ Espera ${remaining}s para minar otra vez.`});
      }
      const gained = Math.floor(Math.random()*200)+1;
      data[sender].geos += gained;
      data[sender].lastMine = now;
      const suerteActiva = SUERTE_ACTIVA[from] && SUERTE_ACTIVA[from] > Date.now();
      const prob = suerteActiva ? 0.02 : 0.001;
      let msgTxt = `${data[sender].nombre || "Usuario"} minó ${gained} 💎 Geos`;
      if (Math.random() < prob) {
        data[sender].metal++;
        msgTxt += "\n⭐ ¡Encontraste un Metal Extraño!";
      }
      fs.writeFileSync(GEO_FILE, JSON.stringify(data,null,2));
      return sock.sendMessage(from,{text:msgTxt});
    }

    // SUERTE1000
    if (text === ".suerte1000") {
      SUERTE_ACTIVA[from] = Date.now() + 10*60*1000;
      return sock.sendMessage(from,{text:"🍀 Suerte activada por 10 minutos!"});
    }

    // PERFIL
    if (text === ".perfil") {
      const perfil = data[sender];
      return sock.sendMessage(from,{text:`📜 ${perfil.nombre||"Usuario"}\n💎 Geos: ${perfil.geos}\n⭐ Metal Extraño: ${perfil.metal}`});
    }

    // MENU
    if (text === ".menu") {
      const totalRegistrados = Object.values(data).filter(u=>u.nombre).length;
      const menu = `📢 POR FAVOR, REGISTRATE PARA TENER CUENTA EXACTA DE GENTE REGISTRADA
👤 Registrados: ${totalRegistrados}

📜 Comandos disponibles 📜

.hola - Saludar al bot

RPG:
.minar - Minar Geos

ÚTILES🔧:
.perfil - Ver tu perfil y geos
.hidetag (mensaje) - Menciona a todos sin los "@"
.chatgpt (temporalmente de la vrg)
.hornet - Imagen aleatoria de hornet🥵
.s - Crear sticker de imagen/video citado
.toimg - Convertir sticker a imagen

INFO📰:
.personas - Total de personas registradas

MÚSICA Y AUDIOS🎵🎶:
.musica (nombre) - Descargar canción en MP3

OWNERS👨🏻‍💻:
.mute @usuario - Silenciar usuario
.unmute @usuario - Quitar silencio
.on / .off - Encender o apagar el bot`;
      return sock.sendMessage(from,{text:menu});
    }

    // MUTE
    if (text.startsWith(".mute") || text.startsWith(".unmute")) {
      if (!from.endsWith("@g.us")) return sock.sendMessage(from,{text:"❌ Solo funciona en grupos"});
      const senderNumber = sender.split("@")[0]+"@lid";
      if (!OWNER_LIDS.includes(senderNumber)) return sock.sendMessage(from,{text:"❌ No tienes permisos"});
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      if (!mention) return sock.sendMessage(from,{text:"⚠️ Menciona al usuario"});
      if (!muteados[from]) muteados[from] = [];

      if (text.startsWith(".mute")) {
        if (!muteados[from].includes(mention)) {
          muteados[from].push(mention);
          fs.writeFileSync(MUTE_FILE, JSON.stringify(muteados,null,2));
          await sock.sendMessage(from,{text:"🔇 Usuario muteado", mentions:[mention]});
        } else sock.sendMessage(from,{text:"⚠️ Ya estaba muteado"});
      } else {
        const i = muteados[from].indexOf(mention);
        if (i !== -1) {
          muteados[from].splice(i,1);
          fs.writeFileSync(MUTE_FILE, JSON.stringify(muteados,null,2));
          await sock.sendMessage(from,{text:"🔊 Usuario desmuteado", mentions:[mention]});
        } else sock.sendMessage(from,{text:"⚠️ No estaba muteado"});
      }
    }

  });

  console.log("🤖 Bot listo con todos los comandos activados.");

} catch (err) {
  console.error("❌ Error crítico:", err);
  setTimeout(()=>startBot(),5000);
}
}

startBot();
