import fs from "fs";

const EVENT_FILE = "./eventos.json";

function loadEventos() {
  if (!fs.existsSync(EVENT_FILE)) {
    fs.writeFileSync(EVENT_FILE, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(EVENT_FILE, "utf8"));
}

function saveEventos(data) {
  fs.writeFileSync(EVENT_FILE, JSON.stringify(data, null, 2));
}

console.log("⏳ eventChecker.js activo — verificando eventos cada 30s...");

setInterval(() => {
  try {
    let eventos = loadEventos();
    let cambios = false;

    for (let nombre in eventos) {
      const ev = eventos[nombre];

      if (ev.activo && ev.finaliza && ev.finaliza <= Date.now()) {
        eventos[nombre].activo = false;
        cambios = true;
        console.log(`⛔ Evento '${nombre}' ha expirado automáticamente.`);
      }
    }

    if (cambios) saveEventos(eventos);

  } catch (e) {
    console.error("⚠ Error en eventChecker:", e);
  }
}, 30000); // cada 30 segundos

