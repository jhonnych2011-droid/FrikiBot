// Comando .killsesion (Cierra la sesión principal)
      if ((cmd === 'killsesion' || cmd === 'cdcomandos') && isOwner(remitenteLid)) { // <-- Aquí se añade 'cdcomandos'
        await sendSafe(sock, from, { text: '⚠️ Forzando el cierre de sesión principal (logout) debido al comando.' });
        
        // 1. Terminar la conexión del socket
        await sock.end(undefined); 
        
        // 2. Eliminar la carpeta de la sesión
        const authDir = 'auth_info_baileys'; // Asegúrate que este sea el nombre correcto
        if (fs.existsSync(authDir)) {
            // Asegúrate de importar 'fs' al inicio de bot.js
            fs.rmSync(authDir, { recursive: true, force: true });
            console.log(`[SESIÓN] Carpeta de sesión ${authDir} eliminada.`);
        }
        
        // 3. Informar y salir
        await sendSafe(sock, from, { text: '✅ Sesión cerrada y archivos limpiados. Por favor, reinicia el bot (`npm start` o `node bot.js`) para generar un nuevo QR.' });
        
        // Finaliza el proceso del bot
        process.exit(0); 
        
        return;
      }
