on('ready', function() {

    setTimeout(function() {
        log('>>> Google Sheets Logger 준비 완료! 채팅 메시지를 기다리는 중...');

        // 채팅 메시지가 발생할 때마다 실행되는 이벤트 핸들러
        on('chat:message', function(msg) {
            // API 자신이 보낸 메시지나 GM에게만 보내는 디버그 메시지는 무시
            if (msg.playerid === 'API' || msg.target === 'gm') {
                return;
            }

            // 객체생성
            var payload = {
                who: msg.who,          // 이름
                content: msg.content,  // 채팅 내용
                type: msg.type         // 메시지 타입 (일반, 귓속말, 주사위 등)
            };

            // 여기에 웹 앱 URL 입력
            var googleWebAppUrl = 'https://script.google.com/macros/s/AKfycby0WMxAesOUN_a_j4GOXLtHtQMvuo3j83HEuEfoSbNmpgA4gs2OtpbFxAvFIl8DRVIX/exec';

            sendRequest(googleWebAppUrl, 
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                },
                function (response) {
                    log('구글 시트 응답: ' + response.body);
                }
            );
        });
    }, 2000);
});