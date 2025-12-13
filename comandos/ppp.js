// comandos/ppp.js
import fs from "fs";

export const command = "ppp";

const TEMP_FILE = "./ppp_temp.json"; // temporal para guardar elecciones
const APUESTA_MINIMA = 20000;

// Inicializar archivo temporal si no existe
if (!fs.existsSync(TEMP_FILE)) fs.writeFileSync(TEMP_FILE, "{}");

// Función para formatear ID
function formatID(jid) {
  return jid.replace(/@.*$/, "@lid");
}

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const sender = formatID(msg.key.participant || msg.key.remoteJid);

  if (args.length < 2) {
    return sock.sendMessage(from, { text: "⚠️ Uso: .ppp @usuario <cantidad>" }, { quoted: msg });
  }

  // Rival y apuesta
  const rivalMention = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const rival = formatID(rivalMention);
  let apuesta = parseInt(args[1]);
  if (isNaN(apuesta)) return sock.sendMessage(from, { text: "⚠️ La apuesta debe ser un número." }, { quoted: msg });

  if (apuesta < APUESTA_MINIMA) apuesta = APUESTA_MINIMA;

  // Validar geos
  if ((geosDB[sender]?.geos || 0) < apuesta)
    return sock.sendMessage(from, { text: "❌ No tienes suficientes geos." }, { quoted: msg });

  if ((geosDB[rival]?.geos || 0) < apuesta)
    return sock.sendMessage(from, { text: "❌ El otro jugador no tiene suficientes geos." }, { quoted: msg });

  // Cargar elecciones temporales
  const tempData = JSON.parse(fs.readFileSync(TEMP_FILE, "utf8"));

  // Inicializar partida
  if (!tempData[from]) tempData[from] = {};

  // Mandar mensaje privado a ambos
  try {
    await sock.sendMessage(sender.replace("@lid", "@s.whatsapp.net"), { text: "✍️ Escribe tu elección: piedra, papel o tijera" });
    await sock.sendMessage(rival.replace("@lid", "@s.whatsapp.net"), { text: "✍️ Escribe tu elección: piedra, papel o tijera" });
  } catch (e) {
    return sock.sendMessage(from, { text: "❌ Error enviando mensajes privados." });
  }

  // Guardar la partida temporal
  tempData[from] = { sender, rival, apuesta, elecciones: {} };
  fs.writeFileSync(TEMP_FILE, JSON.stringify(tempData, null, 2));
}

// Función para registrar la respuesta privada
export async function handlePrivate(sock, msg, geosDB) {
  const sender = formatID(msg.key.participant || msg.key.remoteJid);
  const texto = (msg.message.conversation || "").toLowerCase();

  if (!["piedra", "papel", "tijera"].includes(texto)) return;

  const tempData = JSON.parse(fs.readFileSync(TEMP_FILE, "utf8"));

  // Buscar partida donde el jugador esté
  let partidaID = null;
  for (let key in tempData) {
    if (tempData[key].sender === sender || tempData[key].rival === sender) {
      partidaID = key;
      break;
    }
  }
  if (!partidaID) return;

  const partida = tempData[partidaID];
  partida.elecciones[sender] = texto;

  // Guardar elecciones
  fs.writeFileSync(TEMP_FILE, JSON.stringify(tempData, null, 2));

  // Verificar si ambos jugadores respondieron
  if (Object.keys(partida.elecciones).length < 2) return;

  const sElec = partida.elecciones[partida.sender];
  const rElec = partida.elecciones[partida.rival];
  let resultado = "";

  // Comparar elecciones
  if (sElec === rElec) resultado = "🤝 Empate, nadie gana geos.";
  else if (
    (sElec === "piedra" && rElec === "tijera") ||
    (sElec === "papel" && rElec === "piedra") ||
    (sElec === "tijera" && rElec === "papel")
  ) {
    resultado = `🎉 <@${partida.sender.split("@")[0]}> gana ${partida.apuesta} geos a <@${partida.rival.split("@")[0]}>`;
    geosDB[partida.sender].geos += partida.apuesta;
    geosDB[partida.rival].geos -= partida.apuesta;
  } else {
    resultado = `🎉 <@${partida.rival.split("@")[0]}> gana ${partida.apuesta} geos a <@${partida.sender.split("@")[0]}>`;
    geosDB[partida.rival].geos += partida.apuesta;
    geosDB[partida.sender].geos -= partida.apuesta;
  }

  // Enviar resultado al grupo
  await sock.sendMessage(partidaID, { text: resultado, mentions: [partida.sender, partida.rival] });

  // Borrar partida temporal
  delete tempData[partidaID];
  fs.writeFileSync(TEMP_FILE, JSON.stringify(tempData, null, 2));
}
