import fs from "fs";

const geosPath = "./geos.json";

export function saveGeosDB(geosDB) {
  fs.writeFileSync(geosPath, JSON.stringify(geosDB, null, 2));
}

export function getUser(geosDB, id) {
  if (!geosDB[id]) {
    geosDB[id] = {
      geos: 0,
      lastMinar: 0,
      cooldownRobar: 0,
      lastHourly: 0,
      lastDaily: 0,
      lastWeekly: 0,
      lastMonthly: 0
    };
  }
  return geosDB[id];
}
