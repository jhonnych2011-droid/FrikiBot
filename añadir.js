import fs from "fs";

export const command = "añadir";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8")).map(o => o.split("@")[0]);
function esOwner(jid) {
  return owners.includes(fixID(jid).split("@")[0]);
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!esOwner(sender)) {
    return sock.sendMessage(from, { text: "❌ No tienes permisos para usar este comando." }, { quoted: msg });
  }

  if (args.length < 4) {
    return sock.sendMessage(from, { text: "⚠️ Uso correcto:\n.añadir <nombre> <precio> <calidad> <stock> [multiplicador] [limite]" }, { quoted: msg });
  }

  const [nombre, precioRaw, calidadRaw, stockRaw, multiplicadorRaw, limiteRaw] = args;
  const precio = parseInt(precioRaw);
  const calidad = calidadRaw.toLowerCase();
  const stock = parseInt(stockRaw);
  const multiplicador = multiplicadorRaw ? parseFloat(multiplicadorRaw) : 1;
  const limite = limiteRaw ? parseInt(limiteRaw) : null;

  const calidadesPermitidas = ["comun","raro","epico","legendario","secreto","og"];
  if (!calidadesPermitidas.includes(calidad)) {
    return sock.sendMessage(from, { text: "⚠️ Calidad inválida. Permitidas: " + calidadesPermitidas.join(", ") }, { quoted: msg });
  }

  const file = "./personajes.json";
  let personajes = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};

  if (personajes[nombre]) {
    return sock.sendMessage(from, { text: "⚠️ Ese personaje ya existe en la tienda." }, { quoted: msg });
  }

  personajes[nombre] = {
    precio: precio.toString(),
    calidad,
    stock: stock.toString(),
    multiplicador: multiplicador.toString(),
    limite: limite ? limite.toString() : null
  };

  fs.writeFileSync(file, JSON.stringify(personajes, null, 2));

  await sock.sendMessage(
    from,
    {
      text: 
        `✅ *Personaje añadido a la tienda*\n\n` +
        `📛 Nombre: *${nombre}*\n` +
        `💰 Precio: *${precio}*\n` +
        `⭐ Calidad: *${calidad}*\n` +
        `📦 Stock: *${stock}*\n` +
        `🌀 Multiplicador: *x${multiplicador}*\n` +
        `📌 Límite por persona: *${limite ? limite : "Sin límite"}*`
    },
    { quoted: msg }
  );
}
