// comandos/crearboss.js
import fs from "fs";

export const command = "crearboss";

function load(path, def) {
  if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify(def, null, 2));
  return JSON.parse(fs.readFileSync(path));
}

function save(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

const QUEUE = "./bossQueue.json";
const OWN = "./owners.json";

function normalizarId(id) {
  return id.replace(/(@.+)/, "") + "@s.whatsapp.net";
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = normalizarId(msg.key.participant || msg.key.remoteJid);

  const owners = load(OWN, []).map(normalizarId);

  if (!owners.includes(sender)) {
    return sock.sendMessage(from, { text: "❌ Solo owners pueden usar este comando." });
  }

  if (args.length < 5) {
    return sock.sendMessage(from, {
      text: "Uso:\n.crearboss <nombre> <vida> <recompensa> <costo_por_ataque> <imagen_url>"
    });
  }

  const [nombre, vida, recompensa, costoAtaque, img] = args;

  const bossData = {
    active: false,        
    nombre,
    vida: Number(vida),
    maxVida: Number(vida),
    recompensa: Number(recompensa),
    costoAtaque: Number(costoAtaque),
    img,
    enemigos: {}
  };

  let queue = load(QUEUE, []);
  queue.push(bossData);
  save(QUEUE, queue);

  return sock.sendMessage(from, {
    image: { url: img },
    caption:
`🎉 *Boss añadido a la cola*

📛 Nombre: ${nombre}
❤️ Vida: ${vida}
💰 Recompensa total: ${recompensa}
💸 Costo por atacar: ${costoAtaque}
🖼 Imagen cargada correctamente

📌 Este boss aparecerá automáticamente
cuando maten al boss actual.`
  });
}
