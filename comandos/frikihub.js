// comandos/frikihub.js

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
export const command = 'frikihub';

// 🔧 Ejecutar git sin prompts (evita cuelgues por credenciales)
async function runGit(cmd) {
  return execAsync(cmd, {
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    timeout: 120000 // 2 minutos máximo
  });
}

// 🧹 Elimina .git internos (subrepos/submódulos rotos)
function limpiarGitInternos(dir = '.') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      const p = path.join(dir, e.name);
      const git = path.join(p, '.git');
      if (fs.existsSync(git)) {
        fs.rmSync(git, { recursive: true, force: true });
      } else {
        limpiarGitInternos(p);
      }
    }
  }
}

export async function run(
  sock,
  msg,
  args,
  geosDB,
  dropsDB,
  pppTemp,
  helpers,
  { sendSafe }
) {
  const from = msg.key.remoteJid;
  const remitente = helpers.fixId(helpers.getId(msg));

  // 🔒 SOLO OWNERS
  let owners = [];
  try {
    owners = JSON.parse(fs.readFileSync('./owners.json', 'utf-8'))
      .map(o => o.replace('@s.whatsapp.net', '@lid'));
  } catch {
    return sendSafe(sock, from, { text: '❌ Error leyendo owners.json' });
  }

  if (!owners.includes(remitente)) {
    return sendSafe(sock, from, { text: '🚫 Este comando es solo para owners.' });
  }

  if (!args[0] || !args[0].includes('github.com')) {
    return sendSafe(sock, from, {
      text: 'Uso:\n.frikihub https://github.com/usuario/FrikiBot.git'
    });
  }

  const repoUrl = args[0];
  const msgInit = await sendSafe(sock, from, { text: '⏳ Preparando actualización...' });

  try {
    // 🧹 Limpieza crítica
    await sock.editarMensaje(from, msgInit.key, '🧹 Limpiando repos internos...');
    limpiarGitInternos('.');

    // 📝 .gitignore seguro
    fs.writeFileSync('.gitignore', `
session/
session*
node_modules/
.env*
*.log
qr_*.png
owners.json
vip.json
geos.json
drops.json
mutes.json
config.json
banlist.json
`);

    // 🔧 Inicializar git si no existe
    let hasGit = true;
    try {
      await runGit('git status');
    } catch {
      hasGit = false;
    }

    if (!hasGit) {
      await sock.editarMensaje(from, msgInit.key, '🔧 Inicializando Git...');
      await runGit('git init');
      await runGit('git branch -M main');
      await runGit(`git remote add origin ${repoUrl}`);
    } else {
      // Asegurar remote correcto
      try {
        await runGit(`git remote set-url origin ${repoUrl}`);
      } catch {}
    }

    // 🔄 Sincronizar con remoto (update real)
    await sock.editarMensaje(from, msgInit.key, '🔄 Sincronizando con GitHub...');
    try {
      await runGit('git fetch origin');
      await runGit('git pull origin main --allow-unrelated-histories');
    } catch (e) {
      // Si falla por credenciales, avisar claro
      if (String(e.stderr || '').toLowerCase().includes('authentication') ||
          String(e.stderr || '').toLowerCase().includes('permission')) {
        throw new Error(
          'Git requiere credenciales. Abre la terminal y ejecuta:\n' +
          `git pull ${repoUrl}\n` +
          'Ingresa usuario y PEGA TU TOKEN. Luego vuelve a ejecutar .frikihub'
        );
      }
    }

    // 📦 Preparar cambios
    await sock.editarMensaje(from, msgInit.key, '📦 Preparando cambios...');
    await runGit('git add .');

    const { stdout } = await runGit('git status --porcelain');
    if (!stdout.trim()) {
      return sock.editarMensaje(from, msgInit.key, 'ℹ️ No hay cambios nuevos para subir.');
    }

    // 💾 Commit
    const commitMsg = `Update FrikiBot - ${new Date().toLocaleString()}`;
    await runGit(`git commit -m "${commitMsg}"`);

    // 🚀 Push
    await sock.editarMensaje(from, msgInit.key, '🚀 Subiendo cambios...');
    await runGit('git push origin main');

    await sock.editarMensaje(
      from,
      msgInit.key,
      `✅ *REPOSITORIO ACTUALIZADO*

🔗 ${repoUrl.replace('.git', '')}
📝 ${commitMsg}

✔ Código antiguo mantenido
✔ Cambios aplicados`
    );

  } catch (e) {
    await sock.editarMensaje(
      from,
      msgInit.key,
      `❌ *ERROR*\n\n${e.message || e}`
    );
  }
}
