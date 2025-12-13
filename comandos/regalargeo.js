// comandos/regalar.js
import fs from 'fs';
import path from 'path';

export const command = "regalar";

/**
 * Comando para regalar geos a otro usuario
 * @param {import('@whiskeysockets/baileys').AnyWASocket} sock
 * @param {import('@whiskeysockets/baileys').proto.IWebMessageInfo} msg
 * @param {string[]} args
 * @param {Object} geosDB
 */
export async function run(sock, msg, args, geosDB) {
  try {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid || from;

    // ------------------------------
    // Validar mención
    // ------------------------------
    const menciones = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!menciones || menciones.length === 0) {
      return sock.sendMessage(from, {
        text: "❌ Debes mencionar a alguien.\nEj: .regalar @usuario 100"
      }, { quoted: msg });
    }
    const usuarioDestino = menciones[0];

    // ------------------------------
    // Validar cantidad
    // ------------------------------
    const cantidadArg = args.find(a => !a.includes('@'));
    const cantidad = parseInt(cantidadArg);
    if (!cantidad || cantidad <= 0) {
      return sock.sendMessage(from, {
        text: "❌ Ingresa una cantidad válida."
      }, { quoted: msg });
    }

    // ------------------------------
    // Calcular IVA
    // ------------------------------
    const iva = Math.round(cantidad * 0.15);
    const total = cantidad + iva;

    // ------------------------------
    // Inicializar perfiles automáticamente
    // ------------------------------
    if (!geosDB[sender]) geosDB[sender] = { geos: 0 };
    if (!geosDB[usuarioDestino]) geosDB[usuarioDestino] = { geos: 0 };

    // ------------------------------
    // Verificar fondos
    // ------------------------------
    if (geosDB[sender].geos < total) {
      return sock.sendMessage(from, {
        text: `❌ No tienes geos suficientes.\nNecesitas: ${total}`
      }, { quoted: msg });
    }

    // ------------------------------
    // Realizar transacción
    // ------------------------------
    geosDB[sender].geos -= total;
    geosDB[usuarioDestino].geos += cantidad;

    // ------------------------------
    // Guardar geosDB de forma segura
    // ------------------------------
    const geosPath = path.resolve('./geos.json');
    fs.writeFileSync(geosPath, JSON.stringify(geosDB, null, 2), { encoding: 'utf-8' });

    // ------------------------------
    // Mensaje final con menciones
    // ------------------------------
    const nombreDestino = usuarioDestino.split("@")[0];
    const mensaje =
`🎁 *Regalo enviado*

Regalaste *${cantidad}* geo a @${nombreDestino}
IVA: *15%*
Total descontado: *${total}*`;

    await sock.sendMessage(from, { text: mensaje, mentions: [usuarioDestino] }, { quoted: msg });

  } catch (err) {
    console.error("❌ Error en comando 'regalar':", err);
    const from = msg.key.remoteJid;
    if (sock.ws.readyState === 1) {
      await sock.sendMessage(from, { text: "❌ Ha ocurrido un error ejecutando el comando." }, { quoted: msg });
    }
  }
}
