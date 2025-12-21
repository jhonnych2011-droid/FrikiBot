export const command = "follar";

function generarBarra(porcentaje) {
  const total = 20;
  const lleno = Math.floor((porcentaje / 100) * total);
  const vacio = total - lleno;
  return '█'.repeat(lleno) + '░'.repeat(vacio);
}

function retardo(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // Obtener menciones reales
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (!mentions[0]) {
    return sock.sendMessage(from, { text: "❌ Usa: .follar @usuario" }, { quoted: msg });
  }

  const ejecutor = msg.key.participant || msg.key.remoteJid;
  const objetivo = mentions[0];

  // Mensaje inicial con barra
  const progressMsg = await sock.sendMessage(from, {
    text: `🔥 Follando a @${objetivo.split("@")[0]}...\n\n[${generarBarra(0)}] 0%`,
    mentions: [objetivo]
  });

  // Actualizar la barra progresivamente
  const pasos = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  
  for (const paso of pasos) {
    await retardo(1500); // Esperar 1.5 segundos entre cada actualización
    
    await sock.sendMessage(from, {
      text: `🔥 Follando a @${objetivo.split("@")[0]}...\n\n[${generarBarra(paso)}] ${paso}%`,
      mentions: [objetivo],
      edit: progressMsg.key
    });
  }

  // Mensaje final
  await retardo(1000);
  await sock.sendMessage(from, {
    text: `Te estás follando a @${objetivo.split("@")[0]} y le dejaste el culo rojo y llenito de leche🥵🔥\n\n[${generarBarra(100)}]`,
    mentions: [objetivo],
    edit: progressMsg.key
  });
}

