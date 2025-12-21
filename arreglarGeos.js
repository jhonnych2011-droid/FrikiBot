import fs from "fs";

const filePath = "./geos.json";

// Leer geos.json de forma segura
let perfiles = {};
try {
  if (fs.existsSync(filePath)) {
    perfiles = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }
} catch (err) {
  console.error("Error leyendo geos.json:", err);
  process.exit(1);
}

// Recorrer todos los perfiles y corregirlos
for (let user in perfiles) {
  if (perfiles[user] === null) {
    perfiles[user] = { geos: 0, lastMinar: 0 };
  } else if (typeof perfiles[user] === "number") {
    perfiles[user] = { geos: perfiles[user], lastMinar: 0 };
  } else if (typeof perfiles[user] !== "object") {
    // Por si hay algún otro tipo extraño
    perfiles[user] = { geos: 0, lastMinar: 0 };
  } else {
    // Asegurar que existan las propiedades
    if (typeof perfiles[user].geos !== "number") perfiles[user].geos = 0;
    if (typeof perfiles[user].lastMinar !== "number") perfiles[user].lastMinar = 0;
  }
}

// Guardar cambios de forma segura
try {
  fs.writeFileSync(filePath, JSON.stringify(perfiles, null, 2));
  console.log("✅ geos.json corregido correctamente.");
} catch (err) {
  console.error("Error guardando geos.json:", err);
}
