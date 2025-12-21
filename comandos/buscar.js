import fs from "fs";

export const command = "buscar";

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;

    if (!args.length) {
        return sock.sendMessage(from, { text: "⚠️ Uso: .buscar <LID>" });
    }

    const lid = args[0].replace(/@.+$/, "@lid");

    // Cargar usuarios registrados
    const ruta = "./usuarios_lid.json";
    if (!fs.existsSync(ruta)) {
        return sock.sendMessage(from, { text: "❌ No hay usuarios registrados." });
    }

    const usuarios = JSON.parse(fs.readFileSync(ruta, "utf8"));

    if (usuarios[lid]) {
        const numero = usuarios[lid].numero || "Desconocido";
        await sock.sendMessage(from, { text: `📍 Usuario: ${lid}\n📞 Número: ${numero}` });
    } else {
        await sock.sendMessage(from, { text: `📍 Usuario: ${lid}\n📞 Número: Desconocido` });
    }
}
