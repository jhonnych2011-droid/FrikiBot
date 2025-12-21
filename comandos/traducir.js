import translatePkg from '@vitalets/google-translate-api';

const translate = translatePkg.translate || translatePkg;

export const command = 'traducir';
export const alias = ['trad'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  try {
    if (!args.length) {
      return sock.sendMessage(
        from,
        { text: '❌ Usa: .traducir <texto>' },
        { quoted: msg }
      );
    }

    const texto = args.join(' ');
    const res = await translate(texto, { to: 'es' });

    await sock.sendMessage(
      from,
      {
        text:
`🌍 *Traducción*

📝 Original:
${texto}

📘 Español:
${res.text}`
      },
      { quoted: msg }
    );

  } catch (e) {
    console.error('Error traducir:', e);
    await sock.sendMessage(
      from,
      { text: '❌ Error al traducir.' },
      { quoted: msg }
    );
  }
}
