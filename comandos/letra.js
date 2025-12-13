import Genius from "genius-lyrics";
import { sendSafe } from '../bot.js';

export const command = 'letra';
export const isVIP = false;

const GENIUS_API_KEY = 'TU_TOKEN_AQUI';
const client = new Genius.Client(GENIUS_API_KEY);

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    if (!args || args.length === 0) 
        return await sendSafe(sock, from, { text: '❌ Uso: .letra <nombre de la canción>' });

    const query = args.join(' ');

    try {
        const searches = await client.songs.search(query);
        if (!searches || searches.length === 0) 
            return await sendSafe(sock, from, { text: `❌ No se encontró la canción: ${query}` });

        const song = searches[0];
        const lyrics = await song.lyrics();

        if (!lyrics) 
            return await sendSafe(sock, from, { text: `❌ No se pudo obtener la letra de: ${query}` });

        // Dividir letra en partes si es muy larga
        const chunks = lyrics.match(/[\s\S]{1,4000}/g);
        for (const chunk of chunks) await sendSafe(sock, from, { text: chunk });

    } catch (e) {
        console.error('Error fetching lyrics:', e);
        await sendSafe(sock, from, { text: `❌ Error al buscar la letra de: ${query}` });
    }
}
