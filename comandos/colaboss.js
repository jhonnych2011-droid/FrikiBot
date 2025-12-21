import fs from "fs";
import path from "path";

export const command = "colaboss";

const BOSS_PATH = path.join(process.cwd(), "bossActive.json");
const BOSS_QUEUE_PATH = path.join(process.cwd(), "bossQueue.json");

function loadJSON(path, def = {}) {
    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, JSON.stringify(def, null, 2));
        return def;
    }
    
    try {
        const content = fs.readFileSync(path, "utf8").trim();
        if (!content || content === "null") {
            return def;
        }
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error:`, error);
        return def;
    }
}

export async function run(sock, msg) {
    const from = msg.key.remoteJid;
    
    const bossActual = loadJSON(BOSS_PATH, {});
    const colaBosses = loadJSON(BOSS_QUEUE_PATH, []);
    
    let mensaje = "📋 *COLA DE BOSSES*\n\n";
    
    // Mostrar boss actual
    if (bossActual && bossActual.vida > 0) {
        const vidaPorcentaje = (bossActual.vida / bossActual.maxVida) * 100;
        mensaje += `👑 *BOSS ACTUAL*\n`;
        mensaje += `🗡️ ${bossActual.nombre}\n`;
        mensaje += `❤️ Vida: ${bossActual.vida}/${bossActual.maxVida} (${vidaPorcentaje.toFixed(1)}%)\n`;
        mensaje += `💰 Recompensa: ${bossActual.recompensa} geos\n`;
        mensaje += `👥 Atacantes: ${Object.keys(bossActual.enemigos || {}).length}\n\n`;
    } else {
        mensaje += `👑 *BOSS ACTUAL:* Ninguno\n\n`;
    }
    
    // Mostrar cola
    if (colaBosses.length > 0) {
        mensaje += `⏳ *BOSSES EN ESPERA* (${colaBosses.length})\n\n`;
        
        colaBosses.slice(0, 5).forEach((boss, index) => {
            mensaje += `${index + 1}. ${boss.nombre}\n`;
            mensaje += `   ❤️ Vida: ${boss.vida}\n`;
            mensaje += `   💰 Recompensa: ${boss.recompensa} geos\n`;
            mensaje += `   ⚔️ Costo: ${boss.costoAtaque} geos\n`;
            if (index < colaBosses.length - 1 && index < 4) mensaje += `\n`;
        });
        
        if (colaBosses.length > 5) {
            mensaje += `\n...y ${colaBosses.length - 5} más`;
        }
    } else {
        mensaje += `📭 *COLA VACÍA*\n`;
        mensaje += `👑 Owners pueden agregar bosses con *.añadirboss*`;
    }
    
    await sock.sendMessage(from, { text: mensaje });
}
