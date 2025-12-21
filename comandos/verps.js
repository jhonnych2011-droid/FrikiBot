import fs from "fs";

export const command = "verps";

const inventarioFile = "./inventario.json";
const personajesFile = "./personajes.json";
const personalizacionesFile = "./personalizaciones.json";
const nombresFile = "./nombres_personalizados.json";

const fixID = jid => jid.replace(/@.+$/, "@lid");
const cargar = (f, d = {}) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : d;

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || from);

  if (!args.length)
    return sock.sendMessage(from, { text: "Uso: .verps <personaje>" }, { quoted: msg });

  const nombre = args.join(" ");
  const inv = cargar(inventarioFile);
  const pers = cargar(personajesFile);
  const per = cargar(personalizacionesFile);
  const nombres = cargar(nombresFile);

  if (!inv[sender]?.includes(nombre))
    return sock.sendMessage(from, { text: "❌ No tienes ese personaje." }, { quoted: msg });

  const p = pers[nombre];
  const n = nombres[sender]?.[nombre]?.nombrePersonalizado || nombre;
  const d = per[sender]?.[nombre];

  let texto = `🎭 *${n}*\n💎 ${p.precio}\n⭐ ${p.calidad}`;
  if (d?.descripcion) texto += `\n\n📝 ${d.descripcion}`;

  if (d?.fotoPath && fs.existsSync(d.fotoPath)) {
    return sock.sendMessage(from, { image: fs.readFileSync(d.fotoPath), caption: texto }, { quoted: msg });
  }

  sock.sendMessage(from, { text: texto }, { quoted: msg });
}

