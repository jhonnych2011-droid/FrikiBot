// comandos/letra.js
import axios from 'axios';
import * as cheerio from 'cheerio';

export const command = "letra";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  
  if (args.length === 0) {
    return await sock.sendMessage(from, {
      text: "❌ *Uso:* .letra <nombre de la canción>\n📝 *Ejemplo:* .letra bad bunny donde nadie me ve"
    }, { quoted: msg });
  }
  
  const searchQuery = args.join(" ");
  
  try {
    // Enviar mensaje de espera
    await sock.sendMessage(from, {
      text: `🔍 *Buscando:* "${searchQuery}"\n⏳ Esto puede tomar unos segundos...`
    }, { quoted: msg });
    
    // ⚠️ REEMPLAZA CON TU TOKEN REAL Y GUÁRDALO SEGURO
    const GENIUS_TOKEN = "7Z3BQf7vQ7Tr4pe37x5TtPDOdXrN7W2ZXV7NrFxx9YqlDt4qDcI8s1gbr6_gQoiW";
    
    // 1. Buscar la canción en Genius
    const searchResponse = await axios.get(`https://api.genius.com/search?q=${encodeURIComponent(searchQuery)}`, {
      headers: {
        'Authorization': `Bearer ${GENIUS_TOKEN}`
      },
      timeout: 10000
    });
    
    if (!searchResponse.data.response.hits || searchResponse.data.response.hits.length === 0) {
      return await sock.sendMessage(from, {
        text: `❌ *No se encontró:* "${searchQuery}"\n⚠️ Intenta con otro nombre o artista`
      }, { quoted: msg });
    }
    
    // 2. Obtener la primera coincidencia
    const song = searchResponse.data.response.hits[0].result;
    const songUrl = song.url;
    const songTitle = song.title;
    const artist = song.primary_artist.name;
    const thumbnail = song.song_art_image_thumbnail_url;
    
    // 3. Obtener la letra haciendo scraping de la página
    const lyrics = await scrapeGeniusLyrics(songUrl);
    
    if (!lyrics || lyrics.trim().length < 50) {
      return await sock.sendMessage(from, {
        text: `🎵 *${songTitle}*\n👤 *Artista:* ${artist}\n\n❌ No se pudo obtener la letra completa\n🔗 *Enlace:* ${songUrl}`,
        ...(thumbnail && { image: { url: thumbnail } })
      }, { quoted: msg });
    }
    
    // 4. Formatear y enviar la letra
    let formattedLyrics = lyrics;
    
    // Limitar longitud si es muy larga
    if (formattedLyrics.length > 3500) {
      formattedLyrics = formattedLyrics.substring(0, 3500) + "\n\n... *Letra truncada por ser muy larga*";
    }
    
    const finalMessage = `🎵 *${songTitle}*\n👤 *Artista:* ${artist}\n\n${formattedLyrics}\n\n✨ *Letra obtenida por FrikiBot*\n🔗 *Fuente:* Genius.com`;
    
    // Enviar con imagen si está disponible
    if (thumbnail) {
      await sock.sendMessage(from, {
        image: { url: thumbnail },
        caption: finalMessage
      }, { quoted: msg });
    } else {
      await sock.sendMessage(from, {
        text: finalMessage
      }, { quoted: msg });
    }
    
  } catch (error) {
    console.error("Error en comando letra:", error);
    
    if (error.response?.status === 401) {
      await sock.sendMessage(from, {
        text: "❌ *Error de autenticación*\n🔧 El token de Genius no es válido\n📌 Consigue uno en: https://genius.com/api-clients"
      }, { quoted: msg });
    } else if (error.code === 'ECONNABORTED') {
      await sock.sendMessage(from, {
        text: "❌ *Tiempo de espera agotado*\n⚠️ El servidor tardó demasiado en responder\n🔧 Intenta nuevamente más tarde"
      }, { quoted: msg });
    } else {
      await sock.sendMessage(from, {
        text: `❌ *Error al buscar la letra*\n🔧 Detalles: ${error.message}\n⚠️ Intenta con otra canción`
      }, { quoted: msg });
    }
  }
}

// Función para hacer scraping de la letra en Genius
async function scrapeGeniusLyrics(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Intentar diferentes selectores (Genius cambia su estructura)
    let lyrics = '';
    
    // Selector 1: Nuevo formato de Genius
    $('div[data-lyrics-container="true"]').each((i, elem) => {
      const verse = $(elem).html()
        .replace(/<br>/g, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/\[.*?\]/g, '') // Remover [Coros], [Verso], etc.
        .trim();
      if (verse) lyrics += verse + '\n\n';
    });
    
    // Selector 2: Formato antiguo
    if (!lyrics) {
      $('.lyrics').each((i, elem) => {
        const verse = $(elem).text()
          .replace(/\[.*?\]/g, '')
          .trim();
        if (verse) lyrics += verse + '\n\n';
      });
    }
    
    // Selector 3: Otra posible estructura
    if (!lyrics) {
      $('[class*="Lyrics__Container"]').each((i, elem) => {
        const verse = $(elem).html()
          .replace(/<br>/g, '\n')
          .replace(/<[^>]*>/g, '')
          .replace(/\[.*?\]/g, '')
          .trim();
        if (verse) lyrics += verse + '\n\n';
      });
    }
    
    // Limpiar espacios en blanco excesivos
    lyrics = lyrics
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .trim();
    
    return lyrics;
    
  } catch (error) {
    console.error("Error scraping Genius:", error);
    return null;
  }
}
