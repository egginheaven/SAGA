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

    // 구글 웹 앱 URL
    var requestOptions = {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify(payload)
    };

    // 여기에 웹 앱 URL 입력
    var googleWebAppUrl = 'https://script.google.com/macros/s/AKfycby0WMxAesOUN_a_j4GOXLtHtQMvuo3j83HEuEfoSbNmpgA4gs2OtpbFxAvFIl8DRVIX/exec';

    fetch(googleWebAppUrl, requestOptions);
});