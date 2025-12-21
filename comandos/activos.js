import fs from "fs";
export const command = "activos";

// Archivos
const usuariosFile = "./usuarios.json";
const comandosFile = "./comandos.json"; // Aquí contamos los comandos de cada usuario

export async function run(sock, msg) {
  const from = msg.key.remoteJid;

  if (!fs.existsSync(usuariosFile) || !fs.existsSync(comandosFile)) {
    return sock.sendMessage(from, { text: "❌ Error: faltan archivos JSON necesarios." });
  }

  const usuarios = JSON.parse(fs.readFileSync(usuariosFile, "utf8"));
  const comandosData = JSON.parse(fs.readFileSync(comandosFile, "utf8"));

  // Filtrar usuarios con nombre
  const activos = Object.entries(usuarios)
    .filter(([lid, data]) => data.nombre) // solo usuarios con nombre
    .map(([lid, data]) => ({
      lid,
      nombre: data.nombre,
      totalComandos: comandosData[lid]?.total || 0
    }))
    .sort((a, b) => b.totalComandos - a.totalComandos) // ordenar por comandos
    .slice(0, 10); // top 10

  if (activos.length === 0) {
    return sock.sendMessage(from, { text: "📭 No hay usuarios activos con nombre." });
  }

  let texto = "🔥 *Usuarios activos*\n\n";

  activos.forEach((u, i) => {
    texto += `${i + 1}. ${u.nombre}\n   Comandos totales: ${u.totalComandos}\n\n`;
  });

  sock.sendMessage(from, { text: texto });
}
