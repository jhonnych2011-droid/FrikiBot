import fs from "fs";

export const command = "hacer";

const TRATOS_PATH = './tratos.json';
const GEOS_PATH = './geos.json';

function cargarDB(path) {
  if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify({}, null,2));
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

function guardarDB(path, db) {
  fs.writeFileSync(path, JSON.stringify(db, null,2));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = (msg.key.participant || from).split("@")[0];

  if (args[0] !== "trato") return;
  const nombre = args[1];
  const cantidad = parseInt(args[2]);
  if (!nombre || isNaN(cantidad) || cantidad <=0) 
    return sock.sendMessage(from,{text:"❌ Uso: .hacer trato <nombre> <cantidad>"});

  const tratosDB = cargarDB(TRATOS_PATH);
  const geosDB = cargarDB(GEOS_PATH);

  if (!geosDB[sender]) geosDB[sender] = 0;

  // Verificar si ya tiene trato
  if(tratosDB.usuarios?.[sender]?.deuda && Object.keys(tratosDB.usuarios[sender].deuda).length > 0){
    return sock.sendMessage(from,{text:"❌ Ya tienes un trato activo. Debes devolverlo antes de hacer otro."});
  }

  // Fecha límite
  const tiempoLimite = tratosDB.overload?.[nombre]?.tiempoLimite || 60;
  const fechaLimite = Date.now() + tiempoLimite*60000;

  if(!tratosDB.usuarios) tratosDB.usuarios = {};
  if(!tratosDB.usuarios[sender]) tratosDB.usuarios[sender] = {deuda:{}};
  tratosDB.usuarios[sender].deuda[nombre] = {cantidad, fechaLimite};

  guardarDB(TRATOS_PATH, tratosDB);
  guardarDB(GEOS_PATH, geosDB);

  await sock.sendMessage(from,{
    text:`✅ Trato hecho con ${nombre}. Debes devolver ${cantidad} geos antes de ${new Date(fechaLimite).toLocaleTimeString()}`,
    image:{url: tratosDB.overload?.[nombre]?.imagen || "https://via.placeholder.com/200"}
  });
}
