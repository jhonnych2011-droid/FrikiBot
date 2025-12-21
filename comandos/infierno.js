// comandos/inferno.js
import fs from "fs";

export const command = "inferno";

const DB = "./inferno.json";

// ============================
//   Cargar / Guardar DB
// ============================
function loadDB() {
    if (!fs.existsSync(DB)) fs.writeFileSync(DB, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(DB));
}

function saveDB(db) {
    fs.writeFileSync(DB, JSON.stringify(db, null, 2));
}

// ============================
//       CLASES INFERNALES
// ============================
const CLASES = {
    demonio: { hp: 130, atk: 28, def: 15 },
    pecador: { hp: 100, atk: 35, def: 10 },
    imp:     { hp: 85,  atk: 40, def: 8 },
    radio:   { hp: 120, atk: 32, def: 12 }
};

// ============================
//          ENEMIGOS
// ============================
const ENEMIGOS = [
    { nombre: "Contratista Infernal", hp: 90, atk: 18, recompensa: 40 },
    { nombre: "Bestia del Abismo", hp: 140, atk: 22, recompensa: 60 },
    { nombre: "Ángel Exterminador", hp: 170, atk: 30, recompensa: 120 }
];

// ============================
//          MISIONES
// ============================
const MISIONES = [
    { nombre: "Recolectar almas perdidas", recompensa: 50, exp: 25 },
    { nombre: "Reprimir un motín infernal", recompensa: 90, exp: 40 },
    { nombre: "Eliminar un pecador rebelde", recompensa: 140, exp: 70 },
    { nombre: "Lidiar con un cliente del Hotel Hazbin", recompensa: 200, exp: 90 }
];

// ============================
//        TIENDA INFERNAL
// ============================
const TIENDA = {
    pocion: { precio: 40, efecto: "cura", valor: 50 },
    esteroides: { precio: 80, efecto: "atk", valor: 8 },
    armadura: { precio: 100, efecto: "def", valor: 6 }
};

// ============================
//    Crear Jugador Nuevo
// ============================
function crearJugador(jid, clase) {
    const stats = CLASES[clase];
    return {
        clase,
        hp: stats.hp,
        max_hp: stats.hp,
        atk: stats.atk,
        def: stats.def,
        nivel: 1,
        exp: 0,
        souls: 0,
        inventario: []
    };
}

// ============================
//      Experiencia / Nivel
// ============================
function ganarExp(jugador, cantidad) {
    jugador.exp += cantidad;
    const req = jugador.nivel * 60;

    if (jugador.exp >= req) {
        jugador.nivel++;
        jugador.exp = 0;
        jugador.max_hp += 25;
        jugador.hp = jugador.max_hp;
        jugador.atk += 6;
        jugador.def += 3;

        return `🔥 *SUBISTE A NIVEL ${jugador.nivel}* 🔥\nStats mejorados.`;
    }

    return null;
}

// ============================
//          COMANDO
// ============================
export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;

    const db = loadDB();

    // ========= MENÚ =========
    if (!args[0]) {
        return await sock.sendMessage(from, {
            text:
`🔥 *RPG INFERNAL – Hazbin/Helluva Style* 🔥

Comandos disponibles:
• .inferno registrar <clase>
• .inferno perfil
• .inferno misión
• .inferno pelear
• .inferno tienda
• .inferno comprar <item>
• .inferno usar <item>
• .inferno reset

Clases: demonio | pecador | imp | radio`
        });
    }

    const sub = args[0].toLowerCase();

    // ========= REGISTRAR =========
    if (sub === "registrar") {
        const clase = args[1]?.toLowerCase();

        if (!clase || !CLASES[clase]) {
            return sock.sendMessage(from, {
                text: `❌ Clase inválida.  
Clases: demonio, pecador, imp, radio`
            });
        }

        db[sender] = crearJugador(sender, clase);
        saveDB(db);

        return sock.sendMessage(from, {
            text: `🔥 *Bienvenido al Infierno, ${clase.toUpperCase()}* 🔥`
        });
    }

    // Si no está registrado
    if (!db[sender]) {
        return sock.sendMessage(from, {
            text: "❌ No estás registrado.\nUsa: *.inferno registrar demonio*"
        });
    }

    const pj = db[sender];

    // ========= PERFIL =========
    if (sub === "perfil") {
        return sock.sendMessage(from, {
            text:
`🔥 *TU PERFIL INFERNAL* 🔥
Clase: ${pj.clase}
Nivel: ${pj.nivel}
HP: ${pj.hp}/${pj.max_hp}
ATK: ${pj.atk}
DEF: ${pj.def}
EXP: ${pj.exp}
💀 Souls: ${pj.souls}
🎒 Inventario: ${pj.inventario.join(", ") || "Vacío"}`
        });
    }

    // ========= MISIÓN =========
    if (sub === "misión") {
        const m = MISIONES[Math.floor(Math.random() * MISIONES.length)];
        pj.souls += m.recompensa;
        const lvl = ganarExp(pj, m.exp);
        saveDB(db);

        return sock.sendMessage(from, {
            text:
`🔥 *MISIÓN COMPLETADA*🔥
${m.nombre}
💰 Souls: +${m.recompensa}
⭐ Exp: +${m.exp}
${lvl || ""}`
        });
    }

    // ========= PELEAR =========
    if (sub === "pelear") {
        const enemy = ENEMIGOS[Math.floor(Math.random() * ENEMIGOS.length)];
        let log = `⚔️ *PELEA INFERNAL* ⚔️\nContra: ${enemy.nombre}\n\n`;

        let hpP = pj.hp;
        let hpE = enemy.hp;

        while (hpP > 0 && hpE > 0) {
            const dmgP = Math.max(5, pj.atk - Math.floor(Math.random() * enemy.def || 8));
            const dmgE = Math.max(5, enemy.atk - pj.def);

            hpE -= dmgP;
            hpP -= dmgE;

            log += `Haces *${dmgP}* daño.\n`;
            log += `${enemy.nombre} hace *${dmgE}* daño.\n\n`;
        }

        if (hpP <= 0) {
            pj.hp = pj.max_hp;
            saveDB(db);
            return sock.sendMessage(from, {
                text: log + `💀 *FUISTE DERROTADO*, pero reviviste automáticamente.`
            });
        }

        pj.souls += enemy.recompensa;
        const lvl = ganarExp(pj, 40);
        pj.hp = hpP;
        saveDB(db);

        return sock.sendMessage(from, {
            text:
log + 
`🔥 *VICTORIA* 🔥
💰 Souls: +${enemy.recompensa}
${lvl || ""}`
        });
    }

    // ========= TIENDA =========
    if (sub === "tienda") {
        let t = "🔥 *TIENDA INFERNAL* 🔥\n\n";
        for (let item in TIENDA) {
            t += `• ${item} — ${TIENDA[item].precio} souls\n`;
        }
        return sock.sendMessage(from, { text: t });
    }

    // ========= COMPRAR =========
    if (sub === "comprar") {
        const item = args[1]?.toLowerCase();

        if (!item || !TIENDA[item]) {
            return sock.sendMessage(from, { text: "❌ Ese objeto no existe." });
        }

        if (pj.souls < TIENDA[item].precio) {
            return sock.sendMessage(from, { text: "❌ No tienes souls suficientes." });
        }

        pj.souls -= TIENDA[item].precio;
        pj.inventario.push(item);
        saveDB(db);

        return sock.sendMessage(from, {
            text: `🔥 Compraste *${item}*.`
        });
    }

    // ========= USAR =========
    if (sub === "usar") {
        const item = args[1]?.toLowerCase();

        if (!pj.inventario.includes(item)) {
            return sock.sendMessage(from, {
                text: "❌ No tienes ese objeto."
            });
        }

        const obj = TIENDA[item];

        if (obj.efecto === "cura") pj.hp = Math.min(pj.max_hp, pj.hp + obj.valor);
        if (obj.efecto === "atk") pj.atk += obj.valor;
        if (obj.efecto === "def") pj.def += obj.valor;

        pj.inventario = pj.inventario.filter(x => x !== item);
        saveDB(db);

        return sock.sendMessage(from, {
            text: `🔥 Usaste *${item}*.`
        });
    }

    // ========= RESET =========
    if (sub === "reset") {
        delete db[sender];
        saveDB(db);
        return sock.sendMessage(from, { text: "🔥 Tu aventura infernal fue borrada." });
    }
}
