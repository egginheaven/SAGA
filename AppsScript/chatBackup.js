// 시트 이름과 셀 위치 정하기 
const TARGET_SHEET_NAME = "채팅로그";
const TARGET_CELL = "A1";

// 글자 수 제한
const CHAR_LIMIT = 45000;

function doPost(e) {
  try {
    // Roll20에서 보낸 데이터 받아오기
    var json = JSON.parse(e.postData.contents);
    
    // 시트 선택
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(TARGET_SHEET_NAME);
    
    // 만약 해당 이름의 시트가 없다면 새로 생성
    if (!sheet) {
      sheet = spreadsheet.insertSheet(TARGET_SHEET_NAME);
    }
    
    var cell = sheet.getRange(TARGET_CELL);

    // 메시지 준비.. HTML 태그 제거!
    var newText = json.content.replace(/<[^>]*>/g, "");
    var message = "[" + json.who + "] " + newText;

    // 기존 셀 내용 가져오기 (셀이 비어있을 경우 빈 문자열로 처리)
    var existingContent = cell.getValue() || "";
    
    var updatedContent;

    // 길이 초과 확인
    if ((existingContent.length + message.length + 1) > CHAR_LIMIT) {
      updatedContent = "---[자동 초기화: 셀 용량 초과]---\n\n" + message;
    } else {
      updatedContent = existingContent ? (existingContent + "\n" + message) : message;
    }

    // 최종 업데이트
    cell.setValue(updatedContent);

    // Roll20에 성공 신호 보내주기
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    // 에러 발생 시 로그 기록 및 에러 메시지 반환
    Logger.log(error.toString());
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}