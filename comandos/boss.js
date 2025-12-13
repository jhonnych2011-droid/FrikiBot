import fs from "fs";
import path from "path";

export const command = "boss";

const BOSS_PATH = path.join(process.cwd(), "bossActive.json");
const BOSS_QUEUE_PATH = path.join(process.cwd(), "bossQueue.json");
const USERS_PATH = path.join(process.cwd(), "usuarios.json");

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

function saveJSON(path, data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// Función para activar el siguiente boss de la cola
function activarSiguienteBoss() {
    const colaBosses = loadJSON(BOSS_QUEUE_PATH, []);
    
    if (colaBosses.length > 0) {
        const siguienteBoss = colaBosses.shift();
        siguienteBoss.activo = true;
        siguienteBoss.fechaInicio = new Date().toISOString();
        saveJSON(BOSS_PATH, siguienteBoss);
        saveJSON(BOSS_QUEUE_PATH, colaBosses);
        return siguienteBoss;
    }
    
    return null;
}

// Función para distribuir recompensas
async function distribuirRecompensas(boss, sock) {
    const usuarios = loadJSON(USERS_PATH, {});
    const participantes = Object.keys(boss.enemigos || {}).length;
    
    if (participantes === 0) return;
    
    // Filtrar solo a los que atacaron más de 5 veces
    const atacantesActivos = Object.entries(boss.enemigos || {})
        .filter(([_, info]) => info.ataques > 5);
    
    if (atacantesActivos.length === 0) {
        console.log("⚠️ No hay jugadores con más de 5 ataques para recompensar");
        return;
    }
    
    const recompensaPorParticipante = Math.floor(boss.recompensa / atacantesActivos.length);
    
    for (const [userId, info] of atacantesActivos) {
        if (!usuarios[userId]) {
            usuarios[userId] = { geos: 0, dañoTotal: 0 };
        }
        
        usuarios[userId].geos = (usuarios[userId].geos || 0) + recompensaPorParticipante;
        usuarios[userId].dañoTotal = (usuarios[userId].dañoTotal || 0) + (info.daño || 0);
        
        // Notificar
        try {
            await sock.sendMessage(userId, {
                text: `🎉 *BOSS DERROTADO*\n\n` +
                      `Has recibido: *${recompensaPorParticipante} geos*\n` +
                      `🗡️ Boss: ${boss.nombre}\n` +
                      `❤️ Tu daño: ${info.daño || 0}\n` +
                      `⚔️ Tus ataques: ${info.ataques || 0}\n` +
                      `👥 Atacantes activos: ${atacantesActivos.length}`
            });
        } catch (error) {
            console.log(`No se notificó a ${userId}`);
        }
    }
    
    saveJSON(USERS_PATH, usuarios);
    console.log(`✅ Recompensas distribuidas a ${atacantesActivos.length} jugadores activos`);
}

export async function run(sock, msg) {
    const from = msg.key.remoteJid;
    
    // Cargar boss actual
    const boss = loadJSON(BOSS_PATH, {});
    const colaBosses = loadJSON(BOSS_QUEUE_PATH, []);
    
    // Si no hay boss activo
    if (!boss || !boss.activo) {
        const nuevoBoss = activarSiguienteBoss();
        
        if (nuevoBoss) {
            await sock.sendMessage(from, {
                image: { url: nuevoBoss.img },
                caption: `🚨 *NUEVO BOSS HA APARECIDO*\n\n` +
                         `${nuevoBoss.nivel} *${nuevoBoss.nombre}*\n` +
                         `❤️ Vida: ${nuevoBoss.vida}/${nuevoBoss.maxVida}\n` +
                         `💰 Recompensa: ${nuevoBoss.recompensa} geos\n` +
                         `⚔️ Costo/ataque: ${nuevoBoss.costoAtaque} geos\n\n` +
                         `📋 *Próximos en cola:* ${colaBosses.length}\n\n` +
                         `⚔️ Usa *.atacar* para combatir`
            });
            return;
        }
        
        return sock.sendMessage(from, {
            text: "❌ No hay ningún boss activo.\n\n" +
                  "👑 *Para owners:*\n" +
                  "Usa *.añadirboss* para crear uno\n" +
                  "📋 *Bosses en espera:* 0"
        });
    }
    
    // Verificar si el boss está muerto
    if (boss.vida <= 0) {
        await distribuirRecompensas(boss, sock);
        
        const siguienteBoss = activarSiguienteBoss();
        
        if (siguienteBoss) {
            await sock.sendMessage(from, {
                text: `🎉 *BOSS DERROTADO*\n\n` +
                      `🗡️ ${boss.nombre}\n` +
                      `💰 Recompensa repartida: ${boss.recompensa} geos\n` +
                      `👥 Participantes: ${Object.keys(boss.enemigos || {}).length}\n` +
                      `⚔️ Atacantes activos (>5): ${Object.values(boss.enemigos || {}).filter(info => info.ataques > 5).length}\n\n` +
                      `✅ Las recompensas han sido distribuidas.\n\n` +
                      `⏳ *Próximo boss activado automáticamente*`
            });
            
            setTimeout(async () => {
                await sock.sendMessage(from, {
                    image: { url: siguienteBoss.img },
                    caption: `🚨 *NUEVO BOSS*\n\n` +
                             `${siguienteBoss.nivel} *${siguienteBoss.nombre}*\n` +
                             `❤️ Vida: ${siguienteBoss.vida}\n` +
                             `💰 Recompensa: ${siguienteBoss.recompensa} geos\n\n` +
                             `⚔️ Usa *.atacar* para combatir`
                });
            }, 2000);
        } else {
            await sock.sendMessage(from, {
                text: `🎉 *BOSS DERROTADO*\n\n` +
                      `🗡️ ${boss.nombre}\n` +
                      `💰 Recompensa repartida: ${boss.recompensa} geos\n` +
                      `👥 Participantes: ${Object.keys(boss.enemigos || {}).length}\n` +
                      `⚔️ Atacantes activos (>5): ${Object.values(boss.enemigos || {}).filter(info => info.ataques > 5).length}\n\n` +
                      `✅ Las recompensas han sido distribuidas.\n\n` +
                      `📭 *No hay más bosses en cola*\n` +
                      `👑 Owners pueden agregar más con *.añadirboss*`
            });
        }
        return;
    }
    
    // Filtrar jugadores con más de 5 ataques para el top
    const jugadoresActivos = Object.entries(boss.enemigos || {})
        .filter(([_, info]) => info.ataques > 5)
        .sort((a, b) => (b[1]?.daño || 0) - (a[1]?.daño || 0))
        .slice(0, 10); // Top 10
    
    // Crear mensaje de jugadores con IDs completos
    let jugadoresMsg = "";
    if (jugadoresActivos.length > 0) {
        jugadoresActivos.forEach(([id, info], index) => {
            const posicion = index + 1;
            const emojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
            const emoji = emojis[index] || "👤";
            
            jugadoresMsg += `${emoji} *${posicion}.* ${id}\n`;
            jugadoresMsg += `   ❤️ Daño: ${info.daño || 0}\n`;
            jugadoresMsg += `   ⚔️ Ataques: ${info.ataques || 0}\n`;
            if (info.critico > 0) jugadoresMsg += `   💥 Críticos: ${info.critico || 0}\n`;
            jugadoresMsg += `\n`;
        });
    } else {
        jugadoresMsg = "Ningún jugador con más de 5 ataques aún.\n";
    }
    
    // Estadísticas adicionales
    const totalAtacantes = Object.keys(boss.enemigos || {}).length;
    const atacantesActivos = jugadoresActivos.length;
    
    // Barra de vida
    const vidaPorcentaje = (boss.vida / boss.maxVida) * 100;
    const barrasLlenas = Math.floor(vidaPorcentaje / 5);
    const barrasVacias = 20 - barrasLlenas;
    const barraVida = "█".repeat(barrasLlenas) + "░".repeat(barrasVacias);
    
    await sock.sendMessage(from, {
        image: { url: boss.img },
        caption: `${boss.nivel} *${boss.nombre.toUpperCase()}*\n\n` +
                 `❤️ Vida: ${boss.vida}/${boss.maxVida}\n` +
                 `📊 ${barraVida} ${vidaPorcentaje.toFixed(1)}%\n\n` +
                 `💰 Recompensa: ${boss.recompensa} geos\n` +
                 `⚔️ Costo/ataque: ${boss.costoAtaque} geos\n\n` +
                 `📊 *ESTADÍSTICAS:*\n` +
                 `👥 Atacantes totales: ${totalAtacantes}\n` +
                 `⚔️ Atacantes activos (>5): ${atacantesActivos}\n` +
                 `📋 En cola: ${colaBosses.length}\n\n` +
                 `🏆 *TOP ATACANTES (>5 ataques):*\n${jugadoresMsg}\n` +
                 `📌 Usa *.atacar* para combatir`
    });
}
