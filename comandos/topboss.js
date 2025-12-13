import fs from "fs";
import path from "path";

export const command = "topboss";

const BOSS_PATH = path.join(process.cwd(), "bossActive.json");
const USERS_PATH = path.join(process.cwd(), "usuarios.json");

function loadJSON(path, def = {}) {
    if (!fs.existsSync(path)) return def;
    
    try {
        const content = fs.readFileSync(path, "utf8").trim();
        if (!content || content === "null") return def;
        return JSON.parse(content);
    } catch (error) {
        return def;
    }
}

export async function run(sock, msg) {
    const from = msg.key.remoteJid;
    
    const bossActual = loadJSON(BOSS_PATH, {});
    const usuarios = loadJSON(USERS_PATH, {});
    
    let mensaje = "🏆 *TOP CAZADORES DE BOSS*\n\n";
    
    if (bossActual && bossActual.vida > 0 && bossActual.enemigos) {
        // Filtrar solo a los que tienen más de 5 ataques en el boss actual
        const topBossActual = Object.entries(bossActual.enemigos)
            .filter(([_, info]) => info.ataques > 5)
            .sort((a, b) => (b[1].daño || 0) - (a[1].daño || 0))
            .slice(0, 10);
        
        if (topBossActual.length > 0) {
            mensaje += `🗡️ *TOP BOSS ACTUAL* (${bossActual.nombre})\n\n`;
            
            topBossActual.forEach(([userId, info], index) => {
                const posicion = index + 1;
                const emojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
                const emoji = emojis[index] || "👤";
                
                mensaje += `${emoji} *${posicion}.* ${userId}\n`;
                mensaje += `   ❤️ Daño: ${info.daño || 0}\n`;
                mensaje += `   ⚔️ Ataques: ${info.ataques || 0}\n`;
                if (info.critico > 0) mensaje += `   💥 Críticos: ${info.critico}\n`;
                mensaje += `\n`;
            });
        } else {
            mensaje += `🗡️ *BOSS ACTUAL:* ${bossActual.nombre}\n`;
            mensaje += `⚠️ No hay jugadores con más de 5 ataques\n\n`;
        }
    }
    
    // Top global de usuarios (por daño total)
    const topGlobal = Object.entries(usuarios)
        .filter(([_, user]) => user.dañoTotal > 0)
        .sort((a, b) => (b[1].dañoTotal || 0) - (a[1].dañoTotal || 0))
        .slice(0, 5);
    
    if (topGlobal.length > 0) {
        mensaje += `🌎 *TOP GLOBAL*\n\n`;
        
        topGlobal.forEach(([userId, user], index) => {
            const emojis = ["👑", "🥈", "🥉", "4️⃣", "5️⃣"];
            const emoji = emojis[index] || "👤";
            
            mensaje += `${emoji} ${userId}\n`;
            mensaje += `   💀 Daño total: ${user.dañoTotal || 0}\n`;
            mensaje += `   🏆 Bosses: ${user.bossDerrotados || 0}\n`;
            mensaje += `   💰 Geos: ${user.geos || 0}\n`;
            if (index < topGlobal.length - 1) mensaje += `\n`;
        });
    }
    
    // Información del boss actual
    if (bossActual && bossActual.vida > 0) {
        const atacantesActivos = Object.values(bossActual.enemigos || {}).filter(info => info.ataques > 5).length;
        mensaje += `\n📊 *BOSS ACTUAL:*\n`;
        mensaje += `❤️ Vida: ${bossActual.vida}/${bossActual.maxVida}\n`;
        mensaje += `👥 Atacantes activos: ${atacantesActivos}`;
    }
    
    await sock.sendMessage(from, { text: mensaje });
}
