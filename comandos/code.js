export const command = 'code';
export const description = 'Generar código de vinculación de 8 dígitos para sub-bot';

export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers, { guardarGeos, guardarDrops, sendSafe }) {
  const from = msg.key.remoteJid;
  const remitente = helpers.getId(msg);
  
  await sendSafe(sock, from, {
    text: `⏳ *GENERANDO CÓDIGO DE VINCULACIÓN...*\n\n` +
          `Por favor espera unos segundos...`
  });
  
  // El código real se genera en bot.js
  // Este archivo solo es para documentación
}
