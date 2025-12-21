// comandos/bienvenida.js
import fs from 'fs';

// ✅✅✅ FUNCIÓN PARA ENVIAR BIENVENIDA CON FOTO DE PERFIL ✅✅✅
export async function sendWelcomeMessage(sock, groupJid, newMemberJid, sendSafe) {
  try {
    // Obtener metadata del grupo
    const groupMetadata = await sock.groupMetadata(groupJid);
    const groupName = groupMetadata.subject || 'este grupo';
    const groupDesc = groupMetadata.desc || 'Sin descripción';

    // Obtener número del usuario
    const userNumber = newMemberJid.split('@')[0];
    
    // Formatear descripción con > en cada línea
    const formattedDesc = groupDesc
      .split('\n')
      .map(line => `> ${line}`)
      .join('\n');
    
    // Crear mensaje de bienvenida
    const welcomeText = `Hola @${userNumber} bienvenido al grupo *${groupName}*.

Soy *FrikiBot* y te doy la bienvenida, para usarme escribe \`.menu\` y verás mi listado de comandos.

*Descripción del grupo y posibles reglas:* 🤓
${formattedDesc}

🔗 *Mi grupo de WhatsApp:*
https://chat.whatsapp.com/FvmAr3qHTGMKE2C51J3ZEC

📢 *Mi canal:*
https://whatsapp.com/channel/0029VbBKwI71XquRMXqfBD1R

Espero que la pases muy bien. 🌸`;

    // 📸 Intentar obtener foto de perfil del usuario
    let profilePicUrl = null;
    try {
      profilePicUrl = await sock.profilePictureUrl(newMemberJid, 'image');
      console.log(`✅ Foto de perfil obtenida para ${userNumber}`);
    } catch (e) {
      console.log(`⚠️ Usuario ${userNumber} no tiene foto de perfil`);
    }

    // Enviar mensaje con foto de perfil y mención
    if (profilePicUrl) {
      // 📸 ENVIAR CON FOTO DE PERFIL DEL USUARIO
      await sendSafe(sock, groupJid, {
        image: { url: profilePicUrl },
        caption: welcomeText,
        mentions: [newMemberJid]
      });
    } else {
      // Si no tiene foto, enviar con emoji
      await sendSafe(sock, groupJid, {
        text: `👤 ${welcomeText}`,
        mentions: [newMemberJid]
      });
    }

    console.log(`✅ Bienvenida enviada a ${userNumber} en ${groupName}`);
  } catch (e) {
    console.error('Error enviando bienvenida:', e);
  }
}

// ✅✅✅ FUNCIÓN PARA ENVIAR DESPEDIDA CON FOTO DE PERFIL ✅✅✅
export async function sendFarewellMessage(sock, groupJid, leftMemberJid, sendSafe) {
  try {
    // Obtener número del usuario
    const userNumber = leftMemberJid.split('@')[0];
    
    // Crear mensaje de despedida
    const farewellText = `Adiós @${userNumber}, espero que estés bien y gracias por estar en el grupo, ya no será el mismo sin ti. 😢

¡Te deseamos lo mejor! 💙`;

    // 📸 Intentar obtener foto de perfil del usuario
    let profilePicUrl = null;
    try {
      profilePicUrl = await sock.profilePictureUrl(leftMemberJid, 'image');
      console.log(`✅ Foto de perfil obtenida para ${userNumber}`);
    } catch (e) {
      console.log(`⚠️ Usuario ${userNumber} no tiene foto de perfil`);
    }

    // Enviar mensaje con foto de perfil y mención
    if (profilePicUrl) {
      // 📸 ENVIAR CON FOTO DE PERFIL DEL USUARIO
      await sendSafe(sock, groupJid, {
        image: { url: profilePicUrl },
        caption: farewellText,
        mentions: [leftMemberJid]
      });
    } else {
      // Si no tiene foto, enviar con emoji
      await sendSafe(sock, groupJid, {
        text: `👤 ${farewellText}`,
        mentions: [leftMemberJid]
      });
    }

    console.log(`✅ Despedida enviada para ${userNumber} en ${groupJid}`);
  } catch (e) {
    console.error('Error enviando despedida:', e);
  }
}
