// comandos/menu.js
export const command = "menu";

export async function run(sock, msg) {
  const from = msg.key.remoteJid;

  const imagenURL = "https://i.postimg.cc/hGTdpr6T/14be832d657afd375d61fa8016e937b4-(1).jpg";

  const menuTexto = `
┏━━━━🤓 *『 FrikiBot Menu 』* 🤓━━━━┓

📢 USA .registrar <nombre> PARA TENER UNA CUENTA EXACTA DE PERSONAS DENTRO DEL BOT

📢 Grupo oficial de FrikiBot
https://chat.whatsapp.com/FvmAr3qHTGMKE2C51J3ZEC?mode=wwt

📢 Canal oficial de FrikiBot
https://whatsapp.com/channel/0029VbBKwI71XquRMXqfBD1R

Creador: José/Josexo 🇪🇨

Versión: 1.58 🤓

Repositorio: ??? 

• ¿Quieres ser Sub-Bot de FrikiBot? 
Comandos de Sub-Bot:

▸ .subbot crear <número>
  Crea una nueva sesión
  Ejemplo: .subbot crear 1

▸ .subbot iniciar <número>
  Inicia tu sub-bot y envía QR aquí
  Ejemplo: .subbot iniciar 1

▸ .subbot lista
  Muestra todas las sesiones

▸ .subbot eliminar <número>
  Elimina TU sesión (debe estar detenida)
  Ejemplo: .subbot eliminar 1

• Añadir el bot a tu grupo:

.añadirbot <url de invitación>
> (si no recibe admin en 24h, se sale)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┣━━━━💎 VIP ━━━━┫
.vip 
> Compras vip por 62k de geos

.estatusvip
> Ves el tiempo restante de tu membresía vip

┣━━━━📀 PLAYLIST ━━━━┫
.playlist crear <nombre>
> Crea una playlist

.playlist agregar <nombre> <canción>
> Agrega una canción a tu playlist

.playlist ver <nombre>
> Mira las canciones y peso de tu playlist

.playlist mover <nombre> <de> <a>
> Mueve una canción de un lugar a otro dentro de la playlist

.playlist descargar <nombre>
> Descarga tu playlist con todas tus canciones agregadas

┣━━━━👨🏿‍🌾🇵🇪  PERUANOS ━━━━┫
.peruanos comprar peruano <cantidad>
> Compra peruanos para trabajar

.peruanos comprar agua <cantidad>
> Compra agua para tus peruanos

.peruanos comprar comida <cantidad>
> Compra comida para tus peruanos

.peruanos dar agua
> Dale agua a tus peruanos

.peruanos dar comida
> Dale comida a tus peruanos

.peruanos asignar <area> <cantidad>
> Asigna peruanos a minar, cultivar o pesca

.peruanos dormir <hora>
> Programa hora de dormir para tus peruanos

.peruanos nombrar <id> <nombre>
> Nombra a uno de tus peruanos

.peruanos stats
> Muestra las estadísticas de tus peruanos

.peruanos reclamar <area/todo>
> Reclama recursos de minar, cultivar o pesca
━━━━━━━━━━━━━━━━━━━━━━
┣━━━━🛡️ SISTEMA ANTILINK ━━━━┫
.antilink activar
> Activas el antilink

.antilink desactivar
> Desactivas el antilink

.antilink admin <@usuario | yo>
> Agrega un admin para recibir avisos cuando manden un link

.antilink quitaradmin <@usuario | yo>
> Quita a un admin del sistema antilink

.antilink veradmins
> Muestra la lista de admins del antilink

.antilink estado
> Muestra si el antilink está activado o desactivado

┣━━━━🗣️ ADMINISTRACIÓN ━━━━┫
.warn @usuario
> Da una advertencia al usuario mencionado

.warn lista
> Muestra la lista de advertencias

.warn unwarn @usuario
> Quita una advertencia (3 warns = baneo)

┣━━━━🗣️ GRUPOS ━━━━┫
.setdesc <nueva descripción>
> Cambia la descripción del grupo

.kick @usuario
> Expulsa al usuario mencionado

.grupo cerrar
> Solo admins pueden escribir

.grupo abrir
> Abre el grupo a todos

.admin quitar @usuario
> Quita admin al usuario

.admin poner @usuario
> Asigna admin

┣━━━━👹 BOSS (evento) ━━━━┫
.boss
> Muestra el boss actual

.atacar
> Atacas al boss con los demás usuarios

.aguijon
> Muestra los requisitos para mejorar aguijón

.mejorar aguijon
> Mejora tu aguijón

┣━━━━🎄 NAVIDAD ━━━━┫
.regalo
> Recibe tu regalo global

.calendario <día>
> Reclama el calendario de adviento

.recibir
> Recibe recompensas del drop navideño

┣━━━━🪙 BTC/CRIPTO ━━━━┫
.shopbtc
> Muestra las criptomonedas

.comprarbtc <nombre>
> Compra una criptomoneda

.misbtc
> Muestra tus criptos

.historialbtc <nombre>
> Muestra su evolución

┣━━━━🔞 +18 ━━━━┫
.hornet
> Imagen +18

.videox
> Video random +18

.waifux
> Waifu H aleatoria

┣━━━━🔞 ANTI +18 (admins) ━━━━┫
.desactivar+18
> Desactiva contenido +18

.activar+18
> Activa contenido +18

┣━━━━🎮 MENÚ RPG ━━━━┫
.asignarperfil <respondiendo una foto>
> Después de esto cada que escribas .perfil sale la foto 

.robar <@usuario>
> Robas a otro usuario

.minar
> Minar geos cada 5 min

.perfil
> Tu perfil RPG

┣━━━━🎰 APUESTA (evento) ━━━━┫
.ruleta <cantidad/todo> <apuesta>
> Rojo/negro/par/impar/0-36

.apostar <cantidad/todo> <bajo | medio | alto>
> Apuesta por rangos

┣━━━━🏰 CLUBS (obsoleto) ━━━━┫
.crear <nombre>
> Crea club

.unirclub <nombre>
> Unirse a un club

.salir
> Salir del club

.borrar
> Borrar club si eres dueño

.lista
> Ver clubs

.top
> Clubs con más geos

.mi club
> Info del club

.minarclub
> Minar geos para tu club

.robarclub <club>
> Roba geos al rival

.cambiar <nuevo nombre>
> Cambia nombre (1k geos)

┣━━━━📆 RECOMPENSAS ━━━━┫
.hourly
> Cada hora

.daily
> Diaria

.weekly
> Semanal

.monthly
> Mensual

┣━━━━🔧 ÚTILES ━━━━┫
.traducir <texto>
> Traduce automáticamente el texto dependiente el idioma (se elige automáticamente) 

.hidetag <mensaje>
> Menciona a todos sin sus @

.hola
> Saludo

.osi
> El bot dice "ono"

.id
> Muestra tu LID

.registrar <nombre>
> Registrar usuario

.ping
> Latencia

.registros
> Usuarios registrados

.s
> Imagen → sticker

.toimg
> Sticker → imagen

┣━━━━👤 PERSONAJE ━━━━┫
.psfav <nombre>
> Personaje favorito

.comprar <nombre>
> Compra personaje

.inventario
> Tus personajes

.personajes
> Lista de personajes

.vender <nombre>
> Vender personaje

┣━━━━🎧 AUDIO/VIDEO/FOTO ━━━━┫
.ig <url>
> Manda el video de ig sin marca de agua

.imgtiktok <url> <número de imagen>
> Envia la imagen del url sin marca de agua

.ver
> Reenvía video

.foto
> Reenvía foto

.tiktok <url>
> Descarga sin marca

.video <nombre> o <url>
> Descarga video por nombre o URL

.musica <nombre>
> Envía mp3

.waifu
> Waifu aleatoria

┣━━━━🧑🏿‍💻 OWNERS ━━━━┫
.mute <@usuario>
> Silenciar usuario

.unmute <@usuario>
> Quitar mute

.agregar <nombre> <precio> <calidad> <stock> <multiplicador> <limite>
> Agregar personaje

.eliminar <nombre>
> Eliminar personaje

.lanzar <geos> <%> <personajes> <%>
> Lanza geos/personajes

.total comandos
> Total de comandos

.registros
> Usuarios registrados

.grupostotal
> Total de grupos del bot

┣━━━━💀 COMANDOS PARA VIOLAR ━━━━┫
.ruletarusa
.nuke

┗━━━━━━━━━━━━━━━━━━━━┛
`;

  await sock.sendMessage(from, {
    image: { url: imagenURL },
    caption: menuTexto
  }, { quoted: msg });
}

