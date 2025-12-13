import fs from 'fs';

export const command = "debugformat";

export async function run(sock, msg, args, geosDB) {

  function fixID(jid) {
    if (!jid) return '';
    return jid.replace(/@.+$/, '').replace(/:\d+/, '');
  }

  const sender = msg.key.participant || msg.key.remoteJid;
  const senderFixed = fixID(sender);

  const owners = JSON.parse(fs.readFileSync('./owners.json', 'utf8')).map(fixID);
  if (!owners.includes(senderFixed)) {
    return sock.sendMessage(msg.key.remoteJid, { text: "❌ Solo OWNERS" }, { quoted: msg });
  }

  try {
    const geosPath = './geos.json';
    
    console.log('=== DEBUG FORMATEAR ===');
    console.log('1. Archivo existe:', fs.existsSync(geosPath));
    
    // Leer archivo
    const contenido = fs.readFileSync(geosPath, 'utf8');
    let geos = JSON.parse(contenido);
    
    console.log('2. Total usuarios en archivo:', Object.keys(geos).length);
    console.log('3. Primeros 3 usuarios:');
    
    let count = 0;
    for (let user in geos) {
      if (count < 3) {
        console.log(`   ${user}:`, geos[user]);
        count++;
      }
    }
    
    // Intentar modificar
    console.log('4. Intentando modificar...');
    let modificados = 0;
    
    for (let user in geos) {
      const antes = JSON.stringify(geos[user]);
      
      if (typeof geos[user] === 'object' && geos[user] !== null) {
        if ('geos' in geos[user]) {
          geos[user].geos = 0;
          modificados++;
        }
      } else {
        geos[user] = 0;
        modificados++;
      }
      
      if (modificados <= 3) {
        const despues = JSON.stringify(geos[user]);
        console.log(`   ${user}: ${antes} -> ${despues}`);
      }
    }
    
    console.log('5. Total modificados:', modificados);
    
    // Guardar
    console.log('6. Guardando archivo...');
    fs.writeFileSync(geosPath, JSON.stringify(geos, null, 2));
    console.log('7. Archivo guardado');
    
    // Verificar
    console.log('8. Verificando...');
    const verificacion = JSON.parse(fs.readFileSync(geosPath, 'utf8'));
    
    let todosEnCero = 0;
    let noEnCero = 0;
    
    for (let user in verificacion) {
      const val = verificacion[user];
      const geosVal = (typeof val === 'object' && val !== null) ? val.geos : val;
      
      if (geosVal === 0) {
        todosEnCero++;
      } else {
        noEnCero++;
        if (noEnCero <= 5) {
          console.log(`   ❌ ${user} tiene ${geosVal} geos (debería ser 0)`);
        }
      }
    }
    
    console.log('9. Resultados:');
    console.log(`   ✅ En cero: ${todosEnCero}`);
    console.log(`   ❌ NO en cero: ${noEnCero}`);
    
    await sock.sendMessage(msg.key.remoteJid, { 
      text: `📊 *DEBUG COMPLETADO*\n\n` +
            `Total usuarios: ${Object.keys(geos).length}\n` +
            `Modificados: ${modificados}\n` +
            `✅ En cero: ${todosEnCero}\n` +
            `❌ NO en cero: ${noEnCero}\n\n` +
            `Revisa la consola para más detalles.`
    }, { quoted: msg });

  } catch (e) {
    console.error("❌ Error en debug:", e);
    console.error(e.stack);

    await sock.sendMessage(msg.key.remoteJid, { 
      text: `❌ Error: ${e.message}` 
    }, { quoted: msg });
  }
}
