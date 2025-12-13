import fs from "fs";

export const command = "lanzar";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const filePath = "./regalosGlobal.json";

  if (args.length === 0) {
    return sock.sendMessage(from, {
      text: "⚠️ Uso correcto:\n.lanzar geos=9000 10% personajes=Friki Claus 70%"
    });
  }

  // ========================================
  // VARIABLES
  // ========================================
  let geosCantidad = null;
  let geosProb = null;

  let personajeNombre = null;
  let personajeProb = null;

  // Cargar personajes.json
  const personajesFile = JSON.parse(fs.readFileSync("./personajes.json", "utf8"));

  // ========================================
  // PARSEAR GEOS
  // ========================================
  let geosIndex = args.findIndex(a => a.startsWith("geos="));
  if (geosIndex !== -1) {
    geosCantidad = parseInt(args[geosIndex].replace("geos=", "").trim());
    if (args[geosIndex + 1]?.endsWith("%")) {
      geosProb = parseInt(args[geosIndex + 1].replace("%", "").trim());
    }
  }

  // ========================================
  // PARSEAR PERSONAJE
  // ========================================
  let personajeStartIndex = args.findIndex(a => a.startsWith("personajes="));
  if (personajeStartIndex !== -1) {
    personajeNombre = args[personajeStartIndex].replace("personajes=", "").trim();
    for (let i = personajeStartIndex + 1; i < args.length; i++) {
      if (args[i].endsWith("%")) {
        personajeProb = parseInt(args[i].replace("%", ""));
        break;
      } else {
        personajeNombre += " " + args[i];
      }
    }
  }

  // ========================================
  // VALIDACIONES
  // ========================================
  if (!geosCantidad && !personajeNombre) {
    return sock.sendMessage(from, { text: "⚠️ Debes incluir geos o un personaje." });
  }

  if (geosCantidad && !geosProb) {
    return sock.sendMessage(from, { text: "⚠️ Debes poner el porcentaje de geos. Ej: 10%" });
  }

  if (personajeNombre) {
    if (!personajeProb) {
      return sock.sendMessage(from, { text: "⚠️ Debes poner el porcentaje del personaje. Ej: 70%" });
    }

    if (!personajesFile[personajeNombre]) {
      return sock.sendMessage(from, {
        text: `❌ El personaje *${personajeNombre}* no existe en personajes.json`
      });
    }
  }

  // ========================================
  // CREAR DROP NUEVO
  // ========================================
  const drop = {
    activo: true,
    premios: {},
    reclamadoPor: []
  };

  if (geosCantidad) drop.premios.geos = { cantidad: geosCantidad, prob: geosProb };
  if (personajeNombre) drop.premios.personaje = { nombre: personajeNombre, prob: personajeProb };

  // ========================================
  // GUARDAR (BORRA EL ANTERIOR)
  // ========================================
  fs.writeFileSync(filePath, JSON.stringify(drop, null, 2));

  // ========================================
  // MENSAJE FINAL GLOBAL
  // ========================================
  let texto = "🎅 *Papá Noel lanzó un regalo para todos!*\n\n🎁 *Posibles premios:*\n\n";
  if (geosCantidad) texto += `💎 *Geos:* ${geosCantidad}\n📌 Probabilidad: ${geosProb}%\n\n`;
  if (personajeNombre) texto += `👤 *Personaje:* ${personajeNombre}\n📌 Probabilidad: ${personajeProb}%\n\n`;
  texto += `🔥 Puede salir carbón si falla todo.`;

  // Obtener todos los grupos donde está el bot
  const chats = await sock.groupFetchAllParticipating();
  const grupos = Object.keys(chats);

  let enviados = 0;
  for (const idGrupo of grupos) {
    try {
      await sock.sendMessage(idGrupo, { text: texto });
      enviados++;
    } catch (e) {
      console.log("Error enviando lanzamiento a", idGrupo, e);
    }
  }

  return sock.sendMessage(from, { text: `📢 Regalo lanzado globalmente y notificado en *${enviados} grupos*` });
}
