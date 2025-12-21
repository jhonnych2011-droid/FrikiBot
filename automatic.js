const readline = require('readline');

const WEBHOOK_URL = ''; // opcional: poner URL si querés enviar a un webhook
const WEBHOOK_TYPE = ''; // '', 'discord', 'telegram'
const MESSAGE = 'minarclub';
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

let intervalId = null;
let fetcher = null;

// intentar obtener fetch (Node 18+ o node-fetch si está instalado)
(async () => {
  try {
    fetcher = globalThis.fetch || (await import('node-fetch')).default;
  } catch (e) {
    fetcher = null;
  }
})();

async function sendMessage() {
  if (WEBHOOK_URL && fetcher) {
    try {
      let body, headers = { 'Content-Type': 'application/json' };
      if (WEBHOOK_TYPE === 'discord') {
        body = JSON.stringify({ content: MESSAGE });
      } else if (WEBHOOK_TYPE === 'telegram') {
        body = JSON.stringify({ text: MESSAGE });
      } else {
        body = JSON.stringify({ message: MESSAGE });
      }
      await fetcher(WEBHOOK_URL, { method: 'POST', headers, body, timeout: 10000 });
      console.log(new Date().toISOString(), 'Enviado:', MESSAGE);
    } catch (err) {
      console.error(new Date().toISOString(), 'Error enviando webhook:', err.message || err);
    }
  } else {
    console.log(new Date().toISOString(), MESSAGE);
  }
}

function startSending() {
  if (intervalId) {
    console.log('Ya está en ejecución.');
    return;
  }
  sendMessage(); // enviar de inmediato
  intervalId = setInterval(sendMessage, INTERVAL_MS);
  console.log('Inicio activado.');
}

function stopSending() {
  if (!intervalId) {
    console.log('No hay envío activo.');
    return;
  }
  clearInterval(intervalId);
  intervalId = null;
  console.log('Detenido.');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: ''
});

console.log('Comandos: ".minarclub" para iniciar, ".stop" para detener, ".exit" para salir.');
rl.on('line', (line) => {
  const cmd = line.trim();
  if (cmd === '.minarclub') startSending();
  else if (cmd === '.stop') stopSending();
  else if (cmd === '.exit') {
    stopSending();
    rl.close();
    process.exit(0);
  } else if (cmd.length) {
    console.log('Comando no reconocido:', cmd);
  }
});

process.on('SIGINT', () => {
  stopSending();
  process.exit();
});
