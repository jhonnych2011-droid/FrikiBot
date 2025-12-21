import fs from "fs";

export function bloquear18(groupId, comando) {
  const grupos = JSON.parse(fs.readFileSync("./+18grupos.json", "utf8"));
  const config = JSON.parse(fs.readFileSync("./config+18.json", "utf8")).lista;

  if (!config.includes(comando)) return false; // No es comando +18
  return grupos[groupId] === true; // Si está desactivado → bloquear
}
