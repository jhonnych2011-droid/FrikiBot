import partidas, {
  crearPartida,
  obtenerPartida,
  borrarPartida
} from "./partidasTTT.js";

export const command = "mover";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const author = msg.key.participant || from;

  const partida = obtenerPartida(from);

  if (!partida) {
    return sock.sendMessage(from, { text: "❌ No hay partida activa." });
  }

  if (!partida.iniciada) {
    return sock.sendMessage(from, { text: "❌ La partida aún no inicia. El rival debe aceptar." });
  }

  if (author !== partida.turno) {
    return sock.sendMessage(from, { text: "⏳ No es tu turno." });
  }

  const pos = parseInt(args[0]);
  if (!pos || pos < 1 || pos > 9) {
    return sock.sendMessage(from, { text: "🎮 Usa: .mover <1-9>" });
  }

  if (partida.tablero[pos - 1] !== " ") {
    return sock.sendMessage(from, { text: "❌ Esa casilla ya está ocupada." });
  }

  partida.tablero[pos - 1] = author === partida.j1 ? "❌" : "⭕";

  // revisa si hay ganador
  const combos = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  let ganador = null;
  for (const c of combos) {
    const [a,b,c2] = c;
    if (
      partida.tablero[a] !== " " &&
      partida.tablero[a] === partida.tablero[b] &&
      partida.tablero[b] === partida.tablero[c2]
    ) {
      ganador = author;
    }
  }

  if (ganador) {
    await sock.sendMessage(from, {
      text: `🎉 ¡Ganó <@${ganador.replace("@s.whatsapp.net", "")}>!`,
      mentions: [ganador]
    });
    borrarPartida(from);
    return;
  }

  // cambiar turno
  partida.turno = author === partida.j1 ? partida.j2 : partida.j1;

  return sock.sendMessage(from, { text: "✔️ Movimiento registrado." });
}
