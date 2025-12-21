import fs from 'fs';
const geosPath = './geos.json';

// Cargar o crear
let geosDB = fs.existsSync(geosPath) ? JSON.parse(fs.readFileSync(geosPath, 'utf-8')) : {};

// Limpiar datos corruptos
for (const sender in geosDB) {
    if (typeof geosDB[sender] !== 'object' || isNaN(geosDB[sender].geos)) {
        geosDB[sender] = { geos: 1000, lastMinar: 0, cooldownRobar: 0, lastTrabajar: 0 };
    }
}

// Guardar limpio
fs.writeFileSync(geosPath, JSON.stringify(geosDB, null, 2));
console.log("✅ geos.json limpio y seguro");
