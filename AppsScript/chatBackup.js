// 기록할 셀 위치 지정
const TARGET_CELL = "A1";

// 글자 수 제한 (셀당 5만자랬음)
const CHAR_LIMIT = 45000;

function doPost(e) {
  try {
    // Roll20에서 보낸 데이터를 받아오기 
    var json = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var cell = sheet.getRange(TARGET_CELL);

    // 2. 메시지 준비 (HTML태그는 제거함)
    var newText = json.content.replace(/<[^>]*>/g, "");
    var message = "[" + json.who + "] " + newText;

    // 3. 지금 셀에 있는 내용 가져오기 
    var existingContent = cell.getValue();
    
    var updatedContent;

    // 4. 길이 초과 확인 
    if ((existingContent.length + message.length + 1) > CHAR_LIMIT) {
      updatedContent = "---[자동 초기화: 셀 용량 초과]---\n\n" + message;
    } else {
      updatedContent = existingContent ? (existingContent + "\n" + message) : message;
    }

    // 5. 최종 업데이트 
    cell.setValue(updatedContent);

    // Roll20에 성공 신호 보내주기 
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    // 에러 발생 시!! 
    Logger.log(error.toString());
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}