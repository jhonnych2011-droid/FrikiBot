/**
 * SISTEMA DE AVENTURA AVANZADO
 * Clases únicas – Stats – XP – Energía – Inventario dinámico
 * Misiones – Exploración con eventos – Boss PvE
 */

import fs from "fs";
import path from "path";

const FILE = "./bot/data/aventura.json";

// =========================
// Base de datos
// =========================
function loadDB() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "{}");
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function saveDB(db) {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

// =========================
// Crear perfil inicial
// =========================
function crearPerfil(id, db) {
  db[id] = {
    clase: "ninguna",
    nivel: 1,
    xp: 0,
    energia: 100,
    monedas: 0,
    fuerza: 10,
    magia: 5,
    defensa: 5,
    velocidad: 5,
    inventario: [],
    cooldown: 0,
    boss: { hp: 0, activo: false },
  };
  saveDB(db);
}

// =========================
// Funciones auxiliares
// =========================
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function eventoExploracion(user) {
  const eventos = [
    "enemigo",
    "tesoro",
    "trampa",
    "mercader",
  ];
  return eventos[rand(0, eventos.length - 1)];
}

function enemigoAleatorio() {
  return [
    { nombre: "Slime", hp: 50, daño: 10 },
    { nombre: "Goblin", hp: 80, daño: 15 },
    { nombre: "Bandido", hp: 100, daño: 20 },
    { nombre: "Lobo", hp: 120, daño: 25 },
  ][rand(0, 3)];
}

function itemAleatorio() {
  return [
    { nombre: "Poción de Vida", tipo: "consumible", efecto: 50 },
    { nombre: "Amuleto Mágico", tipo: "equipo", fuerza: 5 },
    { nombre: "Espada Rúnica", tipo: "equipo", fuerza: 10 },
    { nombre: "Arco Épico", tipo: "equipo", fuerza: 8 },
  ][rand(0, 3)];
}

// =========================
// Comando principal
// =========================
export const command = "aventura";

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const id = msg.key.participant || msg.key.remoteJid;

  let db = loadDB();
  if (!db[id]) crearPerfil(id, db);
  const user = db[id];
  const sub = args[0];

  // =========================
  // Menú
  // =========================
  if (!sub) {
    return sock.sendMessage(from, {
      text: `🎮 *Aventura RPG* – Menú Principal
Elige una opción:
• .aventura clase <guerrero|mago|arquero>
• .aventura explorar
• .aventura inventario
• .aventura mision
• .aventura boss
• .aventura perfil`
    });
  }

  // =========================
  // Elegir clase
  // =========================
  if (sub === "clase") {
    const clase = args[1];
    const clasesValidas = ["guerrero", "mago", "arquero"];

    if (!clase) return sock.sendMessage(from, { text: `⚔️ Elige tu clase:\n- guerrero\n- mago\n- arquero\nEjemplo: .aventura clase guerrero` });
    if (!clasesValidas.includes(clase)) return sock.sendMessage(from, { text: "❌ Clase no válida." });

    user.clase = clase;

    // Ajustar stats según clase
    if (clase === "guerrero") { user.fuerza += 10; user.defensa += 5; }
    if (clase === "mago") { user.magia += 10; user.velocidad += 3; }
    if (clase === "arquero") { user.velocidad += 10; user.fuerza += 5; }

    saveDB(db);
    return sock.sendMessage(from, { text: `✅ Ahora eres un **${clase}** con habilidades únicas.` });
  }

  // =========================
  // Explorar
  // =========================
  if (sub === "explorar") {
    const tiempo = Date.now();
    if (user.cooldown > tiempo) {
      const espera = ((user.cooldown - tiempo) / 1000).toFixed(1);
      return sock.sendMessage(from, { text: `⏳ Debes esperar ${espera}s antes de explorar de nuevo.` });
    }
    if (user.energia < 20) return sock.sendMessage(from, { text: "⚡ No tienes suficiente energía (mínimo 20)." });

    user.energia -= 20;
    user.cooldown = tiempo + 10000; // 10 segundos

    const evento = eventoExploracion(user);
    let texto = "";

    switch(evento) {
      case "enemigo":
        const enemigo = enemigoAleatorio();
        const dmg = rand(10, 30) + user.fuerza;
        const xp = rand(15, 35);
        const monedas = rand(10, 25);

        user.xp += xp;
        user.monedas += monedas;

        texto = `🗡️ Exploraste y encontraste un **${enemigo.nombre}**.\nInfligiste ${dmg} de daño.\n✨ Ganaste XP: +${xp}\n💰 Monedas: +${monedas}\n⚡ Energía restante: ${user.energia}`;
        break;

      case "tesoro":
        const tesoro = itemAleatorio();
        user.inventario.push(tesoro.nombre);
        texto = `💎 Encontraste un tesoro: **${tesoro.nombre}** y lo agregaste a tu inventario.\n⚡ Energía restante: ${user.energia}`;
        break;

      case "trampa":
        const daño = rand(10, 25);
        user.energia -= daño;
        texto = `⚠️ Caíste en una trampa y perdiste ${daño} de energía.\n⚡ Energía restante: ${user.energia}`;
        break;

      case "mercader":
        const dinero = rand(20, 50);
        user.monedas += dinero;
        texto = `🛒 Encontraste un mercader y vendiste objetos antiguos.\n💰 Ganaste: +${dinero} monedas.\n⚡ Energía restante: ${user.energia}`;
        break;
    }

    // Subir nivel si XP suficiente
    const req = user.nivel * 100;
    if (user.xp >= req) {
      user.nivel++;
      user.xp -= req;
      texto += `\n🎉 ¡Subiste al nivel ${user.nivel}!`;
    }

    saveDB(db);
    return sock.sendMessage(from, { text: texto });
  }

  // =========================
  // Inventario
  // =========================
  if (sub === "inventario") {
    if (user.inventario.length === 0) return sock.sendMessage(from, { text: "🎒 Tu inventario está vacío." });
    return sock.sendMessage(from, { text: `🎒 *Inventario:*\n${user.inventario.map(i => `• ${i}`).join("\n")}` });
  }

  // =========================
  // Misión diaria
  // =========================
  if (sub === "mision") {
    const xp = rand(30, 60);
    const monedas = rand(20, 40);
    const item = itemAleatorio().nombre;

    user.xp += xp;
    user.monedas += monedas;
    user.inventario.push(item);

    saveDB(db);

    return sock.sendMessage(from, {
      text: `📘 *Misión completada*\nGanaste:\n✨ XP: +${xp}\n💰 Monedas: +${monedas}\n🎁 Objeto: ${item}`
    });
  }

  // =========================
  // Boss
  // =========================
  if (sub === "boss") {
    if (!user.boss.activo) {
      user.boss = { hp: 500, activo: true };
      saveDB(db);
      return sock.sendMessage(from, { text: "👹 Un **Boss apareció** con 500 de vida!" });
    }

    const dmg = rand(20, 50) + user.fuerza;
    user.boss.hp -= dmg;

    if (user.boss.hp <= 0) {
      const recompensa = rand(150, 300);
      user.monedas += recompensa;
      user.boss = { hp: 0, activo: false };
      saveDB(db);
      return sock.sendMessage(from, { text: `🔥 ¡Derrotaste al Boss!\nRecompensa: 💰 +${recompensa} monedas.` });
    }

    saveDB(db);
    return sock.sendMessage(from, { text: `⚔️ Atacaste al Boss.\nDaño infligido: ${dmg}\nVida restante del Boss: ${user.boss.hp}` });
  }

  // =========================
  // Perfil
  // =========================
  if (sub === "perfil") {
    return sock.sendMessage(from, {
      text:
`📜 *Perfil de Aventurero*
Clase: ${user.clase}
Nivel: ${user.nivel}
XP: ${user.xp}
Energía: ${user.energia}
Fuerza: ${user.fuerza}
Magia: ${user.magia}
Defensa: ${user.defensa}
Velocidad: ${user.velocidad}
Monedas: ${user.monedas}`
    });
  }

  return sock.sendMessage(from, { text: "❌ Subcomando no válido." });
}
