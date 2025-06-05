// PlayerIDs
// 현재 게임에 있는 모든 플레이어의 playerid 오브젝트를 반환. 
on('ready', () => {
    log('PlayerIDs Script Ready. Type !listplayers (GM only).');

    on('chat:message', (msg) => {
        if (msg.type === 'api' && msg.content.toLowerCase() === '!listplayers') {
            // GM만 사용가능 
            if (!playerIsGM(msg.playerid)) {
                sendChat('ListPlayers', `/w "${msg.who}" GM만 사용할 수 있는 명령어입니다.`);
                return;
            }

            const players = findObjs({ _type: "player" });
            let playerListMessage = "<strong>Player List (Name - ID):</strong><br>";

            if (players.length > 0) {
                players.forEach(player => {
                    let playerName = player.get('_displayname');
                    let playerID = player.id;
                    playerListMessage += `${playerName} - ${playerID}<br>`;
                });
            } else {
                playerListMessage += "No players found in this game (this shouldn't happen if you are here!).<br>";
            }

            sendChat('System', `/w gm <div style="border:1px solid black; background-color: #f0f0f0; padding:5px;">${playerListMessage}</div>`);
        }
    });
});