import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import P from 'pino';
import QRCode from 'qrcode';
import { eliminarMuteados } from './comandos/mute.js';
import { revisarDeudas } from './comandos/devolver.js';
import * as pppModule from './comandos/ppp.js';
import { verificarYEliminarLink } from './comandos/antilink.js';
import { verificarYEliminarEstado } from './comandos/antiestados.js';
import './eventChecker.js';

// ==========================
// SISTEMA DE SUB-BOTS
// ==========================
function resolveSessionFolder() {
  const args = process.argv.slice(2);
  const instanceFlagIndex = args.indexOf('--instance');
  
  if (instanceFlagIndex !== -1) {
    const value = args[instanceFlagIndex + 1];
    const instanceNumber = Number.parseInt(value, 10);
    
    if (instanceNumber === 1) return './session1';
    if (instanceNumber === 2) return './session2';
    if (instanceNumber === 3) return './session3';
    if (instanceNumber === 4) return './session4';
    if (instanceNumber === 5) return './session5';
  }
  
  return './session';
}

const sessionFolder = resolveSessionFolder();
const instanceName = path.basename(sessionFolder);

if (!fs.existsSync(sessionFolder)) {
  fs.mkdirSync(sessionFolder, { recursive: true });
}

console.log(`🤖 Iniciando bot: ${instanceName.toUpperCase()}`);
console.log(`📁 Carpeta de sesión: ${sessionFolder}`);

// ==========================
// MARCA DE TIEMPO DE INICIO
// ==========================
const BOT_START_TIME = Date.now();
const MESSAGE_MAX_AGE = 60000;

// ==========================
// CONFIGURACIÓN ANTI-BAN
// ==========================
const ANTIBAN_CONFIG = {
  MIN_DELAY: 2000,
  MAX_DELAY: 4000,
  MIN_TYPING: 800,
  MAX_TYPING: 1500,
  MAX_MENSAJES_POR_MINUTO: 12,
  MAX_MENSAJES_POR_GRUPO_MIN: 6,
  COOLDOWN_USUARIO: 4000,
  PAUSA_CADA_N_MENSAJES: 15,
  TIEMPO_PAUSA: 12000,
};

let mensajesEnviados = 0;
let ultimoResetContador = Date.now();
const mensajesPorGrupo = new Map();
const ultimoComandoPorUsuario = new Map();

// ==========================
// AYUDANTES
// ==========================
const helpers = {
  fixId: (jid) => {
    if (!jid) return '';
    return jid.replace(/@.+$/, "@lid");
  },

  getId: (msg) => {
    return msg.key.participant || msg.key.remoteJid || '';
  },

  formatearNumero: (raw) => {
    if (!raw) return 'Desconocido';
    const codigo = raw.slice(0, 3);
    const resto = raw.slice(3);
    const numeroFormateado = resto.replace(/(\d{4})(?=\d)/g, '$1 ');
    return `+${codigo} ${numeroFormateado}`;
  },

  delay: (ms) => new Promise(res => setTimeout(res, ms)),
  randomDelay: (min, max) => min + Math.floor(Math.random() * (max - min)),
  
  isSelfMessage: (sock, msg) => {
    if (!sock.user || !msg.key) return false;
    const botJid = sock.user.id;
    const senderJid = msg.key.participant || msg.key.remoteJid || '';
    return botJid === senderJid;
  }
};

const getId = helpers.getId;
const delay = helpers.delay;
const formatearNumero = helpers.formatearNumero;
const randomDelay = helpers.randomDelay;

// ==========================
// SIMULAR ESCRITURA
// ==========================
async function simularEscritura(sock, jid, duracion = 1500) {
  try {
    if (jid.includes('@g.us')) {
      await sock.presenceSubscribe(jid);
      await delay(100);
    }
    await sock.sendPresenceUpdate('available', jid);
    await delay(50);
    await sock.sendPresenceUpdate('composing', jid);
    await delay(duracion / 2);
    await sock.sendPresenceUpdate('composing', jid);
    await delay(duracion / 2);
  } catch {}
}

// ==========================
// sendSafe MEJORADO
// ==========================
let sendQueue = Promise.resolve();
let pausado = false;

export async function sendSafe(sock, jid, contenido, opciones = {}) {
  sendQueue = sendQueue.then(async () => {
    try {
      while (pausado) await delay(1000);

      if (Date.now() - ultimoResetContador > 60000) {
        mensajesEnviados = 0;
        ultimoResetContador = Date.now();
        mensajesPorGrupo.clear();
      }

      if (mensajesEnviados >= ANTIBAN_CONFIG.MAX_MENSAJES_POR_MINUTO) {
        await delay(10000);
        mensajesEnviados = 0;
      }

      if (jid.includes('@g.us')) {
        const count = mensajesPorGrupo.get(jid) || 0;
        if (count >= ANTIBAN_CONFIG.MAX_MENSAJES_POR_GRUPO_MIN) {
          await delay(randomDelay(5000, 8000));
          mensajesPorGrupo.set(jid, 0);
        }
        mensajesPorGrupo.set(jid, count + 1);
      }

      if (mensajesEnviados > 0 && mensajesEnviados % ANTIBAN_CONFIG.PAUSA_CADA_N_MENSAJES === 0) {
        pausado = true;
        await delay(ANTIBAN_CONFIG.TIEMPO_PAUSA);
        pausado = false;
      }

      const typingTime = randomDelay(ANTIBAN_CONFIG.MIN_TYPING, ANTIBAN_CONFIG.MAX_TYPING);
      await simularEscritura(sock, jid, typingTime);
      await sock.sendMessage(jid, contenido, opciones);
      mensajesEnviados++;
      await delay(randomDelay(ANTIBAN_CONFIG.MIN_DELAY, ANTIBAN_CONFIG.MAX_DELAY));
    } catch (err) {
      console.log('Error en sendSafe:', err);
      await delay(5000);
    }
  });
  return sendQueue;
}

// ====================================
// BASES DE DATOS
// ====================================
const geosPath = './geos.json';
let geosDB = fs.existsSync(geosPath) ? JSON.parse(fs.readFileSync(geosPath, 'utf-8')) : {};
function guardarGeos() { fs.writeFileSync(geosPath, JSON.stringify(geosDB, null, 2)); }
function recargarGeos() { geosDB = JSON.parse(fs.readFileSync(geosPath, 'utf-8')); }

const dropsPath = './drops.json';
let dropsDB = fs.existsSync(dropsPath) ? JSON.parse(fs.readFileSync(dropsPath, 'utf-8')) : {};
function guardarDrops() { fs.writeFileSync(dropsPath, JSON.stringify(dropsDB, null, 2)); }

const comandosPath = './comandos.json';
let comandosDB = fs.existsSync(comandosPath) ? JSON.parse(fs.readFileSync(comandosPath, 'utf8')) : {};
function guardarComandos() { fs.writeFileSync(comandosPath, JSON.stringify(comandosDB, null, 2)); }

const pppTemp = {};

// ==========================
// Lista de baneos
// ==========================
const banlistPath = './bot/data/banlist.json';
if (!fs.existsSync('./bot/data')) fs.mkdirSync('./bot/data', { recursive: true });
if (!fs.existsSync(banlistPath)) fs.writeFileSync(banlistPath, JSON.stringify({}, null, 2));

function isBanned(remitente) {
  const bans = JSON.parse(fs.readFileSync(banlistPath, 'utf-8'));
  return !!bans[remitente];
}

// ==========================
// Propietarios
// ==========================
const ownersPath = './owners.json';
if (!fs.existsSync(ownersPath)) fs.writeFileSync(ownersPath, JSON.stringify([], null, 2));

function getOwners() {
  try {
    const data = JSON.parse(fs.readFileSync(ownersPath, 'utf-8'));
    if (!Array.isArray(data)) return [];
    return data.map(o => {
      if (o.includes('@s.whatsapp.net')) {
        return o.replace('@s.whatsapp.net', '@lid');
      }
      return o;
    });
  } catch(e) {
    console.error('Error al leer propietarios:', e);
    return [];
  }
}

function isOwner(jid) {
  const owners = getOwners();
  const userLid = helpers.fixId(jid);
  return owners.includes(userLid);
}
// ==========================
// Configuración
// ==========================
const configPath = './bot/data/config.json';
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify({ onlyOwners: false }, null, 2));
}

function cargarConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch(e) {
    return { onlyOwners: false };
  }
}

function guardarConfig(data) {
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

let config = cargarConfig();

// ==========================
// SISTEMA DE IMPUESTO SEMANAL
// ==========================
const impuestoPath = './impuesto.json';

if (!fs.existsSync(impuestoPath)) {
  fs.writeFileSync(impuestoPath, JSON.stringify({
    ultimoImpuesto: Date.now(),
    intervaloMs: 7*24*60*60*1000,
    porcentaje: 15
  }, null, 2));
}

function cargarImpuesto() {
  try {
    return JSON.parse(fs.readFileSync(impuestoPath, 'utf8'));
  } catch(e) {
    return {
      ultimoImpuesto: Date.now(),
      intervaloMs: 7*24*60*60*1000,
      porcentaje: 15
    };
  }
}

function guardarImpuesto(data) {
  fs.writeFileSync(impuestoPath, JSON.stringify(data, null, 2));
}

async function aplicarImpuestoSemanal(sock) {
  const impuestoConfig = cargarImpuesto();
  const ahora = Date.now();
  const tiempoTranscurrido = ahora - impuestoConfig.ultimoImpuesto;

  if (tiempoTranscurrido >= impuestoConfig.intervaloMs) {
    console.log(`💰 [${instanceName}] Aplicando impuesto semanal del 15%...`);
    
    let usuariosAfectados = 0;
    let geosQuitados = 0;

    for (const usuarioLid in geosDB) {
      let geosActuales;
      if (typeof geosDB[usuarioLid] === 'object' && geosDB[usuarioLid] !== null) {
        geosActuales = geosDB[usuarioLid].geos || 0;
      } else {
        geosActuales = geosDB[usuarioLid] || 0;
      }
      
      if (geosActuales > 0) {
        const impuesto = Math.floor(geosActuales * (impuestoConfig.porcentaje / 100));
        const nuevosGeos = geosActuales - impuesto;
        
        if (typeof geosDB[usuarioLid] === 'object' && geosDB[usuarioLid] !== null) {
          geosDB[usuarioLid].geos = nuevosGeos;
        } else {
          geosDB[usuarioLid] = nuevosGeos;
        }
        
        usuariosAfectados++;
        geosQuitados += impuesto;
      }
    }

    guardarGeos();
    impuestoConfig.ultimoImpuesto = ahora;
    guardarImpuesto(impuestoConfig);

    console.log(`✅ [${instanceName}] Impuesto aplicado a ${usuariosAfectados} usuarios`);
    console.log(`📊 [${instanceName}] Total de geos eliminados: ${geosQuitados}`);

    try {
      const alertaData = fs.existsSync('./alerta.json')
        ? JSON.parse(fs.readFileSync('./alerta.json','utf8'))
        : { grupoAlerta: null };
      
      if (alertaData.grupoAlerta) {
        const mensaje = `📣 *IMPUESTO SEMANAL APLICADO* [${instanceName}]\n\n` +
                       `👤 Usuarios afectados: ${usuariosAfectados}\n` +
                       `💸 Geos totales quitados: ${geosQuitados}\n` +
                       `📈 Porcentaje: ${impuestoConfig.porcentaje}%\n` +
                       `› Próximo impuesto: en 7 días`;
        
        await sendSafe(sock, alertaData.grupoAlerta, { text: mensaje });
      }
    } catch(e) {
      console.log(`Error enviando notificación de impuesto [${instanceName}]:`, e);
    }

    return { usuariosAfectados, geosQuitados };
  }

  return null;
}

// ==========================
// Editar mensajes
// ==========================
async function editarMensaje(sock, jid, key, nuevoTexto) {
  try {
    if (sock.ws && sock.ws.readyState === 1)
      await sock.sendMessage(jid, { text: nuevoTexto, edit: key });
  } catch (err) {
    console.error('Error al editar: ', err);
  }
}

// ==========================
// Cargar comandos
// ==========================
async function cargarComandos() {
  const comandos = new Map();
  const comandosDir = './comandos';
  if (!fs.existsSync(comandosDir)) fs.mkdirSync(comandosDir);
  const archivos = fs.readdirSync(comandosDir).filter(f => f.endsWith('.js'));
  for (const archivo of archivos) {
    try {
      const rutaArchivo = path.resolve(comandosDir, archivo);
      const mod = await import(`file://${rutaArchivo}?update=${Date.now()}`);
      if (mod.command && typeof mod.run === 'function') {
        comandos.set(mod.command.toLowerCase(), mod);
        console.log(`✅ [${instanceName}] Comando cargado: ${archivo}`);
      }
    } catch (e) {
      console.log(`Error al cargar ${archivo}:`, e);
    }
  }
  return comandos;
}

// ==========================
// Antispam
// ==========================
const spamCounter = {};
const LIMITE_COMANDOS = 8;
const INTERVALO_MS = 60000;

// ===================================================================================
// ✅ SISTEMA VIP COMPATIBLE CON LID
// ===================================================================================
const VIP_COST = 62000;
const VIP_DURATION_MS = 24 * 60 * 60 * 1000;
const RENEWAL_TO_DIAMOND = 5;

const vipPath = './vip.json';
let vipDB = fs.existsSync(vipPath) ? JSON.parse(fs.readFileSync(vipPath, 'utf-8')) : {};
function guardarVIP() { fs.writeFileSync(vipPath, JSON.stringify(vipDB, null, 2)); }
function recargarVIP() { vipDB = fs.existsSync(vipPath) ? JSON.parse(fs.readFileSync(vipPath, 'utf-8')) : {}; }

function normalizeToLid(jid) {
  if (!jid) return null;
  if (jid.includes('@lid')) return jid;
  if (jid.includes('@s.whatsapp.net')) {
    const numero = jid.split('@')[0];
    return `${numero}@lid`;
  }
  if (/^\d+$/.test(jid)) return `${jid}@lid`;
  const numero = jid.split('@')[0];
  return `${numero}@lid`;
}

function getGeosFromUser(userLid) {
  if (!userLid) return 0;
  const lid = normalizeToLid(userLid);
  if (!geosDB[lid]) return 0;
  if (typeof geosDB[lid] === 'object' && geosDB[lid] !== null) {
    return parseInt(geosDB[lid].geos) || 0;
  }
  return parseInt(geosDB[lid]) || 0;
}

function subtractGeosFromUser(userLid, amount) {
  const lid = normalizeToLid(userLid);
  if (!lid) return false;
  const currentGeos = getGeosFromUser(lid);
  if (currentGeos < amount) return false;
  const newGeos = currentGeos - amount;
  if (typeof geosDB[lid] === 'object' && geosDB[lid] !== null) {
    geosDB[lid].geos = newGeos;
  } else {
    geosDB[lid] = newGeos;
  }
  guardarGeos();
  return true;
}

async function checkVIPStatus(userJid) {
  const userLid = normalizeToLid(userJid);
  if (!userLid) return { isVIP: false, level: 0, expiry: null, purchases: 0 };
  
  let vipDB;
  try {
    vipDB = JSON.parse(fs.readFileSync('./vip.json', 'utf-8'));
  } catch(e) {
    return { isVIP: false, level: 0, expiry: null, purchases: 0 };
  }
  
  const userData = vipDB[userLid];
  if (!userData || !userData.vipUntil) {
    return { isVIP: false, level: 0, expiry: null, purchases: 0 };
  }
  
  const now = Date.now();
  const expiryTimestamp = userData.vipUntil;
  
  if (now < expiryTimestamp) {
    return { 
      isVIP: true, 
      level: userData.level || 1, 
      expiry: new Date(expiryTimestamp),
      purchases: userData.purchases || 0
    };
  } else {
    return { isVIP: false, level: 0, expiry: null, purchases: userData.purchases || 0 };
  }
}

async function limpiarVIPExpirados(sock) {
  const now = Date.now();
  let expirados = 0;
  let notificados = 0;

  let vipDB;
  try {
    vipDB = JSON.parse(fs.readFileSync('./vip.json', 'utf-8'));
  } catch(e) {
    return { expirados: 0, notificados: 0 };
  }

  for (const userLid in vipDB) {
    const userData = vipDB[userLid];
    
    if (userData.vipUntil && now >= userData.vipUntil) {
      try {
        const match = userLid.match(/^(\d+)@lid$/);
        if (match) {
          const numero = match[1];
          const userJid = `${numero}@s.whatsapp.net`;
          await sendSafe(sock, userJid, {
            text: `⚠️ *TU VIP HA EXPIRADO* [${instanceName}]\n\n` +
                  `Tu membresía VIP Nivel ${userData.level || 1} ha terminado.\n\n` +
                  `💳 Compras realizadas: ${userData.purchases || 0}\n\n` +
                  `Usa .vip para renovar tu acceso por ${VIP_COST} GEOS.`
          });
          notificados++;
        }
      } catch(e) {}
      
      delete vipDB[userLid];
      expirados++;
    }
  }

  if (expirados > 0) {
    try {
      fs.writeFileSync('./vip.json', JSON.stringify(vipDB, null, 2));
    } catch(e) {}
  }

  return { expirados, notificados };
}

async function notificarVIPProximoVencer(sock) {
  const now = Date.now();
  const ventanaAlerta = 24 * 60 * 60 * 1000;
  
  let vipDB;
  try {
    vipDB = JSON.parse(fs.readFileSync('./vip.json', 'utf-8'));
  } catch(e) {
    return;
  }
  
  for (const userLid in vipDB) {
    const userData = vipDB[userLid];
    
    if (userData.vipUntil) {
      const tiempoRestante = userData.vipUntil - now;
      
      if (tiempoRestante > 0 && tiempoRestante <= ventanaAlerta && !userData.alertaEnviada) {
        try {
          const horas = Math.floor(tiempoRestante / (60 * 60 * 1000));
          const match = userLid.match(/^(\d+)@lid$/);
          if (match) {
            const numero = match[1];
            const userJid = `${numero}@s.whatsapp.net`;
            
            await sendSafe(sock, userJid, {
              text: `⚠️ *TU VIP ESTÁ POR VENCER* [${instanceName}]\n\n` +
                    `Nivel: ${userData.level || 1}\n` +
                    `Tiempo restante: ${horas}h\n\n` +
                    `Usa .vip confirmar para renovar por ${VIP_COST} GEOS.`
            });
            
            userData.alertaEnviada = true;
            vipDB[userLid] = userData;
            fs.writeFileSync('./vip.json', JSON.stringify(vipDB, null, 2));
          }
        } catch(e) {}
      }
    }
  }
}

async function ensureVIPAccess(sock, jid, senderJid, requiredLevel = 1) {
  const status = await checkVIPStatus(senderJid);
  
  if (!status.isVIP || status.level < requiredLevel) {
    const nivel = requiredLevel === 2 ? 'Diamante' : 'Oro';
    await sendSafe(sock, jid, { 
      text: `🚫 Comando exclusivo para VIP *Nivel ${requiredLevel}* (${nivel}). Tu nivel actual es ${status.level || 0}.\n\nUsa .vip para adquirir tu membresía de 24 horas por ${VIP_COST} GEOS.` 
    });
    return false;
  }
  return true;
}

function formatRemainingTime(expiryDate) {
  if (!expiryDate) return 'Expirado';
  const totalMs = expiryDate.getTime() - Date.now();
  if (totalMs <= 0) return 'Expirado';
  
  const totalSegundos = Math.floor(totalMs / 1000);
  const dias = Math.floor(totalSegundos / (3600 * 24));
  const horas = Math.floor((totalSegundos % (3600 * 24)) / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  
  const partes = [];
  if (dias > 0) partes.push(`${dias}d`);
  if (horas > 0) partes.push(`${horas}h`);
  if (minutos > 0) partes.push(`${minutos}m`);
  
  return partes.join(' ') || '0m';
}

function guardarLIDEnDB(msg) {
  try {
    const remitente = msg.key.participant || msg.key.remoteJid;
    if (!remitente) return;
    
    const senderLid = normalizeToLid(remitente);
    const senderNum = remitente.split("@")[0];
    const senderName = msg.pushName || 'Sin nombre';
    
    if (Math.random() < 0.01) {
      console.log(`📝 [${instanceName}] LID guardado: ${senderLid} → ${senderName}`);
    }
  } catch(e) {}
}
async function handleVipPurchase(sock, from, remitente, args = []) {
  const confirmar = args[0]?.toLowerCase();
  if (confirmar && confirmar !== 'confirmar' && confirmar !== 'si') {
    return sendSafe(sock, from, { text: 'Envía `.vip confirmar` para proceder con la compra.' });
  }

  const userLid = normalizeToLid(remitente);
  if (!userLid) {
    return sendSafe(sock, from, { text: '❌ No se pudo identificar tu usuario.' });
  }

  const geosActuales = getGeosFromUser(userLid);
  
  if (geosActuales < VIP_COST) {
    return sendSafe(sock, from, { 
      text: `❌ Necesitas ${VIP_COST} GEOS. Actualmente tienes ${geosActuales} GEOS.` 
    });
  }

  const restaExitosa = subtractGeosFromUser(userLid, VIP_COST);
  if (!restaExitosa) {
    return sendSafe(sock, from, { text: '❌ Error al procesar el pago.' });
  }

  const nuevoSaldo = geosActuales - VIP_COST;
  const now = Date.now();
  
  try {
    const vipDB = JSON.parse(fs.readFileSync('./vip.json', 'utf-8'));
    const currentData = vipDB[userLid] || { vipUntil: 0, level: 0, purchases: 0 };
    
    const baseTime = (currentData.vipUntil > now) ? currentData.vipUntil : now;
    const newExpiry = baseTime + VIP_DURATION_MS;
    currentData.purchases = (currentData.purchases || 0) + 1;

    let newLevel = 1;
    if (currentData.purchases >= RENEWAL_TO_DIAMOND) newLevel = 2;

    vipDB[userLid] = { 
      vipUntil: newExpiry, 
      level: newLevel, 
      purchases: currentData.purchases,
      alertaEnviada: false,
      purchasedAt: now
    };
    
    fs.writeFileSync('./vip.json', JSON.stringify(vipDB, null, 2));

    const nivelMensaje = newLevel === 2 ? '💎 *NIVEL DIAMANTE*' : '🏆 *NIVEL ORO*';
    const nivelUpgrade = (newLevel === 2 && currentData.purchases === RENEWAL_TO_DIAMOND)
      ? '\n\n🎉 ¡FELICIDADES! Has alcanzado Nivel Diamante por lealtad.'
      : '';

    return sendSafe(sock, from, {
      text: `✅ *COMPRA VIP EXITOSA*\n\n${nivelMensaje}\nCosto: ${VIP_COST} GEOS\nExpiración: ${new Date(newExpiry).toLocaleString()}\n\nTe quedan ${nuevoSaldo} GEOS.${nivelUpgrade}\n\nUsa .estatusvip para verificar tu tiempo.`
    });
  } catch(e) {
    return sendSafe(sock, from, { text: '❌ Error al procesar la compra VIP.' });
  }
}

async function handleVipStatus(sock, from, remitente) {
  const status = await checkVIPStatus(remitente);
  
  if (status.isVIP && status.expiry) {
    const remainingTime = formatRemainingTime(status.expiry);
    const expiracionFormateada = status.expiry.toLocaleString();
    const nextLevelInfo = status.level === 1 
      ? `\nTe faltan ${5 - (status.purchases || 0)} compras para Nivel Diamante.` 
      : '\n¡Eres Nivel Diamante! Máximo acceso.';
    
    await sendSafe(sock, from, { 
      text: `✨ *ESTADO VIP*\n\n` +
            `Nivel: ${status.level}\n` +
            `Restante: ${remainingTime}\n` +
            `Compras totales: ${status.purchases || 0}${nextLevelInfo}\n\n` +
            `Expira: ${expiracionFormateada}` 
    });
  } else {
    await sendSafe(sock, from, { 
      text: `😔 No eres VIP. Usa .vip para comprar acceso por ${VIP_COST} GEOS.` 
    });
  }
}

async function handleVerVip(sock, from, remitente) {
  if (!isOwner(remitente)) return;
  
  let vipDB;
  try {
    vipDB = JSON.parse(fs.readFileSync('./vip.json', 'utf-8'));
  } catch(e) {
    return sendSafe(sock, from, { text: '❌ Error cargando base de datos VIP.' });
  }
  
  let mensaje = '📊 *BASE DE DATOS VIP*\n\n';
  let activos = 0;
  let expirados = 0;
  const now = Date.now();
  
  for (const [userLid, datos] of Object.entries(vipDB)) {
    const activo = datos.vipUntil && now < datos.vipUntil;
    if (activo) activos++;
    else expirados++;
    
    const expira = datos.vipUntil ? new Date(datos.vipUntil).toLocaleString() : 'Nunca';
    mensaje += `${activo ? '✅' : '❌'} ${userLid}\n`;
    mensaje += `   Nivel: ${datos.level || 1}\n`;
    mensaje += `   Expira: ${expira}\n`;
    mensaje += `   Compras: ${datos.purchases || 0}\n\n`;
  }
  
  mensaje += `\n📈 Estadísticas:\n`;
  mensaje += `✅ Activos: ${activos}\n`;
  mensaje += `❌ Expirados: ${expirados}\n`;
  mensaje += `📊 Total: ${Object.keys(vipDB).length}`;
  
  await sendSafe(sock, from, { text: mensaje });
}

async function handleGeosDebug(sock, from, remitente) {
  const userLid = normalizeToLid(remitente);
  const geos = getGeosFromUser(userLid);
  
  await sendSafe(sock, from, { 
    text: `🔍 *DEBUG GEOS*\n\nLID: ${userLid}\nGEOS: ${geos}\n\nFormato en DB: ${typeof geosDB[userLid]}` 
  });
}

// Sistema de backup de sesión
const sessionBackupPath = `${sessionFolder}_backup.json`;

async function backupSession(creds) {
  try {
    const backup = { timestamp: Date.now(), creds: creds };
    fs.writeFileSync(sessionBackupPath, JSON.stringify(backup, null, 2));
    console.log(`✅ [${instanceName}] Backup de sesión creado`);
  } catch(e) {}
}

async function restoreSessionIfAvailable() {
  if (fs.existsSync(sessionBackupPath)) {
    try {
      const backup = JSON.parse(fs.readFileSync(sessionBackupPath, 'utf-8'));
      if (Date.now() - backup.timestamp < 24 * 60 * 60 * 1000) {
        console.log(`🔄 [${instanceName}] Intentando restaurar sesión desde backup...`);
        return backup.creds;
      }
    } catch(e) {}
  }
  return null;
}

function verificarIntegridadSesion() {
  if (!fs.existsSync(sessionFolder)) {
    return { ok: true, mensaje: 'No existe carpeta de sesión, se creará nueva' };
  }
  
  const archivosCriticos = ['creds.json'];
  const archivosFaltantes = [];
  const archivosCorruptos = [];
  
  for (const archivo of archivosCriticos) {
    const rutaArchivo = path.join(sessionFolder, archivo);
    if (!fs.existsSync(rutaArchivo)) {
      archivosFaltantes.push(archivo);
      continue;
    }
    try {
      const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
      JSON.parse(contenido);
    } catch(e) {
      archivosCorruptos.push(archivo);
    }
  }
  
  if (archivosFaltantes.length > 0 || archivosCorruptos.length > 0) {
    return { ok: false, mensaje: 'Sesión dañada o incompleta', archivosFaltantes, archivosCorruptos };
  }
  
  return { ok: true, mensaje: 'Sesión en buen estado' };
}

let isManualShutdown = false;
let isRestarting = false;
let sock;
let intentos = 0;
const MAX_RECONNECT = 5;

async function iniciarBot() {
  if (intentos >= MAX_RECONNECT) {
    console.log(`❌ [${instanceName}] Límite de reconexiones alcanzado.`);
    return;
  }

  const estadoSesion = verificarIntegridadSesion();
  if (!fs.existsSync(sessionFolder)) {
    fs.mkdirSync(sessionFolder, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

  sock = makeWASocket({
    printQRInTerminal: false,
    logger: P({ level: 'silent' }),
    auth: state,
    shouldIgnoreJid: () => false,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    browser: [`${instanceName.toUpperCase()}`, 'Chrome', '1.0.0']
  });

  sock.getId = msg => getId(msg);
  sock.editarMensaje = (jid, key, texto) => editarMensaje(sock, jid, key, texto);

  sock.ev.on('creds.update', async (creds) => {
    await saveCreds();
    try { await backupSession(creds); } catch(e) {}
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        console.log(`📱 [${instanceName}] Generando QR...`);
        
        // Generar QR como imagen en base64
        const qrImage = await QRCode.toDataURL(qr);
        const qrBuffer = Buffer.from(qrImage.split(',')[1], 'base64');
        
        // Buscar archivo de configuración de QR
        const qrConfigPath = `./qr_config_${instanceName}.json`;
        
        if (fs.existsSync(qrConfigPath)) {
          const qrConfig = JSON.parse(fs.readFileSync(qrConfigPath, 'utf8'));
          const grupoDestino = qrConfig.groupJid;
          
          try {
            await sock.sendMessage(grupoDestino, {
              image: qrBuffer,
              caption: `📱 *QR CODE - ${instanceName.toUpperCase()}*\n\n` +
                      `⏰ Escanea este código QR para conectar el bot.\n\n` +
                      `⚠️ *IMPORTANTE*:\n` +
                      `• El QR expira en 60 segundos\n` +
                      `• No compartas este código\n` +
                      `• Escanea desde WhatsApp > Dispositivos vinculados`
            });
            
            console.log(`✅ [${instanceName}] QR enviado al grupo`);
            
            // Limpiar archivo de configuración después de enviar
            fs.unlinkSync(qrConfigPath);
          } catch (sendError) {
            console.log(`❌ [${instanceName}] Error enviando QR:`, sendError);
          }
        } else {
          console.log(`📱 [${instanceName}] No hay configuración de grupo para enviar QR`);
        }
      } catch(e) {
        console.error(`Error generando QR [${instanceName}]:`, e);
      }
    }

    if (connection === 'open') {
      console.log(`✅ [${instanceName}] Bot conectado exitosamente!`);
      mensajesEnviados = 0;
      ultimoResetContador = Date.now();
      mensajesPorGrupo.clear();
      ultimoComandoPorUsuario.clear();
      
      setInterval(async() => {
        try { await limpiarVIPExpirados(sock); } catch(e) {}
      }, 60 * 60 * 1000);

      setInterval(async() => {
        try { await notificarVIPProximoVencer(sock); } catch(e) {}
      }, 6 * 60 * 60 * 1000);

      config = cargarConfig();
      recargarGeos();
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(`⚠️ [${instanceName}] Conexión cerrada. Código: ${code}`);
      
      if (code === DisconnectReason.restartRequired) {
        intentos = 0;
        console.log(`🔄 [${instanceName}] Reinicio requerido...`);
        iniciarBot();
        return;
      }
      
      intentos++;
      if (intentos < MAX_RECONNECT) {
        console.log(`🔄 [${instanceName}] Reintentando conexión (${intentos}/${MAX_RECONNECT})...`);
        await delay(8000);
        iniciarBot();
      }
    }
  });

  const comandos = await cargarComandos();
  if (pppModule?.initPPP) pppModule.initPPP(sock, geosDB, pppTemp);

  sock.ev.on('group-participants.update', async (update) => {
    try {
      const { id, participants, action } = update;
      const botId = sock.user?.id?.split(':')[0] || sock.user?.id;
      const botJid = `${botId}@s.whatsapp.net`;
      
      if ((action === 'add' || action === 'approve') && participants.some(p => p.includes(botId))) {
        console.log(`✅ [${instanceName}] Bot añadido al grupo: ${id}`);
        await delay(3000);
        
        try {
          await sendSafe(sock, id, { 
            text: `🤖 Hola, soy ${instanceName.toUpperCase()}.\n\n` +
                  `¿Quieres saber mis funciones?\n` +
                  `Usa \`.menu\` para ver todos mis comandos disponibles.\n\n` +
                  `⏰ *IMPORTANTE*: Tengo que recibir admin en menos de *24 horas* o sino me salgo automáticamente.`
          });
        } catch(sendError) {
          console.log(`Error enviando mensaje de bienvenida [${instanceName}]:`, sendError);
        }
        
        setTimeout(async () => {
          try {
            const groupMetadata = await sock.groupMetadata(id);
            const botParticipant = groupMetadata.participants.find(
              p => p.id === botJid || p.id.includes(botId)
            );
            
            if (!botParticipant || !botParticipant.admin) {
              await sendSafe(sock, id, { 
                text: `⏰ *TIEMPO AGOTADO* [${instanceName}]\n\n` +
                      `Han pasado 24 horas y aún no he recibido permisos de administrador.\n\n` +
                      `Me retiraré del grupo ahora. ¡Hasta pronto! 👋`
              });
              await delay(3000);
              await sock.groupLeave(id);
            }
          } catch(e) {
            console.log(`Error verificando admin [${instanceName}]:`, e);
          }
        }, 24 * 60 * 60 * 1000);
      }
    } catch(e) {
      console.error(`Error en group-participants.update [${instanceName}]:`, e);
    }
  });

  sock.ev.on('messages.upsert', async (msgUpdate) => {
    try {
      const msg = msgUpdate.messages?.[0];
      if (!msg || !msg.message || !msg.key) return;
      if (helpers.isSelfMessage(sock, msg)) return;

      const messageTimestamp = msg.messageTimestamp
        ? (typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp * 1000 : parseInt(msg.messageTimestamp) * 1000)
        : Date.now();

      if (messageTimestamp < BOT_START_TIME) return;
      if (Date.now() - messageTimestamp > MESSAGE_MAX_AGE) return;

      const from = msg.key.remoteJid;
      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const remitente = getId(msg);
      const remitenteLid = normalizeToLid(remitente);

      guardarLIDEnDB(msg);
      await eliminarMuteados(sock, [msg]);
      if (isBanned(remitente)) return;

      verificarYEliminarLink(sock, msg, sendSafe);
      verificarYEliminarEstado(sock, msg, sendSafe);

      if (pppTemp[remitenteLid] && from.endsWith('@s.whatsapp.net')) {
        if (pppModule?.guardarRespuesta) await pppModule.guardarRespuesta(sock, remitenteLid, texto, pppTemp);
        return;
      }

      if (!texto.startsWith('.')) return;
      const [cmd, ...args] = texto.slice(1).trim().split(/ +/);

      const ahora = Date.now();
      const ultimo = ultimoComandoPorUsuario.get(remitenteLid) || 0;
      if (ahora - ultimo < ANTIBAN_CONFIG.COOLDOWN_USUARIO) return;
      ultimoComandoPorUsuario.set(remitenteLid, ahora);

      if (cmd === 'apagar' && isOwner(remitenteLid)) {
        if (args[0] === 'owners' || args[0] === 'propietarios') {
          config.onlyOwners = true; guardarConfig(config);
          return await sendSafe(sock, from, { text: '🔒 Modo Solo Owners ACTIVADO' });
        }
      }
      if (cmd === 'prender' && isOwner(remitenteLid)) {
        if (args[0] === 'owners' || args[0] === 'propietarios') {
          config.onlyOwners = false; guardarConfig(config);
          return await sendSafe(sock, from, { text: '🔓 Modo Solo Owners DESACTIVADO' });
        }
      }
      if (config.onlyOwners && !isOwner(remitenteLid)) return;

      if (!comandosDB[remitenteLid]) comandosDB[remitenteLid] = { total: 0 };
      comandosDB[remitenteLid].total += 1;
      guardarComandos();

      if (!spamCounter[remitenteLid]) spamCounter[remitenteLid] = {};
      if (!spamCounter[remitenteLid][cmd]) spamCounter[remitenteLid][cmd] = { count: 0, timer: null };
      spamCounter[remitenteLid][cmd].count++;
      if (!spamCounter[remitenteLid][cmd].timer) {
        spamCounter[remitenteLid][cmd].timer = setTimeout(() => {
          spamCounter[remitenteLid][cmd].count = 0;
          spamCounter[remitenteLid][cmd].timer = null;
        }, INTERVALO_MS);
      }
      if (spamCounter[remitenteLid][cmd].count >= LIMITE_COMANDOS) return;

      if (cmd === 'vip' || cmd === 'comprarvip') {
        await handleVipPurchase(sock, from, remitenteLid, args);
        return;
      }
      if (cmd === 'estatusvip') {
        await handleVipStatus(sock, from, remitenteLid);
        return;
      }
      if (cmd === 'vervip' && isOwner(remitenteLid)) {
        await handleVerVip(sock, from, remitenteLid);
        return;
      }
      if (cmd === 'debuggeos') {
        await handleGeosDebug(sock, from, remitenteLid);
        return;
      }

      if (cmd === 'añadirbot' || cmd === 'anadirbot') {
        const inviteLink = args[0];
        if (!inviteLink) {
          return await sendSafe(sock, from, { text: '❌ Uso: .añadirbot <url>' });
        }
        
        let inviteCode = inviteLink.split('/').pop();
        if (inviteCode.includes('?')) {
          inviteCode = inviteCode.split('?')[0];
        }
        
        try {
          const groupInfo = await sock.groupGetInviteInfo(inviteCode);
          const groupName = groupInfo.subject || 'el grupo';
          
          try {
            const response = await sock.groupAcceptInvite(inviteCode);
            const groupJid = response;
            
            console.log(`✅ [${instanceName}] Bot unido al grupo: ${groupJid}`);
            await delay(2000);
            
            try {
              await sendSafe(sock, groupJid, { 
                text: `🤖 Hola, soy ${instanceName.toUpperCase()}.\n\n` +
                      `¿Quieres saber mis funciones?\n` +
                      `Usa \`.menu\` para ver todos mis comandos disponibles.\n\n` +
                      `⏰ *IMPORTANTE*: Tengo que recibir admin en menos de *24 horas* o sino me salgo automáticamente.`
              });
            } catch(msgError) {}
            
            await sendSafe(sock, from, { 
              text: `✅ Bot unido al grupo *${groupName}* exitosamente.\n\n⏰ Recuerda: el bot debe recibir admin en 24 horas.` 
            });
            
          } catch (joinError) {
            try {
              await sock.groupAcceptInviteV4(inviteCode);
              await sendSafe(sock, from, { 
                text: `📨 *SOLICITUD ENVIADA*\n\n` +
                      `Se ha enviado la solicitud para unirse al grupo *${groupName}*.\n\n` +
                      `⏳ Esperando aprobación de los administradores.`
              });
            } catch (requestError) {
              await sendSafe(sock, from, { 
                text: `❌ No se pudo enviar la solicitud al grupo *${groupName}*.\n\nVerifica que el enlace sea válido.`
              });
            }
          }
          
        } catch (e) {
          await sendSafe(sock, from, { 
            text: '❌ Error al procesar el enlace. Verifica que sea válido.' 
          });
        }
        return;
      }

      const comando = comandos.get(cmd.toLowerCase());
      if (!comando) return;

      if (comando.isVIP) {
        const requiredLevel = comando.requiredLevel || 1;
        if (!(await ensureVIPAccess(sock, from, remitenteLid, requiredLevel))) return;
      }

      try {
        await comando.run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers, { guardarGeos, guardarDrops, sendSafe });
        try { guardarGeos(); guardarDrops(); } catch(e){}
        if (cmd === 'formatear') { recargarGeos(); }
      } catch (e) {
        console.error(`Error ejecutando [${instanceName}]:`, e);
        await sendSafe(sock, from, { text: '❌ Error.' });
      }
    } catch (e) {
      console.error(`Error handler [${instanceName}]:`, e);
    }
  });
}

async function limpiarSesionEnLogoutReal() {
  console.log(`🔌 [${instanceName}] Limpiando sesión...`);
  const elementos = [sessionFolder, sessionBackupPath];
  for (const elemento of elementos) {
    try {
      if (fs.existsSync(elemento)) {
        if (elemento === sessionFolder) {
          fs.rmSync(elemento, { recursive: true, force: true });
        } else {
          fs.unlinkSync(elemento);
        }
      }
    } catch(error) {}
  }
}

async function shutdownBotClean() {
  console.log(`🛑 [${instanceName}] Apagando...`);
  isManualShutdown = true;
  if (sock?.ws) {
    try {
      sock.ev.removeAllListeners();
      await sock.end(undefined);
      await delay(500);
    } catch(e) {}
  }
  console.log(`✅ [${instanceName}] Bot apagado.`);
}

process.on('SIGINT', async () => {
  await shutdownBotClean();
  setTimeout(() => { process.exit(0); }, 1000);
});

process.on('SIGTERM', async () => {
  await shutdownBotClean();
  setTimeout(() => { process.exit(0); }, 1000);
});

console.log(`🚀 [${instanceName}] Iniciando bot...`);
console.log(`✨ [${instanceName}] Sistema VIP integrado`);
console.log(`🛡️ [${instanceName}] Sistema Antilink integrado`);
console.log(`🚫 [${instanceName}] Sistema Anti-Estados integrado`);
console.log(`📱 [${instanceName}] Sistema QR por imagen activado`);
iniciarBot();
