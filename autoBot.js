
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import fs from "fs";
import P from "pino";
import qrcode from "qrcode-terminal";

const OWNER_ID = "214461239546098@lid";

let groupToSend = null;
let intervalo = null;
let segundos = 0;

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auto_auth");

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    browser: ["Mac OS", "Chrome", "14.4.1"], // <-- IMPORTANTE PARA QUE SALGA EL QR
  });

  sock.ev.on("creds.update", saveCreds);

  // ================================
  //     MANEJO DE QR EXACTO COMO TU BOT.JS
  // ================================
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.clear();
      console.log("📌 Escanea este QR para el autoBot:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("✅ AutoBot conectado con éxito.");
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log("❌ Conexión cerrada:", reason);

      if (reason !== DisconnectReason.loggedOut) {
        console.log("🔄 Reintentando conexión...");
        iniciarBot();
      } else {
        console.log("❌ Sesión cerrada completamente. Escanea el QR otra vez.");
      }
    }
  });

  // ================================
  //       LECTURA DE MENSAJES
  // ================================
  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const esOwner = sender === OWNER_ID;

    const texto =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    // ------------------------------------
    //   .aqui <segundos> (SOLO OWNER)
    // ------------------------------------
    if (texto.startsWith(".aqui")) {
      if (!esOwner) return;

      const partes = texto.trim().split(" ");
      if (!partes[1]) {
        await sock.sendMessage(from, { text: "⛔ Usa: .aqui 10" });
        return;
      }

      segundos = parseInt(partes[1]);
      if (isNaN(segundos) || segundos < 5) {
        await sock.sendMessage(from, { text: "⛔ Mínimo 5 segundos." });
        return;
      }

      groupToSend = from;

      if (intervalo) clearInterval(intervalo);

      intervalo = setInterval(async () => {
        await sock.sendMessage(groupToSend, { text: ".buy Xmas Lucky Block 15" });
      }, segundos * 1000);

      await sock.sendMessage(from, { text: `✅ Auto activado cada ${segundos} segundos.` });
    }

    // ------------------------------------
    //             .stopauto
    // ------------------------------------
    if (texto === ".stopauto") {
      if (!esOwner) return;

      if (intervalo) {
        clearInterval(intervalo);
        intervalo = null;
        await sock.sendMessage(from, { text: "🛑 Auto mensaje detenido." });
      } else {
        await sock.sendMessage(from, { text: "⚠️ No hay auto activo." });
      }
    }
  });
}

iniciarBot();
