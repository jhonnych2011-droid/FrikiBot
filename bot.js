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

// ✅✅✅ NUEVO: IMPORTAR SISTEMA DE GRUPOS SILENCIADOS ✅✅✅
import { shouldRespondInGroup } from './checkMuted.js';

// ✅✅✅ NUEVO: IMPORTAR SISTEMA DE BIENVENIDA Y DESPEDIDA ✅✅✅
import { sendWelcomeMessage, sendFarewellMessage } from './comandos/bienvenida.js';

// ==========================
// SISTEMA DE SUB-BOTS
// ==========================
function resolveSessionFolder() {
  const args = process.argv.slice(2);
  const instanceFlagIndex = args.indexOf('--instance');
  
  if (instanceFlagIndex !== -1) {
    const value = args[instanceFlagIndex + 1];
    const instanceNumber = Number.parseInt(value, 10);
    
    // Verificar si hay flag de pairing
    const pairingMode = args.includes('--pairing') || args.includes('--pair');
    
    if (pairingMode) {
      console.log(`🔢 [SESSION${instanceNumber}] Modo Pairing Code activado`);
      // Crear archivo de flag para pairing
      fs.writeFileSync(`./pairing_mode_${instanceNumber}.flag`, 'true');
    }
    
    if (instanceNumber === 1) return './session1';
    if (instanceNumber === 2) return './session2';
    if (instanceNumber === 3) return './session3';
    if (instanceNumber === 4) return './session4';
    if (instanceNumber === 5) return './session5';
    if (instanceNumber === 6) return './session6';
    if (instanceNumber === 7) return './session7';
    if (instanceNumber === 8) return './session8';
    if (instanceNumber === 9) return './session9';
    if (instanceNumber === 10) return './session10';
  }
  
  return './session';
}

const sessionFolder = resolveSessionFolder();
const instanceName = path.basename(sessionFolder);

// ✅✅✅ NUEVO: DETECTAR NÚMERO DE SESIÓN PARA VERIFICACIÓN ✅✅✅
let sessionNumber = null;
const args = process.argv.slice(2);
const instanceFlagIndex = args.indexOf('--instance');
if (instanceFlagIndex !== -1 && args[instanceFlagIndex + 1]) {
  sessionNumber = args[instanceFlagIndex + 1];
  console.log(`🔢 [${instanceName}] Número de sesión detectado: ${sessionNumber}`);
}

// 🔢 DETECTAR SI ESTAMOS EN MODO PAIRING 🔢
let isPairingMode = args.includes('--pairing') || args.includes('--pair') || fs.existsSync(`./pairing_mode_${sessionNumber || '1'}.flag`);
if (isPairingMode) {
  console.log(`🔢 [${instanceName}] INICIANDO EN MODO PAIRING CODE`);
}

if (!fs.existsSync(sessionFolder)) {
  fs.mkdirSync(sessionFolder, { recursive: true });
}

console.log(`🤖 Iniciando bot: ${instanceName.toUpperCase()}`);
console.log(`📁 Carpeta de sesión: ${sessionFolder}`);
console.log(`🔢 Modo Pairing: ${isPairingMode ? '✅ ACTIVADO' : '❌ DESACTIVADO'}`);

// ==========================
// ESTADO GLOBAL DE CONEXIÓN
// ==========================
let BOT_READY = false;
let isConnecting = false;
let SOCKET_INSTANCE = null;
let HEALTH_CHECK_INTERVAL = null;

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
// ⏱️ SISTEMA DE HEALTH CHECK SIMPLIFICADO
// ==========================
function startHealthCheck(sock) {
  if (HEALTH_CHECK_INTERVAL) {
    clearInterval(HEALTH_CHECK_INTERVAL);
  }
  
  HEALTH_CHECK_INTERVAL = setInterval(async () => {
    try {
      if (!sock || !sock.user) {
        console.log(`⏱️ [${instanceName}] Health Check: Socket o usuario no disponible`);
        BOT_READY = false;
        return;
      }
      
      // Verificación simplificada: si puede enviar presencia, está vivo
      try {
        await sock.sendPresenceUpdate('available', sock.user.id);
        if (!BOT_READY) {
          console.log(`✅ [${instanceName}] Health Check: Bot recuperado`);
          BOT_READY = true;
        }
      } catch (error) {
        console.log(`⚠️ [${instanceName}] Health Check: Conexión perdida - ${error.message}`);
        BOT_READY = false;
        
        // Intentar reconexión si no estamos ya reconectando
        if (!isConnecting) {
          console.log(`🔄 [${instanceName}] Health Check: Iniciando reconexión...`);
          setTimeout(() => iniciarBot(), 5000);
        }
      }
      
    } catch (error) {
      console.log(`❌ [${instanceName}] Error en Health Check:`, error.message);
    }
  }, 30000); // Cada 30 segundos
}

function stopHealthCheck() {
  if (HEALTH_CHECK_INTERVAL) {
    clearInterval(HEALTH_CHECK_INTERVAL);
    HEALTH_CHECK_INTERVAL = null;
  }
}

// ==========================
// VERIFICACIÓN SIMPLIFICADA - POR FUNCIONALIDAD
// ==========================
function isSocketReady(sock = null) {
  const targetSock = sock || SOCKET_INSTANCE;
  
  if (!targetSock) {
    console.log(`❌ [${instanceName}] isSocketReady: No hay socket`);
    return false;
  }
  
  // Verificaciones básicas
  if (!targetSock.user) {
    console.log(`❌ [${instanceName}] isSocketReady: Usuario no autenticado`);
    return false;
  }
  
  if (!BOT_READY) {
    console.log(`❌ [${instanceName}] isSocketReady: Bot no está listo`);
    return false;
  }
  
  // ✅✅ VERIFICACIÓN POR FUNCIONALIDAD ✅✅
  // Si tiene las funciones básicas, asumimos que funciona
  if (targetSock.sendMessage && targetSock.sendPresenceUpdate) {
    return true;
  }
  
  console.log(`❌ [${instanceName}] isSocketReady: Falta funcionalidad básica`);
  return false;
}

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
// sendSafe - VERSIÓN SIMPLE
// ==========================
let sendQueue = Promise.resolve();
let pausado = false;

export async function sendSafe(sock, jid, contenido, opciones = {}) {
  return new Promise(async (resolve) => {
    sendQueue = sendQueue.then(async () => {
      try {
        // Usar socket pasado o instancia global
        const currentSock = sock || SOCKET_INSTANCE;
        
        // Verificación rápida
        if (!currentSock) {
          console.log(`❌ [${instanceName}] sendSafe: No hay socket`);
          resolve(null);
          return;
        }
        
        // Verificar si el socket está realmente listo
        if (!isSocketReady(currentSock)) {
          console.log(`⚠️ [${instanceName}] sendSafe: Socket no está listo`);
          resolve(null);
          return;
        }
        
        // Sistema anti-ban
        while (pausado) {
          await delay(1000);
        }

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

        // Simular escritura
        try {
          const typingTime = randomDelay(ANTIBAN_CONFIG.MIN_TYPING, ANTIBAN_CONFIG.MAX_TYPING);
          await simularEscritura(currentSock, jid, typingTime);
        } catch {}
        
        // Enviar mensaje
        console.log(`📤 [${instanceName}] Enviando mensaje a ${jid}`);
        await currentSock.sendMessage(jid, contenido, opciones);
        
        // Actualizar contadores
        mensajesEnviados++;
        
        // Delay anti-ban
        await delay(randomDelay(ANTIBAN_CONFIG.MIN_DELAY, ANTIBAN_CONFIG.MAX_DELAY));
        
        console.log(`✅ [${instanceName}] Mensaje enviado exitosamente`);
        resolve(true);
        
      } catch (err) {
        console.log(`❌ [${instanceName}] Error enviando mensaje:`, err.message);
        
        // Si es error de conexión, actualizar estado
        if (err.message.includes('WebSocket') || err.message.includes('Connection') || err.message.includes('socket')) {
          BOT_READY = false;
          console.log(`🔌 [${instanceName}] Error de conexión, marcando bot como no listo`);
        }
        
        await delay(3000);
        resolve(null);
      }
    });
  });
}

// FUNCIÓN SEGURA PARA OPERACIONES DE GRUPO
async function safeGroupOperation(sock, operation, fallback = null) {
  try {
    if (!isSocketReady(sock)) {
      console.log(`⚠️ [${instanceName}] Socket no disponible para operación`);
      return fallback;
    }
    return await operation();
  } catch(error) {
    console.log(`⚠️ [${instanceName}] Error en operación:`, error.message);
    return fallback;
  }
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
  if (!isSocketReady(sock)) return null;
  
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
    console.log(`💸 [${instanceName}] Total de geos eliminados: ${geosQuitados}`);

    try {
      const alertaData = fs.existsSync('./alerta.json')
        ? JSON.parse(fs.readFileSync('./alerta.json','utf8'))
        : { grupoAlerta: null };
      
      if (alertaData.grupoAlerta) {
        const mensaje = `📣 *IMPUESTO SEMANAL APLICADO* [${instanceName}]\n\n` +
                       `👤 Usuarios afectados: ${usuariosAfectados}\n` +
                       `💸 Geos totales quitados: ${geosQuitados}\n` +
                       `📊 Porcentaje: ${impuestoConfig.porcentaje}%\n` +
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
    if (isSocketReady(sock))
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
// SISTEMA VIP
// ===================================================================================
const VIP_COST = 62000;
const VIP_DURATION_MS = 24 * 60 * 60 * 1000;
const RENEWAL_TO_DIAMANTE = 5;

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
  if (!isSocketReady(sock)) return { expirados: 0, notificados: 0 };
  
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
                  `🔢 Compras realizadas: ${userData.purchases || 0}\n\n` +
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
  if (!isSocketReady(sock)) return;
  
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
      console.log(`🔍 [${instanceName}] LID guardado: ${senderLid} → ${senderName}`);
    }
  } catch(e) {}
}

async function handleVipPurchase(sock, from, remitente, args = []) {
  const confirmar = args[0]?.toLowerCase();
  if (confirmar && confirmar !== 'confirmar' && confirmar !== 'si') return sendSafe(sock, from, { text: 'Envía `.vip confirmar` para proceder con la compra.' });
  const userLid = normalizeToLid(remitente);
  if (!userLid) return sendSafe(sock, from, { text: '❌ No se pudo identificar tu usuario.' });
  const geosActuales = getGeosFromUser(userLid);
  if (geosActuales < VIP_COST) return sendSafe(sock, from, { text: `❌ Necesitas ${VIP_COST} GEOS. Actualmente tienes ${geosActuales} GEOS.` });
  const restaExitosa = subtractGeosFromUser(userLid, VIP_COST);
  if (!restaExitosa) return sendSafe(sock, from, { text: '❌ Error al procesar el pago.' });
  const nuevoSaldo = geosActuales - VIP_COST;
  const now = Date.now();
  try {
    const vipDB = JSON.parse(fs.readFileSync('./vip.json', 'utf-8'));
    const currentData = vipDB[userLid] || { vipUntil: 0, level: 0, purchases: 0 };
    const baseTime = (currentData.vipUntil > now) ? currentData.vipUntil : now;
    const newExpiry = baseTime + VIP_DURATION_MS;
    currentData.purchases = (currentData.purchases || 0) + 1;
    let newLevel = currentData.purchases >= RENEWAL_TO_DIAMANTE ? 2 : 1;
    vipDB[userLid] = { vipUntil: newExpiry, level: newLevel, purchases: currentData.purchases, alertaEnviada: false, purchasedAt: now };
    fs.writeFileSync('./vip.json', JSON.stringify(vipDB, null, 2));
    const nivelMensaje = newLevel === 2 ? '💎 *NIVEL DIAMANTE*' : '🏆 *NIVEL ORO*';
    const nivelUpgrade = (newLevel === 2 && currentData.purchases === RENEWAL_TO_DIAMANTE) ? '\n\n🎉 ¡FELICIDADES! Has alcanzado Nivel Diamante por lealtad.' : '';
    return sendSafe(sock, from, { text: `✅ *COMPRA VIP EXITOSA*\n\n${nivelMensaje}\nCosto: ${VIP_COST} GEOS\nExpiración: ${new Date(newExpiry).toLocaleString()}\n\nTe quedan ${nuevoSaldo} GEOS.${nivelUpgrade}\n\nUsa .estatusvip para verificar tu tiempo.` });
  } catch(e) { return sendSafe(sock, from, { text: '❌ Error al procesar la compra VIP.' }); }
}

async function handleVipStatus(sock, from, remitente) {
  const status = await checkVIPStatus(remitente);
  if (status.isVIP && status.expiry) {
    const remainingTime = formatRemainingTime(status.expiry);
    const nextLevelInfo = status.level === 1 ? `\nTe faltan ${5 - (status.purchases || 0)} compras para Nivel Diamante.` : '\n¡Eres Nivel Diamante! Máximo acceso.';
    await sendSafe(sock, from, { text: `✨ *ESTADO VIP*\n\nNivel: ${status.level}\nRestante: ${remainingTime}\nCompras totales: ${status.purchases || 0}${nextLevelInfo}\n\nExpira: ${status.expiry.toLocaleString()}` });
  } else { await sendSafe(sock, from, { text: `😔 No eres VIP. Usa .vip para comprar acceso por ${VIP_COST} GEOS.` }); }
}

async function handleVerVip(sock, from, remitente) {
  if (!isOwner(remitente)) return;
  let vipDB;
  try { vipDB = JSON.parse(fs.readFileSync('./vip.json', 'utf-8')); } catch(e) { return sendSafe(sock, from, { text: '❌ Error cargando base de datos VIP.' }); }
  let mensaje = '📊 *BASE DE DATOS VIP*\n\n', activos = 0, expirados = 0;
  const now = Date.now();
  for (const [userLid, datos] of Object.entries(vipDB)) {
    const activo = datos.vipUntil && now < datos.vipUntil;
    activo ? activos++ : expirados++;
    const expira = datos.vipUntil ? new Date(datos.vipUntil).toLocaleString() : 'Nunca';
    mensaje += `${activo ? '✅' : '❌'} ${userLid}\n   Nivel: ${datos.level || 1}\n   Expira: ${expira}\n   Compras: ${datos.purchases || 0}\n\n`;
  }
  mensaje += `\n📊 Estadísticas:\n✅ Activos: ${activos}\n❌ Expirados: ${expirados}\n📈 Total: ${Object.keys(vipDB).length}`;
  await sendSafe(sock, from, { text: mensaje });
}

const sessionBackupPath = `${sessionFolder}_backup.json`;
async function backupSession(creds) { 
  try { 
    fs.writeFileSync(sessionBackupPath, JSON.stringify({ 
      timestamp: Date.now(), 
      creds: creds 
    }, null, 2)); 
    console.log(`✅ [${instanceName}] Backup de sesión creado`); 
  } catch(e) {} 
}

function verificarIntegridadSesion() {
  if (!fs.existsSync(sessionFolder)) return { ok: true, mensaje: 'No existe carpeta de sesión, se creará nueva' };
  const archivosCriticos = ['creds.json'], archivosFaltantes = [], archivosCorruptos = [];
  for (const archivo of archivosCriticos) {
    const rutaArchivo = path.join(sessionFolder, archivo);
    if (!fs.existsSync(rutaArchivo)) { archivosFaltantes.push(archivo); continue; }
    try { JSON.parse(fs.readFileSync(rutaArchivo, 'utf-8')); } catch(e) { archivosCorruptos.push(archivo); }
  }
  if (archivosFaltantes.length > 0 || archivosCorruptos.length > 0) return { ok: false, mensaje: 'Sesión dañada o incompleta', archivosFaltantes, archivosCorruptos };
  return { ok: true, mensaje: 'Sesión en buen estado' };
}

// ============================================
// SISTEMA DE AUTO-INICIO DE SUB-BOTS
// ============================================
async function autoStartSubBots() {
  if (instanceName !== 'session') {
    console.log(`[${instanceName}] Sub-bot iniciado, no ejecuta auto-inicio.`);
    return;
  }

  try {
    const autostartPath = './autostart_subbots.json';
    if (!fs.existsSync(autostartPath)) {
      console.log('📋 No hay configuración de auto-inicio.');
      return;
    }

    const config = JSON.parse(fs.readFileSync(autostartPath, 'utf8'));
    
    if (!config.enabled) {
      console.log('⚠️ Auto-inicio desactivado.');
      return;
    }

    if (!config.sessions || config.sessions.length === 0) {
      console.log('📋 No hay sesiones configuradas para auto-inicio.');
      return;
    }

    console.log(`🚀 Auto-iniciando ${config.sessions.length} sub-bot(s)...`);

    const { exec } = await import('child_process');

    for (const sessionNum of config.sessions) {
      const sessionFolder = `./session${sessionNum}`;
      
      if (!fs.existsSync(sessionFolder)) {
        console.log(`⚠️ Session${sessionNum} no existe, saltando...`);
        continue;
      }

      try {
        console.log(`🔄 Iniciando session${sessionNum}...`);
        
        const proceso = exec(`node bot.js --instance ${sessionNum}`, (error) => {
          if (error) {
            console.error(`❌ Error en session${sessionNum}:`, error.message);
          }
        });

        proceso.stdout.on('data', (data) => {
          console.log(`[SESSION${sessionNum}] ${data}`);
        });

        proceso.stderr.on('data', (data) => {
          console.error(`[SESSION${sessionNum}] ${data}`);
        });

        console.log(`✅ Session${sessionNum} iniciada (PID: ${proceso.pid})`);
        
        await delay(3000);
        
      } catch (e) {
        console.error(`Error iniciando session${sessionNum}:`, e.message);
      }
    }

    console.log(`✅ Auto-inicio completado.`);
  } catch (e) {
    console.error('Error en auto-inicio:', e.message);
  }
}
// ============================================
// ✅ INICIAR BOT CON VERIFICACIÓN SIMPLIFICADA
// ============================================
let sock, intentos = 0;
const MAX_RECONNECT = 5;
let isReconnecting = false;

async function iniciarBot() {
  if (isReconnecting) {
    console.log(`⏳ [${instanceName}] Ya hay una reconexión en proceso...`);
    return;
  }

  if (intentos >= MAX_RECONNECT) {
    console.log(`❌ [${instanceName}] Límite de reconexiones alcanzado.`);
    return;
  }

  isReconnecting = true;
  BOT_READY = false;
  SOCKET_INSTANCE = null;
  
  stopHealthCheck();

  try {
    console.log(`🔍 [${instanceName}] Verificando integridad de sesión...`);
    const integridad = verificarIntegridadSesion();
    console.log(`📋 [${instanceName}] ${integridad.mensaje}`);
    
    if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

    const socketConfig = {
      printQRInTerminal: false,
      logger: P({ level: 'silent' }),
      auth: state,
      shouldIgnoreJid: () => false,
      markOnlineOnConnect: true,
      syncFullHistory: false,
      browser: [`${instanceName.toUpperCase()}`, 'Chrome', '1.0.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: true,
      getMessage: async (key) => { return { conversation: '' } },
      generateHighQualityLinkPreview: true,
      linkPreviewImageThumbnailWidth: 192,
      mobile: isPairingMode ? false : undefined,
      patchMessageBeforeSending: (message) => { return message; }
    };
    
    sock = makeWASocket(socketConfig);
    SOCKET_INSTANCE = sock;
    
    sock.getId = msg => getId(msg);
    sock.editarMensaje = (jid, key, texto) => editarMensaje(sock, jid, key, texto);
    
    sock.ev.on('creds.update', async (creds) => { 
      await saveCreds(); 
      try { await backupSession(creds); } catch(e) {} 
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, pairingCode } = update;

      if (pairingCode) {
        console.log(`🔢 [${instanceName}] Pairing Code generado: ${pairingCode}`);
        const pairingData = { code: pairingCode, instance: sessionNumber || instanceName.replace('session', '') || '1', timestamp: Date.now(), expires: Date.now() + (10 * 60 * 1000), status: 'waiting', from: 'whatsapp_pairing_system', sessionFolder: sessionFolder };
        fs.writeFileSync(`./pairing_session${sessionNumber || '1'}.json`, JSON.stringify(pairingData, null, 2));
        fs.writeFileSync(`./pairing_code_${sessionNumber || '1'}.txt`, pairingCode);
        console.log(`📝 [${instanceName}] Pairing code guardado en archivo`);
        console.log(`\n──────────────────────────────────────────────────────────\n`);
        console.log(`🔢 [${instanceName}] PAIRING CODE PARA VINCULAR:`);
        console.log(`🔢 CÓDIGO: ${pairingCode}`);
        if (pairingCode.length === 8) { console.log(`📝 FORMATO: ${pairingCode.slice(0,4)}-${pairingCode.slice(4)}`); }
        console.log(`\n⚠️  Válido por 10 minutos`);
        console.log(`📁 Sesión: ${sessionFolder}`);
        console.log(`\n──────────────────────────────────────────────────────────\n`);
      }

      if (qr) {
        try {
          console.log(`🔢 [${instanceName}] Generando QR...`);
          if (instanceName === 'session') {
            console.log(`\n🔢 [${instanceName}] ESCANEA ESTE QR EN LA TERMINAL:\n`);
            const qrcodeTerminal = await import('qrcode-terminal');
            qrcodeTerminal.default.generate(qr, { small: true });
            console.log(`\n🔢 [${instanceName}] Escanea el QR arriba para conectar\n`);
          } else {
            const qrImage = await QRCode.toDataURL(qr);
            const qrBuffer = Buffer.from(qrImage.split(',')[1], 'base64');
            const qrImagePath = `./qr_${instanceName}.png`;
            fs.writeFileSync(qrImagePath, qrBuffer);
            console.log(`🖼️ [${instanceName}] QR guardado como: ${qrImagePath}`);
          }
        } catch(e) { console.error(`Error generando QR [${instanceName}]:`, e.message); }
      }

      if (connection === 'open') {
        console.log(`✅ [${instanceName}] Conexión establecida`);
        
        try {
          if (fs.existsSync(`./pairing_session${sessionNumber || '1'}.json`)) { fs.unlinkSync(`./pairing_session${sessionNumber || '1'}.json`); }
          if (fs.existsSync(`./pairing_code_${sessionNumber || '1'}.txt`)) { fs.unlinkSync(`./pairing_code_${sessionNumber || '1'}.txt`); }
          if (fs.existsSync(`./pairing_mode_${sessionNumber || '1'}.flag`)) { fs.unlinkSync(`./pairing_mode_${sessionNumber || '1'}.flag`); }
        } catch(e) { console.log(`⚠️ [${instanceName}] Error limpiando archivos de pairing:`, e.message); }
        
        await delay(2000);
        
        if (sock.user) {
          BOT_READY = true;
          isReconnecting = false;
          intentos = 0;
          SOCKET_INSTANCE = sock;
          
          console.log(`🎉 [${instanceName}] ¡Bot listo!`);
          console.log(`👤 Usuario: ${sock.user.id}`);
          console.log(`✅ Conexión verificada por usuario autenticado`);
          
          startHealthCheck(sock);
          
          try {
            if (instanceName !== 'session') {
              const qrImagePath = `./qr_${instanceName}.png`;
              if (fs.existsSync(qrImagePath)) { fs.unlinkSync(qrImagePath); console.log(`🧹 [${instanceName}] Archivo QR temporal eliminado`); }
            }
          } catch(e) {}
          
          setInterval(async() => { try { await limpiarVIPExpirados(sock); } catch(e) {} }, 60 * 60 * 1000);
          setInterval(async() => { try { await notificarVIPProximoVencer(sock); } catch(e) {} }, 6 * 60 * 60 * 1000);
          
          mensajesEnviados = 0; ultimoResetContador = Date.now(); mensajesPorGrupo.clear(); ultimoComandoPorUsuario.clear();
          config = cargarConfig(); recargarGeos();
          
        } else {
          console.log(`❌ [${instanceName}] Usuario no disponible después de conexión`);
          BOT_READY = false;
          console.log(`🔄 [${instanceName}] Intentando reconexión en 5 segundos...`);
          setTimeout(() => iniciarBot(), 5000);
        }
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log(`⚠️ [${instanceName}] Conexión cerrada. Código: ${code}`);
        stopHealthCheck();
        isReconnecting = false;
        BOT_READY = false;
        SOCKET_INSTANCE = null;

        if (code === DisconnectReason.loggedOut) {
          console.log(`🚫 [${instanceName}] Sesión cerrada. Se requiere nuevo escaneo QR.`);
          try { if (fs.existsSync(sessionFolder)) { fs.rmSync(sessionFolder, { recursive: true, force: true }); console.log(`🧹 [${instanceName}] Sesión limpiada.`); } } catch(e) {}
          intentos = 0;
          await delay(5000);
          iniciarBot();
          return;
        }

        if (code === DisconnectReason.restartRequired) { intentos = 0; console.log(`🔄 [${instanceName}] Reinicio requerido...`); await delay(3000); iniciarBot(); return; }

        if (code === DisconnectReason.connectionClosed || code === DisconnectReason.connectionLost || code === 428) {
          intentos++;
          if (intentos < MAX_RECONNECT) { 
            const delayTime = Math.min(5000 * intentos, 30000);
            console.log(`🔄 [${instanceName}] Reintentando en ${delayTime/1000}s (${intentos}/${MAX_RECONNECT})...`); 
            await delay(delayTime); 
            iniciarBot(); 
          } else {
            console.log(`❌ [${instanceName}] Máximo de reintentos alcanzado.`);
            try { if (fs.existsSync(sessionFolder)) { fs.rmSync(sessionFolder, { recursive: true, force: true }); } } catch(e) {}
          }
        }
      }
      
      if (connection === 'connecting') {
        console.log(`🔄 [${instanceName}] Conectando...`);
        isConnecting = true;
        BOT_READY = false;
      }
    });

    const comandos = await cargarComandos();
    if (pppModule?.initPPP) pppModule.initPPP(sock, geosDB, pppTemp);

    // ✅✅✅ EVENTO DE PARTICIPANTES CON BIENVENIDA Y DESPEDIDA ✅✅✅
    sock.ev.on('group-participants.update', async (update) => {
      try {
        if (!BOT_READY || !sock || !sock.user) return;
        
        const { id, participants, action } = update;
        const botId = sock.user?.id?.split(':')[0] || sock.user?.id;
        const botJid = `${botId}@s.whatsapp.net`;
        const participantIds = participants.map(p => { 
          if (typeof p === 'string') return p; 
          if (p && p.id) return p.id; 
          return String(p); 
        });
        
        // ✅✅✅ BIENVENIDA AUTOMÁTICA ✅✅✅
        if (action === 'add' || action === 'approve') {
          for (const participantJid of participantIds) {
            if (!participantJid.includes(botId)) {
              console.log(`👋 [${instanceName}] Nuevo miembro detectado: ${participantJid} en ${id}`);
              await delay(2000);
              await sendWelcomeMessage(sock, id, participantJid, sendSafe);
            }
          }
        }
        
        // ✅✅✅ DESPEDIDA AUTOMÁTICA ✅✅✅
        if (action === 'remove') {
          for (const participantJid of participantIds) {
            if (!participantJid.includes(botId)) {
              console.log(`👋 [${instanceName}] Miembro salió: ${participantJid} de ${id}`);
              await delay(2000);
              await sendFarewellMessage(sock, id, participantJid, sendSafe);
            }
          }
        }
        
        // Código existente para cuando el BOT se une a un grupo
        if ((action === 'add' || action === 'approve') && participantIds.some(p => p.includes(botId))) {
          console.log(`✅ [${instanceName}] Bot añadido al grupo: ${id}`);
          await delay(3000);
          
          await safeGroupOperation(sock, async () => {
            await sendSafe(sock, id, { 
              text: `🤖 Hola, soy ${instanceName.toUpperCase()}.\n\n¿Quieres saber mis funciones?\nUsa \`.menu\` para ver todos mis comandos disponibles.\n\n⏱️ *IMPORTANTE*: Tengo que recibir admin en menos de *24 horas* o sino me salgo automáticamente.` 
            });
          });
          
          setTimeout(async () => {
            await safeGroupOperation(sock, async () => {
              const groupMetadata = await sock.groupMetadata(id);
              const botParticipant = groupMetadata.participants.find(p => p.id === botJid || p.id.includes(botId));
              
              if (!botParticipant || !botParticipant.admin) {
                await sendSafe(sock, id, { 
                  text: `⏱️ *TIEMPO AGOTADO* [${instanceName}]\n\nHan pasado 24 horas y aún no he recibido permisos de administrador.\n\nMe retiraré del grupo ahora. ¡Hasta pronto! 👋` 
                });
                await delay(3000); 
                await sock.groupLeave(id);
              }
            });
          }, 24 * 60 * 60 * 1000);
        }
      } catch(e) { console.error(`Error en group-participants.update [${instanceName}]:`, e); }
    });

    sock.ev.on('messages.upsert', async (msgUpdate) => {
      try {
        if (!BOT_READY || !sock || !sock.user) {
          console.log(`⏳ [${instanceName}] Bot no está listo, ignorando mensaje`);
          return;
        }
        
        const msg = msgUpdate.messages?.[0];
        if (!msg || !msg.message || !msg.key) return;
        if (helpers.isSelfMessage(sock, msg)) return;
        
        const messageTimestamp = msg.messageTimestamp ? (typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp * 1000 : parseInt(msg.messageTimestamp) * 1000) : Date.now();
        if (messageTimestamp < BOT_START_TIME || Date.now() - messageTimestamp > MESSAGE_MAX_AGE) return;
        
        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        
        if (sessionNumber && isGroup) {
          if (!shouldRespondInGroup(sessionNumber, from)) {
            console.log(`🔇 [${instanceName}] Grupo ${from} silenciado. No respondo.`);
            return;
          }
        }
        
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
        
        if (cmd === 'apagar' && isOwner(remitenteLid) && (args[0] === 'owners' || args[0] === 'propietarios')) { config.onlyOwners = true; guardarConfig(config); return await sendSafe(sock, from, { text: '🔒 Modo Solo Owners ACTIVADO' }); }
        if (cmd === 'prender' && isOwner(remitenteLid) && (args[0] === 'owners' || args[0] === 'propietarios')) { config.onlyOwners = false; guardarConfig(config); return await sendSafe(sock, from, { text: '🔓 Modo Solo Owners DESACTIVADO' }); }
        if (config.onlyOwners && !isOwner(remitenteLid)) return;
        
        if (!comandosDB[remitenteLid]) comandosDB[remitenteLid] = { total: 0 };
        comandosDB[remitenteLid].total += 1;
        guardarComandos();
        
        if (!spamCounter[remitenteLid]) spamCounter[remitenteLid] = {};
        if (!spamCounter[remitenteLid][cmd]) spamCounter[remitenteLid][cmd] = { count: 0, timer: null };
        spamCounter[remitenteLid][cmd].count++;
        if (!spamCounter[remitenteLid][cmd].timer) { spamCounter[remitenteLid][cmd].timer = setTimeout(() => { spamCounter[remitenteLid][cmd].count = 0; spamCounter[remitenteLid][cmd].timer = null; }, INTERVALO_MS); }
        if (spamCounter[remitenteLid][cmd].count >= LIMITE_COMANDOS) return;
        
        if (cmd === 'vip' || cmd === 'comprarvip') { await handleVipPurchase(sock, from, remitenteLid, args); return; }
        if (cmd === 'estatusvip') { await handleVipStatus(sock, from, remitenteLid); return; }
        if (cmd === 'vervip' && isOwner(remitenteLid)) { await handleVerVip(sock, from, remitenteLid); return; }
        
        if (cmd === 'añadirbot' || cmd === 'anadirbot') {
          const inviteLink = args[0];
          if (!inviteLink) return await sendSafe(sock, from, { text: '❌ Uso: .añadirbot <url>' });
          let inviteCode = inviteLink.split('/').pop();
          if (inviteCode.includes('?')) inviteCode = inviteCode.split('?')[0];
          
          try {
            const groupInfo = await safeGroupOperation(sock, async () => await sock.groupGetInviteInfo(inviteCode), null);
            if (!groupInfo) return await sendSafe(sock, from, { text: '❌ No se pudo obtener información del grupo. La conexión puede estar inestable.' });
            const groupName = groupInfo.subject || 'el grupo';
            
            try {
              const response = await safeGroupOperation(sock, async () => await sock.groupAcceptInvite(inviteCode), null);
              if (!response) return await sendSafe(sock, from, { text: '❌ No se pudo unir al grupo. Conexión perdida.' });
              const groupJid = response;
              console.log(`✅ [${instanceName}] Bot unido al grupo: ${groupJid}`);
              await delay(2000);
              
              await safeGroupOperation(sock, async () => {
                await sendSafe(sock, groupJid, { text: `🤖 Hola, soy ${instanceName.toUpperCase()}.\n\n¿Quieres saber mis funciones?\nUsa \`.menu\` para ver todos mis comandos disponibles.\n\n⏱️ *IMPORTANTE*: Tengo que recibir admin en menos de *24 horas* o sino me salgo automáticamente.` });
              });
              
              await sendSafe(sock, from, { text: `✅ Bot unido al grupo *${groupName}* exitosamente.\n\n⏱️ Recuerda: el bot debe recibir admin en 24 horas.` });
              
            } catch (joinError) {
              try { 
                await safeGroupOperation(sock, async () => await sock.groupAcceptInviteV4(inviteCode), null);
                await sendSafe(sock, from, { text: `📨 *SOLICITUD ENVIADA*\n\nSe ha enviado la solicitud para unirse al grupo *${groupName}*.\n\n⏳ Esperando aprobación de los administradores.` }); 
              } catch (requestError) { await sendSafe(sock, from, { text: `❌ No se pudo enviar la solicitud al grupo *${groupName}*.\n\nVerifica que el enlace sea válido.` }); }
            }
          } catch (e) { await sendSafe(sock, from, { text: '❌ Error al procesar el enlace. Verifica que sea válido y que la conexión sea estable.' }); }
          return;
        }
        
        const comando = comandos.get(cmd.toLowerCase());
        if (!comando) return;
        if (comando.isVIP) { const requiredLevel = comando.requiredLevel || 1; if (!(await ensureVIPAccess(sock, from, remitenteLid, requiredLevel))) return; }
        
        try {
          await comando.run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers, { guardarGeos, guardarDrops, sendSafe });
          try { guardarGeos(); guardarDrops(); } catch(e){}
          if (cmd === 'formatear') recargarGeos();
        } catch (e) { console.error(`Error ejecutando [${instanceName}]:`, e); await sendSafe(sock, from, { text: '❌ Error.' }); }
      } catch (e) { console.error(`Error handler [${instanceName}]:`, e); }
    });

  } catch(error) {
    console.error(`❌ [${instanceName}] Error en iniciarBot:`, error);
    isReconnecting = false;
    BOT_READY = false;
    SOCKET_INSTANCE = null;
    stopHealthCheck();
    intentos++;
    if (intentos < MAX_RECONNECT) { await delay(5000); iniciarBot(); }
  }
}

async function shutdownBotClean() {
  console.log(`🛑 [${instanceName}] Apagando...`);
  stopHealthCheck();
  if (sock?.ws) { try { sock.ev.removeAllListeners(); await sock.end(undefined); await delay(500); } catch(e) {} }
  SOCKET_INSTANCE = null;
  BOT_READY = false;
  console.log(`✅ [${instanceName}] Bot apagado.`);
}

process.on('SIGINT', async () => { await shutdownBotClean(); setTimeout(() => { process.exit(0); }, 1000); });
process.on('SIGTERM', async () => { await shutdownBotClean(); setTimeout(() => { process.exit(0); }, 1000); });

console.log(`🚀 [${instanceName}] Iniciando bot...`);
console.log(`✨ [${instanceName}] Sistema VIP integrado`);
console.log(`🚫🔗 [${instanceName}] Sistema Antilink integrado`);
console.log(`🚫📱 [${instanceName}] Sistema Anti-Estados integrado`);
console.log(`🔇 [${instanceName}] Sistema de Silenciado de Grupos ${sessionNumber ? 'ACTIVO' : 'INACTIVO'}`);
console.log(`🔢 [${instanceName}] Sistema QR ${instanceName === 'session' ? 'en terminal' : 'por imagen'} activado`);
console.log(`🔢 [${instanceName}] Sistema Pairing Code ${isPairingMode ? '✅ ACTIVADO' : '❌ DESACTIVADO'}`);
console.log(`🚀 [${instanceName}] Sistema de auto-inicio ${instanceName === 'session' ? 'ACTIVO' : 'INACTIVO'}`);
console.log(`⏱️ [${instanceName}] Sistema de Health Check ACTIVADO`);
console.log(`👋 [${instanceName}] Sistema de Bienvenida y Despedida ACTIVADO`);

iniciarBot();

if (instanceName === 'session') {
  setTimeout(async () => { await autoStartSubBots(); }, 10000);
}
