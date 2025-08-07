function onFormSubmit(e) {
  // --- Configuration ---
  const SLIPOK_API_KEY = ""; // ⚠️ Replace with your SlipOk API Key
  const SLIPOK_BRANCH_ID = ""; // ⚠️ Replace with your SlipOk Branch ID
  const SHEET_NAME = "Form Responses 1"; // ⚠️ Replace with the name of your response sheet
  const IMAGE_QUESTION_TITLE = "Please upload your receipt here. Thank you!"; // ⚠️ Replace with the exact title of your file upload question in Google Forms
  const STATUS_COLUMN_NAME = "Auto Slip Verification Status"; // ⚠️ Replace with the name of the column for the verification status
  const DETAILS_COLUMN_NAME = "Auto Slip Verification Details"; // ⚠️ Replace with the name of the column for verification details
  // --------------------

  const formResponse = e.namedValues;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowIndex = e.range.getRow();

  const imageFileId = formResponse[IMAGE_QUESTION_TITLE][0];
  const imageFile = DriveApp.getFileById(imageFileId.split("=")[1]);
  const imageBlob = imageFile.getBlob();

  const apiUrl = `https://api.slipok.com/api/line/apikey/${SLIPOK_BRANCH_ID}`;

  const options = {
    method: "post",
    headers: {
      "x-authorization": SLIPOK_API_KEY,
    },
    payload: {
      files: imageBlob,
      log: true // Optional: Set to true to store transaction logs in SlipOk
    },
    muteHttpExceptions: true // Prevents script from stopping on API errors
  };

  try {
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseData = JSON.parse(response.getContentText());

    const statusColumnIndex = headers.indexOf(STATUS_COLUMN_NAME) + 1;
    const detailsColumnIndex = headers.indexOf(DETAILS_COLUMN_NAME) + 1;

    if (responseData.success) {
      const slipData = responseData.data;
      if (slipData.success) {
        sheet.getRange(rowIndex, statusColumnIndex).setValue("✅ Verified");
        sheet.getRange(rowIndex, detailsColumnIndex).setValue(
          `Amount: ${slipData.amount}\n` +
          `Sender: ${slipData.sender.name}\n` +
          `Receiver: ${slipData.receiver.name}\n` +
          `Transaction Date: ${slipData.transDate}`
        );
      } else {
        sheet.getRange(rowIndex, statusColumnIndex).setValue("❌ Verification Failed");
        sheet.getRange(rowIndex, detailsColumnIndex).setValue(slipData.message);
      }
    } else {
      sheet.getRange(rowIndex, statusColumnIndex).setValue("API Error");
      sheet.getRange(rowIndex, detailsColumnIndex).setValue(responseData.message);
    }
  } catch (error) {
    Logger.log(error.toString());
    const statusColumnIndex = headers.indexOf(STATUS_COLUMN_NAME) + 1;
    sheet.getRange(rowIndex, statusColumnIndex).setValue("Script Error");
    sheet.getRange(rowIndex, headers.indexOf(DETAILS_COLUMN_NAME) + 1).setValue(error.toString());
  }
}
