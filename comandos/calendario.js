import fs from "fs";

export const command = "calendario";

const CALENDARIO_FILE = "./calendario.json";
const RECLAMOS_FILE = "./reclamos.json";
const INVENTARIO_FILE = "./inventario.json";
const VIP_FILE = "./vip.json";

function normalizeToLid(jid) {
  if (!jid) return null;
  if (jid.includes('@lid')) return jid;
  if (jid.includes('@s.whatsapp.net')) {
    const numero = jid.split('@')[0];
    return `${numero}@lid`;
  }
  const numero = jid.split('@')[0];
  return `${numero}@lid`;
}

function cargarJSON(archivo, valorDefecto = {}) {
  if (!fs.existsSync(archivo)) fs.writeFileSync(archivo, JSON.stringify(valorDefecto));
  return JSON.parse(fs.readFileSync(archivo, "utf8"));
}

function guardarJSON(archivo, datos) {
  fs.writeFileSync(archivo, JSON.stringify(datos, null, 2));
}

function formatearTiempo(ms) {
  if (ms <= 0) return '0s';
  const totalSegundos = Math.floor(ms / 1000);
  const dias = Math.floor(totalSegundos / (3600 * 24));
  const horas = Math.floor((totalSegundos % (3600 * 24)) / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  const partes = [];
  if (dias > 0) partes.push(`${dias}d`);
  if (horas > 0) partes.push(`${horas}h`);
  if (minutos > 0) partes.push(`${minutos}m`);
  if (segundos > 0 && dias === 0 && horas === 0 && minutos === 0) partes.push(`${segundos}s`);
  return partes.join(' ') || '0s';
}

function agregarTiempoVIP(userLid, tiempoMs) {
  const vipDB = cargarJSON(VIP_FILE);
  const now = Date.now();
  const datosActuales = vipDB[userLid] || { vipUntil: 0, level: 1, purchases: 0, grantedBy: [] };
  let nuevaExpira;
  if (datosActuales.vipUntil && datosActuales.vipUntil > now) {
    nuevaExpira = datosActuales.vipUntil + tiempoMs;
  } else {
    nuevaExpira = now + tiempoMs;
  }
  const grantedBy = Array.isArray(datosActuales.grantedBy) ? datosActuales.grantedBy : [];
  if (!grantedBy.includes("calendario")) {
    grantedBy.push("calendario");
  }
  vipDB[userLid] = {
    vipUntil: nuevaExpira,
    level: datosActuales.level || 1,
    purchases: datosActuales.purchases || 0,
    grantedBy: grantedBy,
    lastUpdated: now,
    grantedAt: datosActuales.grantedAt || now,
    alertaEnviada: false
  };
  guardarJSON(VIP_FILE, vipDB);
  return {
    success: true,
    nuevaExpira: nuevaExpira,
    tiempoAnterior: datosActuales.vipUntil,
    tiempoTotal: formatearTiempo(nuevaExpira - now)
  };
}

export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderLid = normalizeToLid(sender);

  if (!args.length) {
    return sock.sendMessage(from, { 
      text: "📅 *Uso:* `.calendario <día>`\n\n✨ *Ejemplos:*\n• `.calendario 5`\n• `.calendario 15`\n\n📋 Usa `.vercalendario` para ver las recompensas disponibles (solo owners)." 
    });
  }

  const dia = parseInt(args[0], 10);
  if (isNaN(dia) || dia < 1 || dia > 31) {
    return sock.sendMessage(from, { text: "❌ Ingresa un día válido (1-31)." });
  }

  const calendario = cargarJSON(CALENDARIO_FILE);
  if (!calendario[dia]) {
    return sock.sendMessage(from, { text: `❌ No hay recompensa registrada para el día ${dia}.` });
  }

  const reclamos = cargarJSON(RECLAMOS_FILE);
  if (!reclamos[senderLid]) reclamos[senderLid] = [];

  if (reclamos[senderLid].includes(dia)) {
    return sock.sendMessage(from, { text: "❌ Ya reclamaste la recompensa de este día." });
  }

  const recompensa = calendario[dia];

  try {
    if (recompensa.tipo === "geos") {
      if (!geosDB[senderLid]) geosDB[senderLid] = { geos: 0 };
      if (typeof geosDB[senderLid] === 'number') {
        geosDB[senderLid] = { geos: geosDB[senderLid] };
      }
      const cantidad = Number(recompensa.valor);
      const geosAntes = geosDB[senderLid].geos || 0;
      geosDB[senderLid].geos = geosAntes + cantidad;
      console.log(`💰 [CALENDARIO] ${senderLid}: ${geosAntes} → ${geosDB[senderLid].geos} (+${cantidad})`);
      if (helpers && helpers.guardarGeos) {
        helpers.guardarGeos();
        console.log('💾 [CALENDARIO] Geos guardados con helpers.guardarGeos()');
      }
      reclamos[senderLid].push(dia);
      guardarJSON(RECLAMOS_FILE, reclamos);
      return sock.sendMessage(from, {
        text: `🎉 *¡Recompensa reclamada!*\n\n📅 Día: ${dia}\n💰 Tipo: Geos\n🎁 Recompensa: *${cantidad} GEOS*\n\n💵 Total actual: *${geosDB[senderLid].geos} GEOS*`
      });

    } else if (recompensa.tipo === "personaje") {
      const inventario = cargarJSON(INVENTARIO_FILE);
      if (!inventario[senderLid]) inventario[senderLid] = [];
      inventario[senderLid].push(recompensa.valor);
      guardarJSON(INVENTARIO_FILE, inventario);
      reclamos[senderLid].push(dia);
      guardarJSON(RECLAMOS_FILE, reclamos);
      return sock.sendMessage(from, {
        text: `🎉 *¡Recompensa reclamada!*\n\n📅 Día: ${dia}\n🎭 Tipo: Personaje\n🎁 Recompensa: *${recompensa.valor}*\n\nEl personaje ha sido añadido a tu inventario.`
      });
      
    } else if (recompensa.tipo === "vip") {
      const tiempoVIP = recompensa.valor;
      const tiempoTexto = recompensa.tiempoTexto || formatearTiempo(tiempoVIP);
      const resultadoVIP = agregarTiempoVIP(senderLid, tiempoVIP);
      if (!resultadoVIP.success) {
        return sock.sendMessage(from, { text: "❌ Error al otorgar el tiempo VIP." });
      }
      reclamos[senderLid].push(dia);
      guardarJSON(RECLAMOS_FILE, reclamos);
      const nuevaExpiracion = new Date(resultadoVIP.nuevaExpira).toLocaleString();
      return sock.sendMessage(from, {
        text: `🎉 *¡Recompensa VIP reclamada!*\n\n📅 Día: ${dia}\n👑 Tipo: Tiempo VIP\n⏰ Tiempo otorgado: *${tiempoTexto}*\n⏱️ Tiempo total VIP: *${resultadoVIP.tiempoTotal}*\n📅 Nueva expiración: *${nuevaExpiracion}*\n\n¡Disfruta de tus beneficios VIP! 🎊`
      });
      
    } else {
      return sock.sendMessage(from, { text: "❌ Tipo de recompensa no válido." });
    }

  } catch (error) {
    console.error("Error al procesar recompensa:", error);
    return sock.sendMessage(from, { text: "❌ Error al procesar la recompensa." });
  }
}
