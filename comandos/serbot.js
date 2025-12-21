import { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, makeWASocket } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Textos
const rtx = "*❀ SER BOT • MODE QR*\n\n✰ Con otro celular o en la PC escanea este QR para convertirte en un *Sub-Bot* Temporal.\n\n`1` » Haga clic en los tres puntos en la esquina superior derecha\n\n`2` » Toque dispositivos vinculados\n\n`3` » Escanee este codigo QR para iniciar sesion con el bot\n\n✧ ¡Este código QR expira en 45 segundos!.";
const rtx2 = "*❀ SER BOT • MODE CODE*\n\n✰ Usa este Código para convertirte en un *Sub-Bot* Temporal.\n\n`1` » Haga clic en los tres puntos en la esquina superior derecha\n\n`2` » Toque dispositivos vinculados\n\n`3` » Selecciona Vincular con el número de teléfono\n\n`4` » Escriba el Código para iniciar sesion con el bot\n\n✧ No es recomendable usar tu cuenta principal.";

// Almacenamiento global
if (!global.conns || !(global.conns instanceof Array)) {
  global.conns = [];
}

if (!global.subBotCooldowns) {
  global.subBotCooldowns = new Map();
}

function isSubBotConnected(jid) {
  return global.conns.some(sock => sock?.user?.jid && sock.user.jid.split("@")[0] === jid.split("@")[0]);
}

function msToTime(duration) {
  const milliseconds = parseInt((duration % 1000) / 100);
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  
  const h = (hours < 10) ? '0' + hours : hours;
  const m = (minutes < 10) ? '0' + minutes : minutes;
  const s = (seconds < 10) ? '0' + seconds : seconds;
  
  return minutes + ' m y ' + seconds + ' s';
}

export const command = 'serbot';

export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers, utils) {
  const { sendSafe } = utils;
  const from = msg.key.remoteJid;
  const sender = helpers.getId(msg);
  
  // Verificar cooldown
  const lastUse = global.subBotCooldowns.get(sender) || 0;
  const cooldownTime = 120000; // 2 minutos
  const time = lastUse + cooldownTime;
  
  if (Date.now() - lastUse < cooldownTime) {
    return await sendSafe(sock, from, { 
      text: `ꕥ Debes esperar ${msToTime(time - Date.now())} para volver a vincular un *Sub-Bot.*`
    });
  }
  
  // Verificar límite
  const socklimit = global.conns.filter(s => s?.user).length;
  if (socklimit >= 50) {
    return await sendSafe(sock, from, { 
      text: 'ꕥ No se han encontrado espacios para *Sub-Bots* disponibles.'
    });
  }
  
  // Obtener ID del usuario
  const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const who = mentionedJid && mentionedJid[0] ? mentionedJid[0] : msg.key.fromMe ? sock.user.jid : sender;
  const id = who.split('@')[0];
  const pathYukiJadiBot = path.join('./subbots/', id);
  
  // Crear carpeta si no existe
  if (!fs.existsSync('./subbots/')) {
    fs.mkdirSync('./subbots/', { recursive: true });
  }
  
  if (!fs.existsSync(pathYukiJadiBot)) {
    fs.mkdirSync(pathYukiJadiBot, { recursive: true });
  }
  
  // Actualizar cooldown
  global.subBotCooldowns.set(sender, Date.now());
  
  // Iniciar sub-bot
  const yukiJBOptions = {
    pathYukiJadiBot,
    msg,
    conn: sock,
    args,
    command: 'serbot',
    fromCommand: true,
    sender,
    from
  };
  
  await yukiJadiBot(yukiJBOptions, sendSafe);
}

export async function yukiJadiBot(options, sendSafe) {
  let { pathYukiJadiBot, msg, conn, args, command, sender, from } = options;
  
  // Detectar modo CODE
  if (command === 'code') {
    command = 'qr';
    args.unshift('code');
  }
  
  const mcode = args[0] && /(--code|code)/.test(args[0].trim()) ? true : 
                args[1] && /(--code|code)/.test(args[1].trim()) ? true : false;
  
  let txtCode, codeBot, txtQR;
  
  if (mcode) {
    args[0] = args[0].replace(/^--code$|^code$/, "").trim();
    if (args[1]) args[1] = args[1].replace(/^--code$|^code$/, "").trim();
    if (args[0] === "") args[0] = undefined;
  }
  
  const pathCreds = path.join(pathYukiJadiBot, "creds.json");
  
  if (!fs.existsSync(pathYukiJadiBot)) {
    fs.mkdirSync(pathYukiJadiBot, { recursive: true });
  }
  
  // Intentar cargar credenciales base64
  try {
    if (args[0] && args[0] !== undefined) {
      fs.writeFileSync(pathCreds, JSON.stringify(JSON.parse(Buffer.from(args[0], "base64").toString("utf-8")), null, '\t'));
    }
  } catch {
    await sendSafe(conn, from, { text: `ꕥ Use correctamente el comando » .serbot` });
    return;
  }
  
  try {
    let { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(pathYukiJadiBot);
    
    const connectionOptions = {
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      auth: { 
        creds: state.creds, 
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) 
      },
      browser: ['SubBot', 'Chrome', '1.0.0'],
      version: version,
      generateHighQualityLinkPreview: true,
      getMessage: async () => ({ conversation: '' })
    };
    
    let sock = makeWASocket(connectionOptions);
    sock.isInit = false;
    let isInit = true;
    
    // Auto-limpieza después de 60 segundos
    setTimeout(async () => {
      if (!sock.user) {
        try { 
          fs.rmSync(pathYukiJadiBot, { recursive: true, force: true }); 
        } catch {}
        try { 
          sock.ws?.close(); 
        } catch {}
        sock.ev.removeAllListeners();
        
        const i = global.conns.indexOf(sock);
        if (i >= 0) global.conns.splice(i, 1);
        
        console.log(chalk.red(`[AUTO-LIMPIEZA] Sesión ${path.basename(pathYukiJadiBot)} eliminada - credenciales inválidas.`));
      }
    }, 60000);
    
    async function connectionUpdate(update) {
      const { connection, lastDisconnect, isNewLogin, qr } = update;
      
      if (isNewLogin) sock.isInit = false;
      
      // Modo QR
      if (qr && !mcode) {
        if (msg?.key?.remoteJid) {
          try {
            const qrImage = await QRCode.toBuffer(qr, { scale: 8 });
            txtQR = await conn.sendMessage(msg.key.remoteJid, { 
              image: qrImage, 
              caption: rtx.trim() 
            }, { quoted: msg });
            
            if (txtQR && txtQR.key) {
              setTimeout(() => { 
                conn.sendMessage(msg.key.remoteJid, { delete: txtQR.key }); 
              }, 30000);
            }
          } catch (e) {
            console.error('Error generando QR:', e);
          }
        }
        return;
      }
      
      // Modo CODE
      if (qr && mcode) {
        try {
          const phoneNumber = sender.split('@')[0];
          let secret = await sock.requestPairingCode(phoneNumber);
          secret = secret.match(/.{1,4}/g)?.join("-") || secret;
          
          txtCode = await conn.sendMessage(msg.key.remoteJid, { 
            text: rtx2 
          }, { quoted: msg });
          
          codeBot = await conn.sendMessage(msg.key.remoteJid, { 
            text: `🔑 *CÓDIGO DE VINCULACIÓN*\n\n\`\`\`${secret}\`\`\`\n\n⏰ Este código expira en 60 segundos.` 
          }, { quoted: msg });
          
          console.log(chalk.green(`📱 Código generado: ${secret} para +${phoneNumber}`));
          
          if (txtCode && txtCode.key) {
            setTimeout(() => { 
              conn.sendMessage(sender, { delete: txtCode.key }); 
            }, 30000);
          }
          
          if (codeBot && codeBot.key) {
            setTimeout(() => { 
              conn.sendMessage(sender, { delete: codeBot.key }); 
            }, 30000);
          }
        } catch (e) {
          console.error('Error generando código:', e);
        }
        return;
      }
      
      const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode;
      
      // Conexión cerrada
      if (connection === 'close') {
        if (reason === 428) {
          console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ La conexión (+${path.basename(pathYukiJadiBot)}) fue cerrada inesperadamente. Intentando reconectar...\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`));
          await creloadHandler(true).catch(console.error);
        }
        
        if (reason === 408) {
          console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ La conexión (+${path.basename(pathYukiJadiBot)}) se perdió o expiró. Razón: ${reason}. Intentando reconectar...\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`));
          await creloadHandler(true).catch(console.error);
        }
        
        if (reason === 440) {
          console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ La conexión (+${path.basename(pathYukiJadiBot)}) fue reemplazada por otra sesión activa.\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`));
          
          try {
            if (options.fromCommand && msg?.key?.remoteJid) {
              await conn.sendMessage(`${path.basename(pathYukiJadiBot)}@s.whatsapp.net`, {
                text: '⚠︎ Hemos detectado una nueva sesión, borre la antigua sesión para continuar.\n\n> ☁︎ Si hay algún problema vuelva a conectarse.'
              }, { quoted: msg || null });
            }
          } catch (error) {
            console.error(chalk.bold.yellow(`⚠︎ Error 440 no se pudo enviar mensaje a: +${path.basename(pathYukiJadiBot)}`));
          }
        }
        
        if (reason === 405 || reason === 401) {
          console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ La sesión (+${path.basename(pathYukiJadiBot)}) fue cerrada. Credenciales no válidas o dispositivo desconectado manualmente.\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`));
          
          try {
            if (options.fromCommand && msg?.key?.remoteJid) {
              await conn.sendMessage(`${path.basename(pathYukiJadiBot)}@s.whatsapp.net`, {
                text: '⚠︎ Sesión pendiente.\n\n> ☁︎ Vuelva a intentar nuevamente volver a ser *SUB-BOT*.'
              }, { quoted: msg || null });
            }
          } catch (error) {
            console.error(chalk.bold.yellow(`⚠︎ Error 405 no se pudo enviar mensaje a: +${path.basename(pathYukiJadiBot)}`));
          }
          
          try {
            fs.rmSync(pathYukiJadiBot, { recursive: true, force: true });
          } catch {}
        }
        
        if (reason === 500) {
          console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Conexión perdida en la sesión (+${path.basename(pathYukiJadiBot)}). Borrando datos...\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`));
          
          if (options.fromCommand && msg?.key?.remoteJid) {
            await conn.sendMessage(`${path.basename(pathYukiJadiBot)}@s.whatsapp.net`, {
              text: '⚠︎ Conexión perdida.\n\n> ☁︎ Intente conectarse manualmente para volver a ser *SUB-BOT*'
            }, { quoted: msg || null });
          }
          
          return creloadHandler(true).catch(console.error);
        }
        
        if (reason === 515) {
          console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Reinicio automático para la sesión (+${path.basename(pathYukiJadiBot)}).\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`));
          await creloadHandler(true).catch(console.error);
        }
        
        if (reason === 403) {
          console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Sesión cerrada o cuenta en soporte para la sesión (+${path.basename(pathYukiJadiBot)}).\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`));
          try {
            fs.rmSync(pathYukiJadiBot, { recursive: true, force: true });
          } catch {}
        }
      }
      
      // Conexión abierta
      if (connection === 'open') {
        sock.isInit = true;
        global.conns.push(sock);
        
        const userName = sock.authState.creds.me?.name || 'Anónimo';
        const userJid = sock.authState.creds.me?.jid || `${path.basename(pathYukiJadiBot)}@s.whatsapp.net`;
        
        console.log(chalk.bold.cyanBright(`\n❒⸺⸺⸺⸺【• SUB-BOT •】⸺⸺⸺⸺❒\n│\n│ ❍ ${userName} (+${path.basename(pathYukiJadiBot)}) conectado exitosamente.\n│\n❒⸺⸺⸺【• CONECTADO •】⸺⸺⸺❒`));
        
        if (msg?.key?.remoteJid) {
          await conn.sendMessage(msg.key.remoteJid, { 
            text: isSubBotConnected(sender) 
              ? `@${sender.split('@')[0]}, ya estás conectado, leyendo mensajes entrantes...` 
              : `❀ Has registrado un nuevo *Sub-Bot!* [@${sender.split('@')[0]}]\n\n> Puedes ver la información del bot usando el comando *.infobot*`,
            mentions: [sender]
          }, { quoted: msg });
        }
      }
    }
    
    // Verificación periódica
    setInterval(async () => {
      if (!sock.user) {
        try { sock.ws.close(); } catch (e) {}
        sock.ev.removeAllListeners();
        
        const i = global.conns.indexOf(sock);
        if (i < 0) return;
        delete global.conns[i];
        global.conns.splice(i, 1);
      }
    }, 60000);
    
    // Reload handler
    async function creloadHandler(restatConn) {
      if (restatConn) {
        const oldChats = sock.chats;
        try { sock.ws.close(); } catch {}
        sock.ev.removeAllListeners();
        sock = makeWASocket(connectionOptions, { chats: oldChats });
        isInit = true;
      }
      
      if (!isInit) {
        sock.ev.off("messages.upsert", sock.handler);
        sock.ev.off("connection.update", sock.connectionUpdate);
        sock.ev.off('creds.update', sock.credsUpdate);
      }
      
      // Aquí puedes cargar el handler de mensajes si lo necesitas
      sock.connectionUpdate = connectionUpdate.bind(sock);
      sock.credsUpdate = saveCreds.bind(sock, true);
      
      sock.ev.on("connection.update", sock.connectionUpdate);
      sock.ev.on("creds.update", sock.credsUpdate);
      
      isInit = false;
      return true;
    }
    
    // Iniciar handlers
    sock.ev.on('connection.update', connectionUpdate);
    sock.ev.on('creds.update', saveCreds);
    
  } catch (error) {
    console.error(chalk.red('❌ Error en yukiJadiBot:'), error);
    await sendSafe(conn, from, { text: '❌ Error al iniciar el Sub-Bot.' });
  }
}
