const {connWaitingArea, addressUserIdMapping, connAcceptedArea, _sendMessage, _sendSuccess} = require("../../src/global");
const userController = require("../controllers/user.controller")
const MessageController = require("../controllers/message.controller");
function init(jsonData, connection) {
  let remAddress = connection.remoteAddress.toString();
  delete connWaitingArea[remAddress];//
  const userId = jsonData.data.userId;
  addressUserIdMapping[remAddress] = userId;
  if (connAcceptedArea.hasOwnProperty(userId)) {
    connAcceptedArea[userId][remAddress] = connection;
  } else {
    connAcceptedArea[userId] = {[remAddress]: connection}
  }

  _sendSuccess(jsonData, connection, "registered")
  MessageController.getUserMsgGreaterById(userId, jsonData.data.lastMessageId).then((messages)=>{
    _sendSuccess({...jsonData, referrer:"immediateMessage"}, connection, messages)
  });
}

function searchUserByEmail(jsonData, connection){
  userController.searchUserByEmail(jsonData.data).then((users)=>{
    _sendSuccess(jsonData, connection, users)
  });
}

module.exports = {
  init, searchUserByEmail
}
