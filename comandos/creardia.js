import fs from "fs";

export const command = "creardia";

const CALENDARIO_FILE = "./calendario.json";

function cargarCalendario() {
  if (!fs.existsSync(CALENDARIO_FILE))
    fs.writeFileSync(CALENDARIO_FILE, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(CALENDARIO_FILE, "utf8"));
}

function guardarCalendario(datos) {
  fs.writeFileSync(CALENDARIO_FILE, JSON.stringify(datos, null, 2));
}

// ✅ FUNCIÓN PARA PARSAR TIEMPO VIP
function parseTiempoVIP(tiempo) {
  if (!tiempo) return null;
  
  const match = tiempo.match(/^(\d+)([dhms])$/i);
  if (!match) return null;
  
  const cantidad = parseInt(match[1]);
  const unidad = match[2].toLowerCase();
  
  const multiplicadores = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  
  return cantidad * (multiplicadores[unidad] || 0);
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const remitente = msg.key.participant || msg.key.remoteJid;
  const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));

  if (!owners.includes(remitente))
    return sock.sendMessage(from, { text: "❌ Solo los propietarios pueden usar este comando." });

  if (args.length < 2)
    return sock.sendMessage(from, {
      text: "📝 *Uso:* `.creardia <tipo> <valor> <día>`\n\n✨ *Tipos disponibles:*\n• `geos <cantidad> <día>`\n• `personaje <nombre> <día>`\n• `vip <tiempo> <día>`\n\n📌 *Ejemplos:*\n• `.creardia geos 1000 5`\n• `.creardia personaje Goku 10`\n• `.creardia vip 7d 15`\n• `.creardia vip 24h 20`"
    });

  const tipo = args[0].toLowerCase();
  const dia = parseInt(args[args.length - 1], 10);

  if (isNaN(dia) || dia < 1 || dia > 31)
    return sock.sendMessage(from, { text: "❌ Ingresa un día válido (1-31)." });

  if (tipo === "geos") {
    if (args.length < 3)
      return sock.sendMessage(from, { text: "❌ Uso: `.creardia geos <cantidad> <día>`" });
    
    const cantidad = parseInt(args[1], 10);
    if (isNaN(cantidad) || cantidad <= 0)
      return sock.sendMessage(from, { text: "❌ Ingresa una cantidad válida de geos." });
    
    const calendario = cargarCalendario();
    calendario[dia] = {
      tipo: "geos",
      valor: cantidad
    };
    guardarCalendario(calendario);
    
    return sock.sendMessage(from, {
      text: `✅ *Recompensa creada*\n\n📅 Día: ${dia}\n💰 Tipo: Geos\n🎁 Valor: ${cantidad} GEOS\n\nLos usuarios podrán reclamarla con \`.calendario ${dia}\``
    });
    
  } else if (tipo === "personaje") {
    if (args.length < 3)
      return sock.sendMessage(from, { text: "❌ Uso: `.creardia personaje <nombre> <día>`" });
    
    const nombrePersonaje = args.slice(1, -1).join(" ");
    
    const calendario = cargarCalendario();
    calendario[dia] = {
      tipo: "personaje",
      valor: nombrePersonaje
    };
    guardarCalendario(calendario);
    
    return sock.sendMessage(from, {
      text: `✅ *Recompensa creada*\n\n📅 Día: ${dia}\n🎭 Tipo: Personaje\n🎁 Valor: ${nombrePersonaje}\n\nLos usuarios podrán reclamarla con \`.calendario ${dia}\``
    });
    
  } else if (tipo === "vip") {
    if (args.length < 3)
      return sock.sendMessage(from, { text: "❌ Uso: `.creardia vip <tiempo> <día>`" });
    
    const tiempo = args[1];
    const duracion = parseTiempoVIP(tiempo);
    
    if (!duracion || duracion <= 0)
      return sock.sendMessage(from, { 
        text: "❌ Tiempo VIP inválido.\n\n⏰ *Formatos válidos:*\n• 7d (7 días)\n• 24h (24 horas)\n• 60m (60 minutos)\n• 30s (30 segundos)" 
      });
    
    const calendario = cargarCalendario();
    calendario[dia] = {
      tipo: "vip",
      valor: duracion, // Guardar en milisegundos
      tiempoTexto: tiempo // Guardar texto también
    };
    guardarCalendario(calendario);
    
    return sock.sendMessage(from, {
      text: `✅ *Recompensa VIP creada*\n\n📅 Día: ${dia}\n👑 Tipo: Tiempo VIP\n⏰ Duración: ${tiempo}\n\nLos usuarios podrán reclamarla con \`.calendario ${dia}\``
    });
    
  } else {
    return sock.sendMessage(from, {
      text: "❌ Tipo no válido.\n\n✨ *Tipos disponibles:*\n• `geos` - Dar geos\n• `personaje` - Dar personaje\n• `vip` - Dar tiempo VIP"
    });
  }
}

// ✅ COMANDO PARA VER CALENDARIO
export const command2 = "vercalendario";

export async function run2(sock, msg, args) {
  const from = msg.key.remoteJid;
  const remitente = msg.key.participant || msg.key.remoteJid;
  const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"));

  if (!owners.includes(remitente))
    return sock.sendMessage(from, { text: "❌ Solo los propietarios pueden usar este comando." });

  const calendario = cargarCalendario();
  
  if (Object.keys(calendario).length === 0) {
    return sock.sendMessage(from, { text: "📭 No hay recompensas programadas en el calendario." });
  }
  
  let mensaje = "📅 *CALENDARIO DE RECOMPENSAS*\n\n";
  
  // Ordenar días
  const dias = Object.keys(calendario).sort((a, b) => a - b);
  
  for (const dia of dias) {
    const recompensa = calendario[dia];
    
    let emoji = "💰";
    let descripcion = "";
    
    if (recompensa.tipo === "geos") {
      emoji = "💰";
      descripcion = `${recompensa.valor} GEOS`;
    } else if (recompensa.tipo === "personaje") {
      emoji = "🎭";
      descripcion = recompensa.valor;
    } else if (recompensa.tipo === "vip") {
      emoji = "👑";
      // Convertir milisegundos a texto
      const ms = recompensa.valor;
      const totalSegundos = Math.floor(ms / 1000);
      const dias = Math.floor(totalSegundos / (3600 * 24));
      const horas = Math.floor((totalSegundos % (3600 * 24)) / 3600);
      const minutos = Math.floor((totalSegundos % 3600) / 60);
      
      const partes = [];
      if (dias > 0) partes.push(`${dias}d`);
      if (horas > 0) partes.push(`${horas}h`);
      if (minutos > 0) partes.push(`${minutos}m`);
      
      descripcion = `${partes.join(' ')} VIP`;
    }
    
    mensaje += `${emoji} *Día ${dia}:* ${descripcion}\n`;
  }
  
  mensaje += `\n📊 Total recompensas: ${dias.length}`;
  
  return sock.sendMessage(from, { text: mensaje });
}
