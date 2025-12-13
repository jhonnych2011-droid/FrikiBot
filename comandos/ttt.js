// Archivo: comandos/tresenraya.js o comandos/ttt.js

export const command = "tresenraya";
export const aliases = ["ttt", "3enraya"];

const activeGames = new Map();

function createBoard(board) {
    const symbols = { X: '❌', O: '⭕' };
    let display = '🎮 *TRES EN RAYA* 🎮\n\n';
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const pos = i * 3 + j;
            if (board[pos]) {
                display += symbols[board[pos]];
            } else {
                display += `${pos + 1}️⃣`;
            }
            display += ' ';
        }
        display += '\n';
    }
    return display;
}

function checkWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (let line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    
    if (board.every(cell => cell !== null)) return 'empate';
    return null;
}

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const senderId = msg.key.participant || msg.key.remoteJid;
    
    // Si no hay argumentos, mostrar ayuda
    if (args.length === 0) {
        return sock.sendMessage(from, {
            text: '❌ Debes mencionar a un oponente o hacer una jugada.\n\n' +
                  '*Iniciar juego:* .ttt @usuario\n' +
                  '*Hacer jugada:* .ttt [1-9]'
        });
    }
    
    // Iniciar juego si menciona a alguien
    if (args[0].includes('@') || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        
        if (!mentioned || mentioned.length === 0) {
            return sock.sendMessage(from, {
                text: '❌ Debes mencionar a un oponente.\n\n*Uso:* .ttt @usuario'
            });
        }
        
        const player2 = mentioned[0];
        
        if (player2 === senderId) {
            return sock.sendMessage(from, {
                text: '❌ No puedes jugar contra ti mismo.'
            });
        }
        
        // Crear juego
        activeGames.set(from, {
            board: Array(9).fill(null),
            currentPlayer: senderId,
            player1: senderId,
            player2: player2,
            symbol: { [senderId]: 'X', [player2]: 'O' }
        });
        
        const board = createBoard(activeGames.get(from).board);
        
        return sock.sendMessage(from, {
            text: `${board}\n\n` +
                  `🎯 Jugador 1: ❌\n` +
                  `🎯 Jugador 2: ⭕\n\n` +
                  `Turno de: ❌\n\n` +
                  `_Escribe .ttt [número] para jugar_\n` +
                  `Ejemplo: .ttt 5`
        });
    }
    
    // Hacer jugada
    const game = activeGames.get(from);
    
    if (!game) {
        return sock.sendMessage(from, {
            text: '❌ No hay ningún juego activo.\n\nInicia uno con: *.ttt @usuario*'
        });
    }
    
    // Verificar turno
    if (senderId !== game.currentPlayer) {
        return sock.sendMessage(from, {
            text: '⏳ No es tu turno.'
        });
    }
    
    // Validar posición
    const position = parseInt(args[0]) - 1;
    
    if (isNaN(position) || position < 0 || position > 8) {
        return sock.sendMessage(from, {
            text: '❌ Posición inválida. Usa números del 1 al 9.\n\nEjemplo: .ttt 5'
        });
    }
    
    if (game.board[position] !== null) {
        return sock.sendMessage(from, {
            text: '❌ Esa casilla ya está ocupada.'
        });
    }
    
    // Hacer jugada
    game.board[position] = game.symbol[senderId];
    
    // Verificar ganador
    const winner = checkWinner(game.board);
    const board = createBoard(game.board);
    
    if (winner) {
        activeGames.delete(from);
        
        if (winner === 'empate') {
            return sock.sendMessage(from, {
                text: `${board}\n\n🤝 *¡EMPATE!*\n\nNingún jugador ganó.`
            });
        }
        
        return sock.sendMessage(from, {
            text: `${board}\n\n🎉 *¡${winner === 'X' ? 'JUGADOR 1' : 'JUGADOR 2'} GANA!*\n\n` +
                  `${winner === 'X' ? '❌' : '⭕'} es el ganador.`
        });
    }
    
    // Cambiar turno
    game.currentPlayer = game.currentPlayer === game.player1 ? game.player2 : game.player1;
    const currentSymbol = game.symbol[game.currentPlayer];
    
    return sock.sendMessage(from, {
        text: `${board}\n\n` +
              `Turno de: ${currentSymbol === 'X' ? '❌' : '⭕'}\n\n` +
              `_Escribe .ttt [número] para jugar_`
    });
}

/* 
✅ ADAPTADO A TU ESTRUCTURA

COMANDOS:
- .ttt @usuario     → Iniciar juego
- .tresenraya @user → Iniciar juego
- .ttt 5            → Hacer jugada en posición 5

TABLERO:
1️⃣ 2️⃣ 3️⃣
4️⃣ 5️⃣ 6️⃣
7️⃣ 8️⃣ 9️⃣
*/
