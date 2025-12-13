// partidasTTT.js
const partidas = {};

export function crearPartida(grupo, jugador1, jugador2) {
  partidas[grupo] = {
    jugador1,
    jugador2,
    turno: jugador1,
    tablero: Array(9).fill(" "),
    estado: "pendiente",
    apuesta: 0,
    timeout: null
  };
}

export function obtenerPartida(grupo) {
  return partidas[grupo] || null;
}

export function borrarPartida(grupo) {
  delete partidas[grupo];
}

export default partidas;
