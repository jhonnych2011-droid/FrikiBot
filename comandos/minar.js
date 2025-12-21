import fs from "fs";

export const command = "minar";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

export async function run(sock, msg, args, geosDB) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  // Inicializar si no existe
  if (!geosDB[sender]) geosDB[sender] = { geos: 0, lastMinar: 0 };

  const cooldown = 5 * 60 * 1000;
  const ahora = Date.now();

  if (ahora - geosDB[sender].lastMinar < cooldown) {
    const tiempoRestante = Math.ceil(
      (cooldown - (ahora - geosDB[sender].lastMinar)) / 1000
    );
    return sock.sendMessage(
      from,
      { text: `⏳ Espera ${tiempoRestante} segundos antes de minar de nuevo.` },
      { quoted: msg }
    );
  }

  // ==== Cargar inventario y personajes ====
  const inventario = JSON.parse(fs.readFileSync("./inventario.json", "utf8"));
  const personajes = JSON.parse(fs.readFileSync("./personajes.json", "utf8"));

  const lista = inventario[sender] || [];

  // ==== Tomar el multiplicador más alto ====
  let multiplicador = 1;

  for (const nombre of lista) {
    if (personajes[nombre]?.multiplicador) {
      const multi = Number(personajes[nombre].multiplicador);
      if (multi > multiplicador) multiplicador = multi;
    }
  }

  // === Minado base ===
  const base = Math.floor(Math.random() * 151) + 50;

  // === Total ganado ===
  const totalGanado = base * multiplicador;

  geosDB[sender].geos += totalGanado;
  geosDB[sender].lastMinar = ahora;

  await sock.sendMessage(
    from,
    {
      text:
        `⛏️ *Minado*: *${base}*\n` +
        `⚡ Multiplicador usado: *x${multiplicador}*\n` +
        `💰 Total ganado: *${totalGanado}*`,
    },
    { quoted: msg }
  );
}

