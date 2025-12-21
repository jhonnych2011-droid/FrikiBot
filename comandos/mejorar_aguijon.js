import fs from "fs";

export const command = "mejorar_aguijon";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const bossUsers = JSON.parse(fs.readFileSync("./data/bossUsers.json"));
  const geos = JSON.parse(fs.readFileSync("./data/geos.json"));

  // Si no existe el usuario en geos.json, lo crea
  if (!geos[sender]) {
    geos[sender] = {
      geos: 0,
      aguijon: 1
    };
  }

  // Si no tiene aguijon, lo crea en automático
  if (!geos[sender].aguijon) {
    geos[sender].aguijon = 1;
  }

  const nvl = geos[sender].aguijon;
  if (nvl >= 4)
    return sock.sendMessage(from, { text: "🔥 Tu aguijón ya está en el nivel máximo (4)." });

  const bosses = bossUsers.bossesCompletados[sender] || 0;
  const necesarios = nvl * 5;

  if (bosses < necesarios)
    return sock.sendMessage(from, {
      text: `❌ Te faltan bosses.\nLlevas ${bosses}/${necesarios} bosses con +10 ataques.`
    });

  const costo = 20000 * nvl;

  if (geos[sender].geos < costo)
    return sock.sendMessage(from, {
      text: `❌ Te faltan ${costo - geos[sender].geos} geos para mejorar.`
    });

  geos[sender].geos -= costo;
  geos[sender].aguijon = nvl + 1;

  fs.writeFileSync("./data/geos.json", JSON.stringify(geos, null, 2));

  sock.sendMessage(from, { text: `✅ Aguijón mejorado a nivel ${nvl + 1}` });
}
