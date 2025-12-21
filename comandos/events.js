// events.js
import fs from "fs";

const FILE = "./events.json";

export function loadEvents() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "{}");
  return JSON.parse(fs.readFileSync(FILE));
}

export function saveEvents(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}
