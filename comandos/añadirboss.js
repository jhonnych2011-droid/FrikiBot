import fs from "fs";
import path from "path";

export const command = "añadirboss";

const BOSS_PATH = path.join(process.cwd(), "bossActive.json");
const BOSS_QUEUE_PATH = path.join(process.cwd(), "bossQueue.json");
const OWNERS_PATH = path.join(process.cwd(), "owners.json");

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

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const userId = msg.key.participant || msg.key.remoteJid;
    
    // Verificar si es owner
    const owners = loadJSON(OWNERS_PATH, []);
    if (!owners.includes(userId)) {
        return sock.sendMessage(from, {
            text: "❌ Solo owners pueden usar este comando."
        });
    }
    
    // Verificar argumentos mínimos
    if (args.length < 4) {
        return sock.sendMessage(from, {
            text: "📌 *Uso:* .añadirboss <vida> <recompensa> <url_foto> <costo_ataque> [nombre]\n\n" +
                  "📝 *Ejemplos:*\n" +
                  "• .añadirboss 1000 5000 https://imagen.com/dragon.jpg 50\n" +
                  "• .añadirboss 1000 5000 https://imagen.com/dragon.jpg 50 Dragón Ancestral\n" +
                  "• .añadirboss 1500 7500 https://imagen.com/golem.jpg 30 Golem de Piedra\n\n" +
                  "💡 *Consejos:*\n" +
                  "- El nombre es opcional\n" +
                  "- Puedes usar espacios en el nombre\n" +
                  "- Si no pones nombre, será 'Boss Personalizado'"
        });
    }
    
    // Extraer los 4 primeros argumentos (fijos)
    const vida = parseInt(args[0]);
    const recompensa = parseInt(args[1]);
    const urlFoto = args[2];
    const costoAtaque = parseInt(args[3]);
    
    // Los argumentos restantes son el nombre (puede tener espacios)
    const nombreBoss = args.length > 4 ? args.slice(4).join(" ") : "Boss Personalizado";
    
    // Validaciones básicas
    if (isNaN(vida) || vida < 100) {
        return sock.sendMessage(from, {
            text: "❌ Vida inválida. Mínimo 100."
        });
    }
    
    if (isNaN(recompensa) || recompensa < 100) {
        return sock.sendMessage(from, {
            text: "❌ Recompensa inválida. Mínimo 100."
        });
    }
    
    if (isNaN(costoAtaque) || costoAtaque < 1) {
        return sock.sendMessage(from, {
            text: "❌ Costo por ataque inválido. Mínimo 1."
        });
    }
    
    if (!urlFoto || !urlFoto.startsWith('http')) {
        return sock.sendMessage(from, {
            text: "❌ URL de imagen inválida. Debe comenzar con http:// o https://"
        });
    }
    
    // Crear objeto del boss
    const nuevoBoss = {
        nombre: nombreBoss,
        vida: vida,
        maxVida: vida,
        recompensa: recompensa,
        img: urlFoto,
        costoAtaque: costoAtaque,
        enemigos: {},
        fechaCreacion: new Date().toISOString(),
        id: Date.now(),
        creadoPor: userId,
        nivel: vida > 2000 ? "⭐⭐⭐" : vida > 1000 ? "⭐⭐" : "⭐",
        estado: "en_cola"
    };
    
    // Cargar datos actuales
    const bossActual = loadJSON(BOSS_PATH, {});
    const colaBosses = loadJSON(BOSS_QUEUE_PATH, []);
    
    // Verificar si hay boss activo
    const hayBossActivo = bossActual && bossActual.vida > 0;
    
    if (hayBossActivo) {
        // Hay boss activo, agregar a la cola
        colaBosses.push(nuevoBoss);
        saveJSON(BOSS_QUEUE_PATH, colaBosses);
        
        const posicionEnCola = colaBosses.length;
        
        await sock.sendMessage(from, {
            image: { url: urlFoto },
            caption: `✅ *BOSS AGREGADO A LA COLA* #${posicionEnCola}\n\n` +
                     `🗡️ *${nombreBoss}*\n` +
                     `❤️ Vida: ${vida}\n` +
                     `💰 Recompensa: ${recompensa} geos\n` +
                     `⚔️ Costo/ataque: ${costoAtaque} geos\n` +
                     `📊 Nivel: ${nuevoBoss.nivel}\n\n` +
                     `⏳ *Esperando turno...*\n` +
                     `🔄 Boss actual: *${bossActual.nombre}*\n` +
                     `❤️ Vida actual: ${bossActual.vida}/${bossActual.maxVida}\n\n` +
                     `👑 Creado por: @${userId.split('@')[0]}\n` +
                     `📅 ${new Date().toLocaleDateString()}`
        });
    } else {
        // No hay boss activo, activar inmediatamente
        nuevoBoss.activo = true;
        nuevoBoss.fechaInicio = new Date().toISOString();
        nuevoBoss.estado = "activo";
        saveJSON(BOSS_PATH, nuevoBoss);
        
        await sock.sendMessage(from, {
            image: { url: urlFoto },
            caption: `🚨 *NUEVO BOSS ACTIVADO*\n\n` +
                     `${nuevoBoss.nivel} *${nombreBoss}*\n` +
                     `❤️ Vida: ${vida}/${vida}\n` +
                     `💰 Recompensa: ${recompensa} geos\n` +
                     `⚔️ Costo/ataque: ${costoAtaque} geos\n\n` +
                     `📊 *Estadísticas:*\n` +
                     `• Vida base: ${vida}\n` +
                     `• Recompensa total: ${recompensa} geos\n` +
                     `• Ataques necesarios: ~${Math.ceil(vida / 20)}\n\n` +
                     `👑 Creado por: @${userId.split('@')[0]}\n` +
                     `🎮 Usa *.atacar* para combatir`
        });
    }
}
