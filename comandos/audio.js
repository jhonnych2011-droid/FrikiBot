import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

export const command = "audio"; // Para .audio

// Función para descargar videos correctamente
async function descargarArchivo(sock, msg) {
    try {
        let buffer;
        let ext;

        // Video normal
        if (msg.message.videoMessage) {
            buffer = await sock.downloadMediaMessage(msg);
            ext = '.mp4';
        } 
        // Video como documento
        else if (msg.message.documentMessage && msg.message.documentMessage.mimetype.startsWith('video/')) {
            buffer = await sock.downloadMediaMessage(msg);
            ext = path.extname(msg.message.documentMessage.fileName) || '.mp4';
        } 
        else {
            return { error: "⚠️ Envía un *video* y responde con *.audio* para convertirlo a música." };
        }

        const filePath = path.join('./temp', `${Date.now()}${ext}`);
        fs.writeFileSync(filePath, buffer);
        return { filePath };
    } catch (err) {
        console.log(err);
        return { error: "❌ No pude descargar el archivo." };
    }
}

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;

    const { filePath, error } = await descargarArchivo(sock, msg);
    if (error) return sock.sendMessage(from, { text: error });

    const output = filePath.replace(/\.mp4$/, '.mp3');

    ffmpeg(filePath)
        .output(output)
        .on('end', async () => {
            await sock.sendMessage(from, { audio: fs.readFileSync(output), mimetype: 'audio/mpeg' });
            fs.unlinkSync(filePath);
            fs.unlinkSync(output);
        })
        .on('error', async (err) => {
            console.log(err);
            await sock.sendMessage(from, { text: "❌ Error al convertir el archivo." });
        })
        .run();
}
