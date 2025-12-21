import fs from "fs";

export const command = "añadir";

const DB_PATH = './tratos.json';

function cargarDB() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({usuarios:{}, overload:{}}, null,2));
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function guardarDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null,2));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = (msg.key.participant || from).split("@")[0];

  if(args[0] !== "overload") return;

  const owners = JSON.parse(fs.readFileSync('./owners.json', 'utf-8')).map(o => o.split("@")[0]);
  if(!owners.includes(sender)) return sock.sendMessage(from,{text:"❌ Solo owners"});

  const nombre = args[1];
  const tiempo = parseInt(args[2]);
  const url = args[3];

  if(!nombre || isNaN(tiempo) || !url) return sock.sendMessage(from,{text:"❌ Uso: .añadir overload <nombre> <tiempo en min> <url>"});

  const db = cargarDB();
  db.overload[nombre] = {tiempoLimite: tiempo, imagen: url};
  guardarDB(db);

  sock.sendMessage(from,{text:`✅ Overload ${nombre} añadido con tiempo límite de ${tiempo} minutos.`});
}
