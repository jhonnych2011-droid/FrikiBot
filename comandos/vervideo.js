export const command = "vervideo"; // Para .vervideo

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const mensaje = msg.message;

    let filePath;
    try {
        const buffer = await sock.downloadMediaMessage(msg);
        if (!mensaje.audioMessage) return sock.sendMessage(from, { text: "⚠️ Envía un *audio* y responde con *.vervideo* para convertirlo a video." });

        filePath = `./temp/${Date.now()}.mp3`;
        fs.writeFileSync(filePath, buffer);
    } catch {
        return sock.sendMessage(from, { text: "❌ No pude descargar el archivo." });
    }

    const output = filePath.replace(/\.mp3$/, '.mp4');

    ffmpeg()
        .input(filePath)
        .input('color=c=black:s=640x480:d=5')
        .outputOptions(['-c:v libx264', '-c:a aac', '-shortest'])
        .save(output)
        .on('end', async () => {
            await sock.sendMessage(from, { video: fs.readFileSync(output), mimetype: 'video/mp4' });
            fs.unlinkSync(filePath);
            fs.unlinkSync(output);
        })
        .on('error', async (err) => {
            console.log(err);
            await sock.sendMessage(from, { text: "❌ Error al convertir el archivo." });
        });
}
