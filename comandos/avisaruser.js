import fs from "fs";

export const command = "avisaruser";

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;

    // Cargar owners
    const owners = JSON.parse(fs.readFileSync("./owners.json", "utf8"))
        .map(o => o.replace(/@.+$/, "@lid"));

    const sender = (msg.key.participant || msg.key.remoteJid).replace(/@.+$/, "@lid");

    if (!owners.includes(sender)) {
        return sock.sendMessage(from, { text: "❌ No tienes permisos para usar este comando." });
    }

    if (!args.length) {
        return sock.sendMessage(from, { text: "⚠️ Uso: .avisaruser <mensaje>" });
    }

    const mensaje = args.join(" ");

    // Cargar usuarios de usuarios.json
    const ruta = "./usuarios.json";
    if (!fs.existsSync(ruta)) {
        return sock.sendMessage(from, { text: "❌ No hay usuarios registrados." });
    }

    const registrados = JSON.parse(fs.readFileSync(ruta, "utf8"));
    const usuarios = Object.keys(registrados);

    await sock.sendMessage(from, {
        text: `📢 Enviando mensaje a *${usuarios.length} usuarios*.\n\n⏳ Tiempo estimado: ~${usuarios.length * 1.5} minutos.`
    });

    let enviados = 0;

    for (const user of usuarios) {
        try {
            await sock.sendPresenceUpdate("composing", user);

            await sock.sendMessage(user, {
                text: `📩 *Mensaje del creador del bot:*\n\n${mensaje}`
            });

            enviados++;

            // Esperar 1.5 minutos entre usuario y usuario
            await new Promise(res => setTimeout(res, 90000));

        } catch (e) {
            console.log("Error enviando a:", user, e);
        }
    }

    await sock.sendMessage(from, {
        text: `✔ Avisado correctamente a *${enviados} usuarios*.`
    });
}
