import fs from "fs";
export const command = "salir";
const clubFile = "./clubs.json";

function fixID(jid) {
  return jid.replace(/@.+$/, "@lid");
}

function cargarClubs() {
  if (!fs.existsSync(clubFile)) return {};
  return JSON.parse(fs.readFileSync(clubFile, "utf8"));
}

function guardarClubs(data) {
  fs.writeFileSync(clubFile, JSON.stringify(data, null, 2));
}

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = fixID(msg.key.participant || msg.key.remoteJid);

  const clubs = cargarClubs();

  let encontrado = false;
  for (let c in clubs) {
    if (clubs[c].miembros.includes(sender)) {
      // Eliminar miembro
      clubs[c].miembros = clubs[c].miembros.filter(m => m !== sender);

      // Si era dueño, borrar club
      if (clubs[c].dueño === sender) {
        delete clubs[c];
        guardarClubs(clubs);
        return sock.sendMessage(from, { text: `❌ Has salido y el club *${c}* se ha eliminado porque eras dueño.` });
      }

      guardarClubs(clubs);
      encontrado = true;
      return sock.sendMessage(from, { text: `✅ Has salido del club *${c}*.` });
    }
  }

  if (!encontrado) sock.sendMessage(from, { text: "❌ No perteneces a ningún club." });
}
