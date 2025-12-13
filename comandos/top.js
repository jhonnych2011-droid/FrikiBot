// comandos/top.js
import fs from "fs";

export const command = "top";

const geosFile = "./geos.json";
const usuariosFile = "./usuarios.json";
const ownersFile = "./owners.json";
const reclamosFile = "./top_reclamos.json";

// Cargar o crear JSON
function loadJSON(path, def = {}) {
    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, JSON.stringify(def, null, 2));
    }
    return JSON.parse(fs.readFileSync(path, "utf8"));
}

// Guardar JSON normal
function saveJSON(path, data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// Convertir ID de WhatsApp a @lid
function fixID(jid) {
    return jid.replace(/@.+$/, "@lid");
}

export async function run(sock, msg, args, geosDB) {
    const from = msg.key.remoteJid;
    const sender = fixID(msg.key.participant || from);

    const sub = args[0]?.toLowerCase();

    // =============================
    //        SUBCOMANDO: RECLAMAR
    // =============================
    if (sub === "reclamar") {
        const reclamos = loadJSON(reclamosFile);

        // Ya reclamó
        if (reclamos[sender]) {
            return sock.sendMessage(from, { 
                text: "❌ Ya reclamaste tu recompensa del TOP."
            });
        }

        // Cargar DB principal
        const geosDBLocal = loadJSON(geosFile);
        const usuariosDB = loadJSON(usuariosFile);
        const owners = loadJSON(ownersFile).map(o => fixID(String(o)));

        // Armar TOP
        const top = Object.entries(geosDBLocal)
            .filter(([lid]) => !owners.includes(fixID(lid)))
            .map(([lid, data]) => ({
                lid: fixID(lid),
                geos: Number(data.geos) || 0,
                nombre: usuariosDB[lid]?.nombre || "Sin nombre"
            }))
            .sort((a, b) => b.geos - a.geos)
            .slice(0, 6);

        // Ver si está en top
        const pos = top.findIndex(u => u.lid === sender);

        if (pos === -1) {
            return sock.sendMessage(from, {
                text: "❌ No estás en el TOP 6, no puedes reclamar."
            });
        }

        // Recompensas del puesto
        const recompensas = [9000, 7500, 6000, 4500, 3000, 1500];
        const recompensa = recompensas[pos];

        // Crear perfil si no existe
        if (!geosDBLocal[sender]) geosDBLocal[sender] = { geos: 0 };

        // ============================
        // SUMAR IGUAL QUE APOSTAR
        // ============================
        geosDBLocal[sender].geos = Number(geosDBLocal[sender].geos) + recompensa;

        // Registrar reclamo
        reclamos[sender] = true;

        // Guardar
        saveJSON(geosFile, geosDBLocal);
        saveJSON(reclamosFile, reclamos);

        return sock.sendMessage(from, {
            text: `🎉 *Recompensa reclamada*\n\nPuesto: *${pos + 1}*\nGeos ganados: *${recompensa}*`
        });
    }

    // =============================
    //          TOP NORMAL
    // =============================

    const geosDBLocal = loadJSON(geosFile);
    const usuariosDB = loadJSON(usuariosFile);
    const owners = loadJSON(ownersFile).map(o => fixID(String(o)));

    const top = Object.entries(geosDBLocal)
        .filter(([lid]) => !owners.includes(fixID(lid)))
        .map(([lid, data]) => ({
            lid: fixID(lid),
            geos: Number(data.geos) || 0,
            nombre: usuariosDB[lid]?.nombre || "Sin nombre"
        }))
        .sort((a, b) => b.geos - a.geos)
        .slice(0, 6);

    let texto = "📊 *Top 6 Usuarios con más Geos*\n\n";

    top.forEach((u, i) => {
        texto += `${i + 1}. 🏆 *${u.nombre}*\n   💰 Geos: ${u.geos}\n\n`;
    });

    return sock.sendMessage(from, { text: texto });
}
