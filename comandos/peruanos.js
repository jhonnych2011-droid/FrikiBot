import fs from 'fs';
import { sendSafe } from '../bot.js';

// ===========================
// CONFIGURACIÓN VIP
// ===========================
export const command = 'peruanos';
export const description = 'Sistema de gestión de trabajadores (Exclusivo VIP Nivel 1).';
export const isVIP = true;
export const requiredLevel = 1;

// ===========================
// CONFIGURACIÓN DEL SISTEMA
// ===========================
const LIMITE_PERUANOS = 18; // Límite máximo de peruanos por usuario

const peruanosPath = './peruanos.json';

// Inicializar archivo si no existe
if (!fs.existsSync(peruanosPath)) {
  fs.writeFileSync(peruanosPath, JSON.stringify({}, null, 2));
}

function cargarPeruanos() {
  try {
    return JSON.parse(fs.readFileSync(peruanosPath, 'utf8'));
  } catch(e) {
    return {};
  }
}

function guardarPeruanos(data) {
  fs.writeFileSync(peruanosPath, JSON.stringify(data, null, 2));
}

function getUserData(userId) {
  const peruanos = cargarPeruanos();
  if (!peruanos[userId]) {
    peruanos[userId] = {
      peruanos: [],
      agua: 0,
      comida: 0,
      areas: { minar: [], cultivar: [], pesca: [] }
    };
    guardarPeruanos(peruanos);
  }
  return peruanos[userId];
}

// ===========================
// SISTEMA AUTOMÁTICO DE PERUANOS
// ===========================

const GEOS_POR_AREA = {
  minar: 150,
  cultivar: 120,
  pesca: 100
};

const AUMENTO_HAMBRE_HORA = 1.5;
const AUMENTO_SED_HORA = 2;

function procesarPeruanos() {
  const peruanos = cargarPeruanos();
  let cambios = false;
  const ahora = Date.now();

  for (const userId in peruanos) {
    const userData = peruanos[userId];
    const peruanosAEliminar = [];

    for (let i = 0; i < userData.peruanos.length; i++) {
      const peruano = userData.peruanos[i];
      const tiempoTranscurrido = ahora - (peruano.ultimaActualizacion || ahora);
      const horasTranscurridas = tiempoTranscurrido / (1000 * 60 * 60);

      if (peruano.durmiendo && peruano.horaDormir) {
        const tiempoDurmiendo = ahora - peruano.horaDormir;
        const horasDurmiendo = tiempoDurmiendo / (1000 * 60 * 60);
        
        if (horasDurmiendo >= 8) {
          peruano.durmiendo = false;
          peruano.horaDormir = null;
          cambios = true;
        }
      }

      if (!peruano.durmiendo && horasTranscurridas > 0) {
        peruano.hambre = Math.min(100, peruano.hambre + (horasTranscurridas * AUMENTO_HAMBRE_HORA));
        peruano.sed = Math.min(100, peruano.sed + (horasTranscurridas * AUMENTO_SED_HORA));
        cambios = true;
      }

      if (peruano.area && !peruano.durmiendo && horasTranscurridas > 0) {
        const geosPorHora = GEOS_POR_AREA[peruano.area] || 0;
        const geosGenerados = Math.floor(geosPorHora * horasTranscurridas);
        
        let eficiencia = 1.0;
        if (peruano.hambre >= 70 || peruano.sed >= 70) {
          eficiencia = 0.3;
        } else if (peruano.hambre >= 50 || peruano.sed >= 50) {
          eficiencia = 0.6;
        } else if (peruano.hambre >= 30 || peruano.sed >= 30) {
          eficiencia = 0.8;
        }

        peruano.dineroGenerado += Math.floor(geosGenerados * eficiencia);
        cambios = true;
      }

      if (peruano.hambre >= 85 || peruano.sed >= 85) {
        peruanosAEliminar.push(i);
        cambios = true;
        
        for (const area in userData.areas) {
          const index = userData.areas[area].indexOf(peruano.id);
          if (index > -1) {
            userData.areas[area].splice(index, 1);
          }
        }
      }

      peruano.ultimaActualizacion = ahora;
    }

    for (let i = peruanosAEliminar.length - 1; i >= 0; i--) {
      userData.peruanos.splice(peruanosAEliminar[i], 1);
    }
  }

  if (cambios) {
    guardarPeruanos(peruanos);
  }
}

setInterval(() => {
  try {
    procesarPeruanos();
    console.log('✓ Peruanos procesados automáticamente');
  } catch (e) {
    console.error('Error procesando peruanos:', e);
  }
}, 5 * 60 * 1000);

setTimeout(() => {
  procesarPeruanos();
  console.log('✓ Sistema de peruanos iniciado');
}, 2000);

// ===========================
// HANDLERS POR COMANDO
// ===========================

async function handleComprarpr(sock, msg, args, geosDB, helpers) {
  const sender = helpers.getId(msg);
  const from = msg.key.remoteJid;
  const tipo = args[0]?.toLowerCase();
  const cantidad = parseInt(args[1]) || 1;

  if (!tipo) {
    return await sendSafe(sock, from, {
      text: '❌ Uso: .peruanos comprar <peruano/agua/comida> <cantidad>\n\nEjemplo: .peruanos comprar peruano 2'
    });
  }

  if (!geosDB[sender]) {
    geosDB[sender] = { geos: 0 };
  }

  const geosActuales = geosDB[sender].geos || 0;

  if (tipo === 'peruano') {
    // ✅ VALIDAR LÍMITE DE 18 PERUANOS
    const userData = getUserData(sender);
    const peruanosActuales = userData.peruanos.length;
    
    if (peruanosActuales >= LIMITE_PERUANOS) {
      return await sendSafe(sock, from, {
        text: `❌ Has alcanzado el límite máximo de peruanos.\n\n👥 Límite: ${LIMITE_PERUANOS} peruanos\n📊 Tienes: ${peruanosActuales} peruanos\n\n💡 No puedes comprar más peruanos.`
      });
    }
    
    // ✅ AJUSTAR CANTIDAD SI EXCEDE EL LÍMITE
    const espacioDisponible = LIMITE_PERUANOS - peruanosActuales;
    if (cantidad > espacioDisponible) {
      return await sendSafe(sock, from, {
        text: `❌ No puedes comprar ${cantidad} peruano(s).\n\n👥 Límite: ${LIMITE_PERUANOS} peruanos\n📊 Tienes: ${peruanosActuales} peruanos\n✅ Puedes comprar: ${espacioDisponible} peruano(s) más\n\n💡 Usa: .peruanos comprar peruano ${espacioDisponible}`
      });
    }

    const costo = 29000 * cantidad;
    
    if (geosActuales < costo) {
      return await sendSafe(sock, from, {
        text: `❌ No tienes suficientes geos.\n\n💰 Necesitas: ${costo.toLocaleString()} geos\n💳 Tienes: ${geosActuales.toLocaleString()} geos\n📉 Te faltan: ${(costo - geosActuales).toLocaleString()} geos`
      });
    }

    geosDB[sender].geos = geosActuales - costo;
    
    const peruanos = cargarPeruanos();
    
    for (let i = 0; i < cantidad; i++) {
      const peruanoId = userData.peruanos.length + 1;
      userData.peruanos.push({
        id: peruanoId,
        nombre: `Peruano #${peruanoId}`,
        hambre: 0,
        sed: 0,
        durmiendo: false,
        horaDormir: null,
        area: null,
        dineroGenerado: 0,
        ultimaActualizacion: Date.now()
      });
    }

    peruanos[sender] = userData;
    guardarPeruanos(peruanos);

    return await sendSafe(sock, from, {
      text: `✅ Has comprado ${cantidad} peruano(s) por ${costo.toLocaleString()} geos.\n\n👥 Total de peruanos: ${userData.peruanos.length}/${LIMITE_PERUANOS}\n💰 Geos restantes: ${geosDB[sender].geos.toLocaleString()}`
    });
  }

  if (tipo === 'agua') {
    const costo = 6000 * cantidad;
    
    if (geosActuales < costo) {
      return await sendSafe(sock, from, {
        text: `❌ No tienes suficientes geos.\n\n💰 Necesitas: ${costo.toLocaleString()} geos\n💳 Tienes: ${geosActuales.toLocaleString()} geos`
      });
    }

    geosDB[sender].geos = geosActuales - costo;
    
    const peruanos = cargarPeruanos();
    const userData = getUserData(sender);
    userData.agua += cantidad;
    peruanos[sender] = userData;
    guardarPeruanos(peruanos);

    return await sendSafe(sock, from, {
      text: `✅ Has comprado ${cantidad} unidad(es) de agua por ${costo.toLocaleString()} geos.\n\n💧 Total agua: ${userData.agua}\n💰 Geos restantes: ${geosDB[sender].geos.toLocaleString()}`
    });
  }

  if (tipo === 'comida') {
    const costo = 7000 * cantidad;
    
    if (geosActuales < costo) {
      return await sendSafe(sock, from, {
        text: `❌ No tienes suficientes geos.\n\n💰 Necesitas: ${costo.toLocaleString()} geos\n💳 Tienes: ${geosActuales.toLocaleString()} geos`
      });
    }

    geosDB[sender].geos = geosActuales - costo;
    
    const peruanos = cargarPeruanos();
    const userData = getUserData(sender);
    userData.comida += cantidad;
    peruanos[sender] = userData;
    guardarPeruanos(peruanos);

    return await sendSafe(sock, from, {
      text: `✅ Has comprado ${cantidad} unidad(es) de comida por ${costo.toLocaleString()} geos.\n\n🍖 Total comida: ${userData.comida}\n💰 Geos restantes: ${geosDB[sender].geos.toLocaleString()}`
    });
  }

  return await sendSafe(sock, from, {
    text: '❌ Tipo inválido. Usa: peruano, agua o comida'
  });
}

async function handleDar(sock, msg, args, geosDB, helpers) {
  const sender = helpers.getId(msg);
  const from = msg.key.remoteJid;
  const tipo = args[0]?.toLowerCase();

  if (!tipo || (tipo !== 'agua' && tipo !== 'comida')) {
    return await sendSafe(sock, from, {
      text: '❌ Uso: .peruanos dar <agua/comida>\n\nEjemplo: .peruanos dar agua'
    });
  }

  const userData = getUserData(sender);

  if (userData.peruanos.length === 0) {
    return await sendSafe(sock, from, {
      text: '❌ No tienes peruanos. Compra con: .peruanos comprar peruano <cantidad>'
    });
  }

  const numPeruanos = userData.peruanos.length;
  const peruanos = cargarPeruanos();

  if (tipo === 'agua') {
    if (userData.agua < numPeruanos) {
      return await sendSafe(sock, from, {
        text: `❌ No tienes suficiente agua.\n\n💧 Necesitas: ${numPeruanos} unidades\n💧 Tienes: ${userData.agua} unidades`
      });
    }

    userData.agua -= numPeruanos;
    let detalles = [];
    
    for (const peruano of userData.peruanos) {
      const sedAntes = peruano.sed;
      peruano.sed = Math.max(0, peruano.sed - 4);
      detalles.push(`${peruano.nombre}: ${sedAntes.toFixed(1)}% → ${peruano.sed.toFixed(1)}%`);
    }

    peruanos[sender] = userData;
    guardarPeruanos(peruanos);

    let texto = `✅ Has dado agua a ${numPeruanos} peruano(s).\n\n💧 Agua restante: ${userData.agua}\n📉 Sed reducida:\n\n`;
    texto += detalles.slice(0, 5).join('\n');
    if (detalles.length > 5) texto += `\n... y ${detalles.length - 5} más`;

    return await sendSafe(sock, from, { text: texto });
  }

  if (tipo === 'comida') {
    if (userData.comida < numPeruanos) {
      return await sendSafe(sock, from, {
        text: `❌ No tienes suficiente comida.\n\n🍖 Necesitas: ${numPeruanos} unidades\n🍖 Tienes: ${userData.comida} unidades`
      });
    }

    userData.comida -= numPeruanos;
    let detalles = [];
    
    for (const peruano of userData.peruanos) {
      const hambreAntes = peruano.hambre;
      peruano.hambre = Math.max(0, peruano.hambre - 4);
      detalles.push(`${peruano.nombre}: ${hambreAntes.toFixed(1)}% → ${peruano.hambre.toFixed(1)}%`);
    }

    peruanos[sender] = userData;
    guardarPeruanos(peruanos);

    let texto = `✅ Has dado comida a ${numPeruanos} peruano(s).\n\n🍖 Comida restante: ${userData.comida}\n📉 Hambre reducida:\n\n`;
    texto += detalles.slice(0, 5).join('\n');
    if (detalles.length > 5) texto += `\n... y ${detalles.length - 5} más`;

    return await sendSafe(sock, from, { text: texto });
  }
}

async function handleDormir(sock, msg, args, geosDB, helpers) {
  const sender = helpers.getId(msg);
  const from = msg.key.remoteJid;
  const hora = parseInt(args[0]);

  if (isNaN(hora) || hora < 0 || hora > 23) {
    return await sendSafe(sock, from, {
      text: '❌ Uso: .peruanos dormir <hora>\n\nLa hora debe ser la hora de tu reloj (0 a 23).\nEjemplo: .peruanos dormir 22'
    });
  }

  const userData = getUserData(sender);

  if (userData.peruanos.length === 0) {
    return await sendSafe(sock, from, {
      text: '❌ No tienes peruanos.'
    });
  }
  
  procesarPeruanos();

  const peruanos = cargarPeruanos();

  for (const peruano of userData.peruanos) {
    if (!peruano.durmiendo) {
      peruano.durmiendo = true;
      peruano.horaDormir = Date.now();
    }
  }

  peruanos[sender] = userData;
  guardarPeruanos(peruanos);

  return await sendSafe(sock, from, {
    text: `😴 Todos tus ${userData.peruanos.length} peruanos se han ido a dormir.\n\n⏰ Despertarán en 8 horas.`
  });
}

async function handleAsignarar(sock, msg, args, geosDB, helpers) {
  const sender = helpers.getId(msg);
  const from = msg.key.remoteJid;
  const area = args[0]?.toLowerCase();
  const cantidad = parseInt(args[1]);

  if (!area || isNaN(cantidad)) {
    return await sendSafe(sock, from, {
      text: '❌ Uso: .peruanos asignar <area> <cantidad>\n\nÁreas disponibles: minar, cultivar, pesca\nMáximo 6 peruanos por área\n\nEjemplo: .peruanos asignar minar 3'
    });
  }

  if (!['minar', 'cultivar', 'pesca'].includes(area)) {
    return await sendSafe(sock, from, {
      text: '❌ Área inválida. Usa: minar, cultivar o pesca'
    });
  }

  if (cantidad > 6 || cantidad < 1) {
    return await sendSafe(sock, from, {
      text: '❌ Debes asignar entre 1 y 6 peruanos por área.'
    });
  }

  const userData = getUserData(sender);
  const peruanosDisponibles = userData.peruanos.filter(p => p.area === null);

  if (peruanosDisponibles.length < cantidad) {
    return await sendSafe(sock, from, {
      text: `❌ Solo tienes ${peruanosDisponibles.length} peruano(s) sin asignar.\n\nTotal de peruanos: ${userData.peruanos.length}`
    });
  }

  const peruanos = cargarPeruanos();

  for (let i = 0; i < cantidad; i++) {
    const peruanoParaAsignar = userData.peruanos.find(p => p.id === peruanosDisponibles[i].id);
    if (peruanoParaAsignar) {
      peruanoParaAsignar.area = area;
      if (!userData.areas[area].includes(peruanoParaAsignar.id)) {
        userData.areas[area].push(peruanoParaAsignar.id);
      }
    }
  }

  peruanos[sender] = userData;
  guardarPeruanos(peruanos);

  return await sendSafe(sock, from, {
    text: `✅ Has asignado ${cantidad} peruano(s) al área de *${area}*.\n\n📊 Peruanos en ${area}: ${userData.areas[area].length}/6`
  });
}

async function handleEstadistica(sock, msg, args, geosDB, helpers) {
  const sender = helpers.getId(msg);
  const from = msg.key.remoteJid;
  
  procesarPeruanos(); 
  
  const userData = getUserData(sender);

  if (userData.peruanos.length === 0) {
    return await sendSafe(sock, from, {
      text: '❌ No tienes peruanos. Compra con: .peruanos comprar peruano <cantidad>'
    });
  }

  let texto = '📊 *ESTADÍSTICAS DE PERUANOS*\n\n';
  texto += `👥 Total: ${userData.peruanos.length}/${LIMITE_PERUANOS}\n`;
  texto += `💧 Agua disponible: ${userData.agua}\n`;
  texto += `🍖 Comida disponible: ${userData.comida}\n\n`;
  texto += '━━━━━━━━━━━━━━━━━━\n\n';

  let totalGeneradoPendiente = 0;
  
  for (const peruano of userData.peruanos.slice(0, 18)) {
    const estado = peruano.durmiendo ? '😴 Durmiendo' : '💼 Trabajando';
    const area = peruano.area || 'Sin asignar';
    
    let alerta = '';
    let estadoSalud = '';
    
    if (peruano.hambre >= 85 || peruano.sed >= 85) {
      alerta = ' 🔴 *CRÍTICO - MORIRÁ PRONTO*';
      estadoSalud = '☠️';
    } else if (peruano.hambre >= 70 || peruano.sed >= 70) {
      alerta = ' 🟠 *MUY MAL ESTADO*';
      estadoSalud = '😰';
    } else if (peruano.hambre >= 50 || peruano.sed >= 50) {
      alerta = ' 🟡 *NECESITA ATENCIÓN*';
      estadoSalud = '😟';
    } else if (peruano.hambre <= 20 && peruano.sed <= 20) {
      estadoSalud = '😊 *ÓPTIMO*';
    } else {
      estadoSalud = '🙂 *BIEN*';
    }
    
    totalGeneradoPendiente += peruano.dineroGenerado;

    texto += `👤 *${peruano.nombre}* (ID: ${peruano.id})${alerta}\n`;
    texto += `${estadoSalud} 🍖 Hambre: ${peruano.hambre.toFixed(1)}% | 💧 Sed: ${peruano.sed.toFixed(1)}%\n`;
    texto += `📍 Área: ${area} | ${estado}\n`;
    texto += `💰 Generado: ${peruano.dineroGenerado.toLocaleString()} geos\n`;
    texto += `━━━━━━━━━━━━━━━━━━\n`;
  }

  if (userData.peruanos.length > 18) {
    texto += `\n⚠️ Mostrando solo los primeros 18 peruanos`;
  }
  
  texto += `\n💸 *Total Pendiente a Reclamar*: ${totalGeneradoPendiente.toLocaleString()} geos`;

  return await sendSafe(sock, from, { text: texto });
}

async function handleReclamarpr(sock, msg, args, geosDB, helpers) {
  const sender = helpers.getId(msg);
  const from = msg.key.remoteJid;
  const area = args[0]?.toLowerCase();

  if (!area || !['minar', 'cultivar', 'pesca', 'todo'].includes(area)) {
    return await sendSafe(sock, from, {
      text: '❌ Uso: .peruanos reclamar <area>\n\nÁreas disponibles: minar, cultivar, pesca o *todo*\n\nEjemplo: .peruanos reclamar minar'
    });
  }
  
  procesarPeruanos();

  const userData = getUserData(sender);
  let totalGenerado = 0;
  const peruanos = cargarPeruanos();

  const areasAfectadas = area === 'todo' ? ['minar', 'cultivar', 'pesca'] : [area];

  for (const peruano of userData.peruanos) {
    if (areasAfectadas.includes(peruano.area)) {
      totalGenerado += peruano.dineroGenerado;
      peruano.dineroGenerado = 0;
    }
  }

  if (totalGenerado === 0) {
     const areasMsg = area === 'todo' ? 'en todas las áreas' : `en el área de *${area}*`;
     return await sendSafe(sock, from, {
      text: `❌ No hay geos generados pendientes para reclamar ${areasMsg}.`
    });
  }

  if (!geosDB[sender]) {
    geosDB[sender] = { geos: 0 };
  }

  geosDB[sender].geos = (geosDB[sender].geos || 0) + totalGenerado;
  peruanos[sender] = userData;
  guardarPeruanos(peruanos);
  
  const nombreArea = area === 'todo' ? 'todas las áreas' : `el área de *${area}*`;

  return await sendSafe(sock, from, {
    text: `💰 Has reclamado *${totalGenerado.toLocaleString()} geos* de ${nombreArea}.\n\n💳 Total de geos: ${geosDB[sender].geos.toLocaleString()}`
  });
}

async function handleNombrar(sock, msg, args, geosDB, helpers) {
  const sender = helpers.getId(msg);
  const from = msg.key.remoteJid;
  const peruanoId = parseInt(args[0]);
  const nombre = args.slice(1).join(' ');

  if (isNaN(peruanoId) || !nombre) {
    return await sendSafe(sock, from, {
      text: '❌ Uso: .peruanos nombrar <id> <nombre>\n\nEjemplo: .peruanos nombrar 1 Juan Pérez'
    });
  }

  const userData = getUserData(sender);
  const peruano = userData.peruanos.find(p => p.id === peruanoId);

  if (!peruano) {
    return await sendSafe(sock, from, {
      text: `❌ No se encontró un peruano con ID ${peruanoId}.\n\nUsa .peruanos stats para ver tus peruanos.`
    });
  }

  if (nombre.length > 25) {
    return await sendSafe(sock, from, {
      text: `❌ El nombre no puede superar los 25 caracteres.`
    });
  }

  const nombreAnterior = peruano.nombre;
  peruano.nombre = nombre;

  const peruanos = cargarPeruanos();
  peruanos[sender] = userData;
  guardarPeruanos(peruanos);

  return await sendSafe(sock, from, {
    text: `✅ Peruano renombrado exitosamente.\n\n📝 Nombre anterior: ${nombreAnterior}\n📝 Nombre nuevo: *${nombre}*\n🆔 ID: ${peruanoId}`
  });
}

// ===========================
// ROUTER PRINCIPAL
// ===========================
export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers) {
  const subcomando = args[0]?.toLowerCase();

  switch(subcomando) {
    case 'comprar':
      return await handleComprarpr(sock, msg, args.slice(1), geosDB, helpers);
    case 'dar':
      return await handleDar(sock, msg, args.slice(1), geosDB, helpers);
    case 'dormir':
      return await handleDormir(sock, msg, args.slice(1), geosDB, helpers);
    case 'asignar':
      return await handleAsignarar(sock, msg, args.slice(1), geosDB, helpers);
    case 'stats':
    case 'estadistica':
      return await handleEstadistica(sock, msg, args.slice(1), geosDB, helpers);
    case 'reclamar':
      return await handleReclamarpr(sock, msg, args.slice(1), geosDB, helpers);
    case 'nombrar':
      return await handleNombrar(sock, msg, args.slice(1), geosDB, helpers);
    default:
      return await sendSafe(sock, msg.key.remoteJid, {
        text: `📋 *SISTEMA DE PERUANOS (VIP Nivel 1)*

Comandos disponibles:

🛒 Compras:
  .peruanos comprar peruano <cantidad>
  .peruanos comprar agua <cantidad>
  .peruanos comprar comida <cantidad>

🍖 Recursos:
  .peruanos dar agua
  .peruanos dar comida

💼 Gestión:
  .peruanos asignar <area> <cantidad>
  .peruanos dormir <hora>
  .peruanos nombrar <id> <nombre>

📊 Información:
  .peruanos stats
  .peruanos reclamar <area/todo>

👥 Límite: 18 peruanos por usuario
Áreas: minar, cultivar, pesca`
      });
  }
}
