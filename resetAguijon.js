// resetAguijon.js - Ejecutar una vez para actualizar la estructura
import fs from "fs";
import path from "path";

const AGUIJON_PATH = path.join(process.cwd(), "aguijon.json");

function loadJSON(path, def = {}) {
    if (!fs.existsSync(path)) return def;
    const content = fs.readFileSync(path, "utf8").trim();
    if (!content) return def;
    return JSON.parse(content);
}

function saveJSON(path, data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// Actualizar estructura de datos
const aguijonDB = loadJSON(AGUIJON_PATH, {});

for (const [userId, data] of Object.entries(aguijonDB)) {
    // Si no tiene bossesDerrotados10golpes, inicializarlo
    if (!data.bossesDerrotados10golpes) {
        // Calcular cuántos bosses con 10+ golpes tiene basado en bosses completados
        // Asumimos que si tiene bosses completados, algunos podrían tener 10+ golpes
        const bossesCon10Golpes = Math.min(data.bosses || 0, 2); // Estimación inicial
        data.bossesDerrotados10golpes = bossesCon10Golpes;
    }
    
    // Asegurar estructura completa
    aguijonDB[userId] = {
        nivel: data.nivel || 1,
        golpes: data.golpes || 0,           // Golpes en boss actual
        geo: data.geo || 0,                 // Geos del aguijón (si aplica)
        bosses: data.bosses || 0,           // Total bosses derrotados
        bossesDerrotados10golpes: data.bossesDerrotados10golpes || 0, // Bosses con 10+ golpes
        dañoBase: [15, 30, 60, 120][(data.nivel || 1) - 1] || 15
    };
}

saveJSON(AGUIJON_PATH, aguijonDB);
console.log("✅ Estructura de aguijón actualizada");
