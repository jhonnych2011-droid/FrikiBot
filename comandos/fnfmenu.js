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

export const command = 'fnfmenu';
export const description = 'Muestra el menú de mods FNF disponibles.';
export const requiredLevel = 0; // No requiere VIP
export const isOwner = false;

/**
 * Muestra una lista de los mods FNF disponibles.
 */
export async function run(sock, msg, args, geosDB, dropsDB, pppTemp, helpers, dbHelpers) {
    const from = msg.key.remoteJid;
    const prefix = '.'; 

    const fnfData = loadFnfData();
    const keys = Object.keys(fnfData);

    if (keys.length === 0) {
        return sendSafe(sock, from, { 
            text: "⚠️ Actualmente no hay mods FNF guardados en la lista. ¡Pídele a un owner que añada uno!" 
        });
    }

    let menuText = '📜 **Menú de FNF Disponibles:**\n\n';
    
    keys.forEach((key, index) => {
        const displayName = key.charAt(0).toUpperCase() + key.slice(1); 
        menuText += `${index + 1}. ${displayName}\n`;
    });

    menuText += `\n👉 Usa ${prefix}fnf <nombre> para obtener el enlace.`;

    await sendSafe(sock, from, { text: menuText });
}
