import fs from "fs";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));
function esOwner(jid) {
  return owners.includes(fixID(jid));
}

export const command = "agregar";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  if (!esOwner(sender)) {
    return sock.sendMessage(from, { text: "❌ No tienes permisos para usar este comando." });
  }

  if (args.length < 4) {
    return sock.sendMessage(from, {
      text: "⚠️ Uso correcto:\n.agregar <nombre> <precio> <calidad> <stock> <multiplicador(opcional)> <limite(opcional)>"
    });
  }

  // Buscar precio
  let precioIndex = args.findIndex(a => !isNaN(a));
  if (precioIndex === -1) {
    return sock.sendMessage(from, { text: "⚠️ No se encontró un precio válido." });
  }

  const nombre = args.slice(0, precioIndex).join(" ");
  const precio = Number(args[precioIndex]);
  const calidad = args[precioIndex + 1]?.toLowerCase();
  const stock = Number(args[precioIndex + 2]);
  const multiplicador = args[precioIndex + 3] ? Number(args[precioIndex + 3]) : 1;
  const limite = args[precioIndex + 4] ? Number(args[precioIndex + 4]) : null;

  if (!nombre || isNaN(precio) || !calidad || isNaN(stock)) {
    return sock.sendMessage(from, { text: "⚠️ Faltan argumentos obligatorios." });
  }

  // Validar calidad
  const permitidas = ["comun", "raro", "epico", "legendario", "secreto", "og"];
  if (!permitidas.includes(calidad)) {
    return sock.sendMessage(from, {
      text: "⚠️ Calidad inválida.\nCalidades permitidas:\n" + permitidas.join(", ")
    });
  }

  // Cargar archivo
  const file = "./personajes.json";
  let personajes = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};

  if (personajes[nombre]) {
    return sock.sendMessage(from, { text: "⚠️ Ese personaje ya existe en la tienda." });
  }

  // Guardar como números reales, no strings
  personajes[nombre] = {
    precio,
    calidad,
    stock,
    multiplicador,
    limite
  };

  fs.writeFileSync(file, JSON.stringify(personajes, null, 2));

  return sock.sendMessage(from, {
    text:
      `✅ Personaje añadido a la tienda!\n\n` +
      `📛 Nombre: ${nombre}\n` +
      `💰 Precio: ${precio}\n` +
      `⭐ Calidad: ${calidad}\n` +
      `📦 Stock: ${stock}\n` +
      `🌀 Multiplicador: x${multiplicador}\n` +
      `📌 Límite por persona: ${limite ?? "Sin límite"}`
  });
}
