// comandos/ruleta.js
import fs from "fs";

export const command = "ruleta";
const COOLDOWN = 6 * 60 * 1000; // 16 minutos
const cooldowns = {};

function asegurarPerfil(geosDB, sender) {
  if (!geosDB[sender] || typeof geosDB[sender] !== "object" || isNaN(geosDB[sender].geos)) {
    geosDB[sender] = { geos: 1000, lastMinar: 0, cooldownRobar: 0, lastTrabajar: 0 };
  }
}

export async function run(sock, msg, args, geosDB) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    if (!from.endsWith("@g.us")) return sock.sendMessage(from, { text: "❌ Este comando solo funciona en grupos." });

    asegurarPerfil(geosDB, sender);

    const now = Date.now();
    if (cooldowns[sender] && now - cooldowns[sender] < COOLDOWN) {
        const restante = Math.ceil((COOLDOWN - (now - cooldowns[sender])) / 60000);
        return sock.sendMessage(from, { text: `⏱️ Debes esperar ${restante} min para volver a usar la ruleta.` });
    }

    if (args.length < 2) return sock.sendMessage(from, { text: "Uso: .ruleta <cantidad/todo> <par o impar/ rojo o negro/ 0 - 36>" });

    let cantidad;
    if (args[0].toLowerCase() === "todo") {
        cantidad = geosDB[sender].geos;
        if (cantidad <= 0) return sock.sendMessage(from, { text: "❌ No tienes geos para apostar." });
    } else {
        cantidad = parseInt(args[0]);
        if (isNaN(cantidad) || cantidad <= 0) return sock.sendMessage(from, { text: "❌ Cantidad inválida." });
        if (cantidad > geosDB[sender].geos) return sock.sendMessage(from, { text: "❌ No tienes suficientes geos." });
    }

    const apuesta = args[1].toLowerCase();

    // Resultado aleatorio
    const numero = Math.floor(Math.random() * 37);
    const color = numero === 0 ? "verde" : (numero % 2 === 0 ? "negro" : "rojo");
    const esPar = numero !== 0 && numero % 2 === 0;

    let gano = false;
    let ganancia = 0;

    if (!isNaN(apuesta)) {
        if (parseInt(apuesta) === numero) { gano = true; ganancia = cantidad * 35; }
    } else if (["rojo", "negro"].includes(apuesta)) {
        if (apuesta === color) { gano = true; ganancia = cantidad * 2; }
    } else if (["par", "impar"].includes(apuesta)) {
        if ((apuesta === "par" && esPar) || (apuesta === "impar" && !esPar && numero !== 0)) { gano = true; ganancia = cantidad * 2; }
    } else return sock.sendMessage(from, { text: "❌ Apuesta inválida. Opciones: rojo, negro, par, impar, 0-36" });

    if (gano) {
        geosDB[sender].geos += ganancia;
        sock.sendMessage(from, { text: `🎉 La ruleta salió ${numero} (${color})\n✅ Ganaste ${ganancia} geos!` });
    } else {
        geosDB[sender].geos -= cantidad;
        sock.sendMessage(from, { text: `🎲 La ruleta salió ${numero} (${color})\n❌ Perdiste ${cantidad} geos.` });
    }

    cooldowns[sender] = now;

    fs.writeFileSync("./geos.json", JSON.stringify(geosDB, null, 2));
}
