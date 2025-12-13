// comandos/dado.js
export const command = "dado";

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const author = msg.key.participant || from;

  if (!geosDB[author]) geosDB[author] = { geos: 0 };

  if (args.length < 2) {
    return sock.sendMessage(from, {
      text: "🎲 Uso: .dado <geos> <par|impar>"
    });
  }

  let cantidad = parseInt(args[0]);
  let eleccion = args[1].toLowerCase();

  if (isNaN(cantidad) || cantidad <= 0) {
    return sock.sendMessage(from, { text: "❌ Cantidad inválida." });
  }

  if (!["par", "impar"].includes(eleccion)) {
    return sock.sendMessage(from, { text: "❌ Usa par o impar." });
  }

  if (geosDB[author].geos < cantidad) {
    return sock.sendMessage(from, { text: "❌ No tienes geos suficientes." });
  }

  const numero = Math.floor(Math.random() * 6) + 1;
  const resultado = (numero % 2 === 0) ? "par" : "impar";

  let texto =
`🎲 DADO
Número: *${numero}*
Salió: *${resultado}*`;

  if (resultado === eleccion) {
    const ganancia = Math.floor(cantidad * 0.3);
    geosDB[author].geos += ganancia;
    texto += `\n✅ Ganaste +${ganancia} geos`;
  } else {
    geosDB[author].geos -= cantidad;
    texto += `\n❌ Perdiste -${cantidad} geos`;
  }

  await sock.sendMessage(from, { text: texto });
}
