import fs from "fs";

export const command = "aqui";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // Guardar el grupo donde se usó .aqui
  const alertaData = { grupoAlerta: from };
  fs.writeFileSync("./alerta.json", JSON.stringify(alertaData));

  await sock.sendMessage(from, {
    text: `✅ Este grupo ahora recibirá alertas de spam automáticamente.`
  });
}
