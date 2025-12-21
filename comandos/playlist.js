import fs from "fs";
import path from "path";
import yts from "yt-search";
import { spawn } from "child_process";
import axios from "axios";

export const command = "playlist";

// ───────── ARCHIVOS ─────────
const DB_FILE = "./playlists.json";
const VIP_FILE = "./vip.json";
const TEMP_DIR = "./temp/playlist";
const MAX_MB = 16;
const COVER_URL = "https://i.postimg.cc/fR7WXF4H/5072185812481556f9af81f8d7edd890.jpg";

// ───────── UTILS ─────────
function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

function reply(sock, msg, text) {
  return sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function esVIP(jid) {
  const lid = fixID(jid);
  if (!fs.existsSync(VIP_FILE)) return false;
  const vipDB = JSON.parse(fs.readFileSync(VIP_FILE));
  const data = vipDB[lid];
  return data?.vipUntil && Date.now() < data.vipUntil;
}

function loadDB() {
  return fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : {};
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

async function searchYouTube(query) {
  const res = await yts(query);
  if (!res.videos?.length) throw new Error("No se encontró resultado");
  return res.videos[0];
}

function downloadAudioMP3(url, outPath) {
  return new Promise((resolve, reject) => {
    const ytdlp = spawn("yt-dlp", [
      "-f", "bestaudio[ext=m4a]/bestaudio",
      "--extract-audio",
      "--audio-format", "mp3",
      "--audio-quality", "0",
      "--no-playlist",
      "--no-warnings",
      "--no-check-certificate",
      "-o", outPath.replace('.mp3', '.%(ext)s'),
      url
    ]);

    let errorOutput = '';
    ytdlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ytdlp.on("close", code => {
      if (code === 0 && fs.existsSync(outPath)) {
        resolve(outPath);
      } else {
        reject(new Error(`yt-dlp falló: ${errorOutput}`));
      }
    });

    ytdlp.on("error", reject);
  });
}

function calcSizeMB(tracks) {
  return tracks.length * 3; // aprox 3MB por canción
}

function progressBar(mb) {
  const total = 10;
  const filled = Math.min(total, Math.round((mb / MAX_MB) * total));
  return "▰".repeat(filled) + "▱".repeat(total - filled);
}

async function downloadCover(url, outputPath) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(outputPath, Buffer.from(response.data));
    return true;
  } catch (error) {
    console.error('Error descargando portada:', error.message);
    return false;
  }
}

// ───────── RUN ─────────
export async function run(sock, msg, args) {
  const sub = (args.shift() || "").toLowerCase();
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  if (!esVIP(sender)) {
    return reply(sock, msg, "🔒 *Comando exclusivo para usuarios VIP* 💎");
  }

  const db = loadDB();
  db[sender] ||= {};

  try {
    // ───── MENÚ ─────
    if (!sub) {
      return reply(
        sock,
        msg,
        "📀 *Playlist VIP*\n\n" +
        "🎶 .playlist crear <nombre>\n" +
        "➕ .playlist agregar <nombre> | <canción>\n" +
        "📋 .playlist ver <nombre>\n" +
        "📂 .playlist mias\n" +
        "🔁 .playlist mover <nombre> <de> <a>\n" +
        "🗑️ .playlist eliminar <nombre>\n" +
        "⬇️ .playlist descargar <nombre>"
      );
    }

    // ───── CREAR ─────
    if (sub === "crear") {
      const name = args.join(" ");
      if (!name) return reply(sock, msg, "❌ Uso: .playlist crear <nombre>");
      if (db[sender][name]) return reply(sock, msg, "❌ Ya existe");

      db[sender][name] = { tracks: [] };
      saveDB(db);
      return reply(sock, msg, "✅ Playlist creada: *" + name + "* 🎧");
    }

    // ───── AGREGAR ─────
    if (sub === "agregar") {
      const fullText = args.join(" ");
      
      // Dividir por |
      const parts = fullText.split("|").map(p => p.trim());
      
      if (parts.length < 2) {
        return reply(sock, msg, "❌ Uso: .playlist agregar <nombre> | <canción>\n\nEjemplo:\n.playlist agregar Mi Lista | Despacito");
      }

      const name = parts[0];
      const query = parts[1];

      const pl = db[sender][name];
      if (!pl) return reply(sock, msg, "❌ Playlist no existe. Créala primero con:\n.playlist crear " + name);

      const video = await searchYouTube(query);
      pl.tracks.push({ title: video.title, url: video.url });

      const mb = calcSizeMB(pl.tracks);
      saveDB(db);

      return reply(
        sock,
        msg,
        `➕ *${video.title}*\n\n📀 Playlist: *${name}*\n📦 ${mb}/${MAX_MB} MB\n${progressBar(mb)}`
      );
    }

    // ───── VER ─────
    if (sub === "ver") {
      const name = args.join(" ");
      const pl = db[sender][name];
      if (!pl) return reply(sock, msg, "❌ Playlist no existe");

      const mb = calcSizeMB(pl.tracks);
      const list = pl.tracks
        .map((t, i) => `${i + 1}. ${t.title}`)
        .join("\n") || "📭 Vacía";

      return reply(
        sock,
        msg,
        `📀 *${name}*\n\n${list}\n\n📦 ${mb}/${MAX_MB} MB\n${progressBar(mb)}`
      );
    }

    // ───── MIAS ─────
    if (sub === "mias") {
      const playlists = Object.keys(db[sender]);
      
      if (playlists.length === 0) {
        return reply(sock, msg, "📭 *No tienes playlists creadas*\n\nCrea una con:\n.playlist crear <nombre>");
      }

      let mensaje = "📂 *Mis Playlists* 🎵\n\n";
      
      playlists.forEach((name, index) => {
        const pl = db[sender][name];
        const trackCount = pl.tracks.length;
        const mb = calcSizeMB(pl.tracks);
        
        mensaje += `${index + 1}. *${name}*\n`;
        mensaje += `   🎵 ${trackCount} canción${trackCount !== 1 ? 'es' : ''}\n`;
        mensaje += `   📦 ${mb}/${MAX_MB} MB\n`;
        mensaje += `   ${progressBar(mb)}\n\n`;
      });

      mensaje += "💡 Usa `.playlist ver <nombre>` para ver detalles";

      return reply(sock, msg, mensaje);
    }

    // ───── MOVER ─────
    if (sub === "mover") {
      const name = args.shift();
      const from = parseInt(args[0]) - 1;
      const to = parseInt(args[1]) - 1;

      const pl = db[sender][name];
      if (!pl) return reply(sock, msg, "❌ Playlist no existe");
      if (isNaN(from) || isNaN(to)) return reply(sock, msg, "❌ Números inválidos");
      if (from < 0 || from >= pl.tracks.length || to < 0 || to >= pl.tracks.length) {
        return reply(sock, msg, "❌ Posiciones fuera de rango");
      }

      const [track] = pl.tracks.splice(from, 1);
      pl.tracks.splice(to, 0, track);
      saveDB(db);

      return reply(sock, msg, `🔁 *${track.title}* movida de posición ${from + 1} → ${to + 1} ✅`);
    }

    // ───── ELIMINAR ─────
    if (sub === "eliminar") {
      const name = args.join(" ");
      if (!db[sender][name]) return reply(sock, msg, "❌ Playlist no existe");

      const trackCount = db[sender][name].tracks.length;
      delete db[sender][name];
      saveDB(db);
      
      return reply(sock, msg, `🗑️ Playlist eliminada: *${name}*\n(${trackCount} canción${trackCount !== 1 ? 'es' : ''} eliminada${trackCount !== 1 ? 's' : ''})`);
    }

    // ───── DESCARGAR ─────
    if (sub === "descargar") {
      const name = args.join(" ");
      const pl = db[sender][name];
      if (!pl || !pl.tracks.length)
        return reply(sock, msg, "❌ Playlist vacía o no existe");

      const mb = calcSizeMB(pl.tracks);
      if (mb > MAX_MB) {
        return reply(sock, msg, `⚠️ La playlist excede el límite\n\n📦 ${mb}/${MAX_MB} MB\n${progressBar(mb)}\n\n💡 Elimina algunas canciones para reducir el tamaño`);
      }

      // ⌛ REACCIÓN
      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: "⌛", key: msg.key }
      });

      const dir = path.join(TEMP_DIR, Date.now().toString());
      ensureDir(dir);

      const coverPath = path.join(dir, "cover.jpg");

      // Descargar portada
      console.log('📥 Descargando portada...');
      await downloadCover(COVER_URL, coverPath);

      const mp3Files = [];
      console.log(`📥 Descargando ${pl.tracks.length} canciones...`);
      
      for (let i = 0; i < pl.tracks.length; i++) {
        const mp3Path = path.join(dir, `track_${i}.mp3`);
        console.log(`Descargando ${i + 1}/${pl.tracks.length}: ${pl.tracks[i].title}`);
        await downloadAudioMP3(pl.tracks[i].url, mp3Path);
        mp3Files.push(mp3Path);
      }

      const out = path.join(dir, "playlist.mp3");

      console.log('🎵 Concatenando audios y agregando portada...');

      // Concatenar MP3s y agregar portada + metadata
      await new Promise((resolve, reject) => {
        const ffmpegArgs = [
          "-y",
          ...mp3Files.flatMap(f => ["-i", f])
        ];

        // Agregar portada si existe
        if (fs.existsSync(coverPath)) {
          ffmpegArgs.push("-i", coverPath);
        }

        // Filter complex para concatenar
        ffmpegArgs.push(
          "-filter_complex", `concat=n=${mp3Files.length}:v=0:a=1[aout]`,
          "-map", "[aout]"
        );

        // Mapear portada si existe
        if (fs.existsSync(coverPath)) {
          ffmpegArgs.push(
            "-map", `${mp3Files.length}:v`,
            "-c:v", "mjpeg",
            "-disposition:v", "attached_pic"
          );
        }

        // Opciones finales
        ffmpegArgs.push(
          "-c:a", "libmp3lame",
          "-b:a", "192k",
          "-id3v2_version", "3",
          "-metadata", `title=${name}`,
          "-metadata", "artist=FrikiBot",
          "-metadata", "album=FrikiBot Playlist",
          out
        );

        const ff = spawn("ffmpeg", ffmpegArgs);
        
        ff.stderr.on('data', (data) => {
          // Log de FFmpeg (opcional)
          // console.log(data.toString());
        });

        ff.on("close", code => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error("FFmpeg falló"));
          }
        });
        
        ff.on("error", reject);
      });

      if (!fs.existsSync(out)) {
        throw new Error('No se generó el archivo de playlist');
      }

      const stats = fs.statSync(out);
      console.log(`📊 Tamaño final: ${(stats.size/1024/1024).toFixed(2)}MB`);

      if (stats.size > 16*1024*1024) {
        fs.rmSync(dir, { recursive: true, force: true });
        return reply(sock, msg, `⚠️ La playlist es muy grande (${(stats.size/1024/1024).toFixed(1)}MB)\n💡 Límite de WhatsApp: 16MB`);
      }

      console.log('📤 Enviando playlist...');
      const buffer = fs.readFileSync(out);

      await sock.sendMessage(msg.key.remoteJid, {
        audio: buffer,
        mimetype: "audio/mpeg",
        fileName: `${name}.mp3`,
        ptt: false
      }, { quoted: msg });

      // ✅ FINAL
      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: "✅", key: msg.key }
      });

      fs.rmSync(dir, { recursive: true, force: true });
      console.log('✅ Proceso completado');
      return;
    }

    return reply(sock, msg, "❌ Subcomando inválido. Usa `.playlist` para ver el menú");

  } catch (e) {
    console.error('Error en .playlist:', e);
    return reply(sock, msg, "⚠️ Error: " + e.message);
  }
}
