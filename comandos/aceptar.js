import partidas, {
  crearPartida,
  obtenerPartida,
  borrarPartida
} from "./partidasTTT.js";

// Solo deja el ID puro en números
function soloID(jid) {
  if (!jid) return "";
  return jid.replace(/[^0-9]/g, "");
}

export const command = "aceptar";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const author = msg.key.participant || msg.key.remoteJid;

  const partida = obtenerPartida(from);

  if (!partida) {
    return sock.sendMessage(from, { text: "❌ No hay ninguna partida pendiente." });
  }

  const autorID = soloID(author);
  const rivalID = soloID(partida.rival);

  console.log("Autor:", autorID);
  console.log("Rival:", rivalID);

  if (autorID !== rivalID) {
    return sock.sendMessage(from, { text: "❌ Tú no eres el desafiado." });
  }

  partida.iniciada = true;

  return sock.sendMessage(from, {
    text: "🎮 ¡Partida iniciada! Mueve con: *.mover <1-9>*"
  });
}
