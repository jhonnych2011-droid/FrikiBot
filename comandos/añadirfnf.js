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

function saveFnfData(data) {
    fs.writeFileSync(FNF_FILE, JSON.stringify(data, null, 2));
}

export const command = 'añadirfnf';
export const aliases = ['anadirfnf']; // Para soportar la ñ y n
export const description = 'Añade un nuevo mod FNF y su enlace. (Solo Owner)';
export const requiredLevel = 0;
export const isOwner = true; // Marca esto como un comando de Owner

/**
 * Añade un mod FNF a la base de datos.
 */
export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers, dbHelpers) {
    const from = msg.key.remoteJid;
    const prefix = '.'; 

    const fullText = args.join(' ');
    const parts = fullText.split('|').map(p => p.trim());

    if (parts.length < 2 || !parts[0] || !parts[1]) {
        return sendSafe(sock, from, { 
            text: `⚠️ Uso incorrecto.\nSintaxis: ${prefix}añadirfnf <Nombre del Mod> | <Enlace>` 
        });
    }

    const name = parts[0];
    const link = parts[1];
    const key = name.toLowerCase();

    const fnfData = loadFnfData();
    fnfData[key] = link; 
    saveFnfData(fnfData);

    await sendSafe(sock, from, { 
        text: `✅ ¡FNF **${name}** agregado con éxito!\nEnlace guardado: ${link}` 
    });
}
