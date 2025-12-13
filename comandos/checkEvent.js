import fs from "fs";

const EVENT_FILE = "./eventos.json";

// Crear archivo si no existe
if (!fs.existsSync(EVENT_FILE)) {
  fs.writeFileSync(EVENT_FILE, JSON.stringify({}, null, 2));
}

/**
 * Verifica si el comando pertenece a un evento
 * y si ese evento está activo.
 */
export function checkEvent(commandName) {
  const data = JSON.parse(fs.readFileSync(EVENT_FILE, "utf8"));

  // Buscar evento al que pertenece el comando
  const evento = Object.keys(data).find(ev =>
    data[ev].comandos && data[ev].comandos.includes(commandName)
  );

  // Si NO existe → NO se permite
  if (!evento) {
    return {
      allowed: false,
      message: `⚠️ El comando *${commandName}* pertenece a un evento que aún no existe.`
    };
  }

  // Si sí existe pero no está activo → NO se permite
  if (!data[evento].activo) {
    return {
      allowed: false,
      message: `⛔ El evento *${evento}* aún no está activo.`
    };
  }

  return { allowed: true }; // todo OK
}
