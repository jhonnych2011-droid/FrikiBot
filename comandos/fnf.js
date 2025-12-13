import fs from 'fs';
import { sendSafe } from '../bot.js'; // Ajusta la ruta si es necesario

const FNF_FILE = './fnf_data.json';

function loadFnfData() {
    try {
        const data = fs.readFileSync(FNF_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {}; 
    }
}

export const command = 'fnf';
export const description = 'Busca y envía el enlace de un mod FNF específico.';
export const requiredLevel = 0;
export const isOwner = false;

/**
 * Busca y envía el enlace de un mod FNF.
 */
export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers, dbHelpers) {
    const from = msg.key.remoteJid;
    const prefix = '.'; 

    if (args.length === 0) {
        return sendSafe(sock, from, { 
            text: `⚠️ Uso: ${prefix}fnf <Nombre del Mod>.\nPara ver la lista, usa ${prefix}fnfmenu.` 
        });
    }

    const searchName = args.join(' ').trim();
    const searchKey = searchName.toLowerCase();

    const fnfData = loadFnfData();
    const link = fnfData[searchKey];

    if (link) {
        const response = `🎶 Aquí tienes el enlace para **${searchName}**:\n${link}`;
        await sendSafe(sock, from, { text: response });
    } else {
        const response = `❌ No encontré un FNF llamado **${searchName}**.\n\n👉 Usa ${prefix}fnfmenu para ver los disponibles.`;
        await sendSafe(sock, from, { text: response });
    }
}
