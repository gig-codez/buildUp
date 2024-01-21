const date = Date.now();
const connWaitingArea = {} //address: connection
const connAcceptedArea = {} // userId: {address: connection, address2: connection2}
const addressUserIdMapping = {} //address: userId

function _sendSuccess(jsonData, connection, responseData){
  connection.sendUTF(JSON.stringify({status: 200, request:jsonData, data: responseData}));
}

function _sendMessage(userId, message){
  if(connAcceptedArea.hasOwnProperty(userId)){
    Object.values(connAcceptedArea[userId]).forEach((connection)=>{
      _sendSuccess({"referrer":"immediateMessage"}, connection, [message]);
    });
  }
}


console.log(date);
module.exports = {
  date, connAcceptedArea, connWaitingArea, addressUserIdMapping, _sendMessage, _sendSuccess
}
