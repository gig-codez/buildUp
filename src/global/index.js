const date = Date.now();
const connWaitingArea = {}; //address: connection
const connAcceptedArea = {}; // userId: {address: connection, address2: connection2}
const addressUserIdMapping = {}; //address: userId
module.exports = {
  date,
  connAcceptedArea,
  connWaitingArea,
  addressUserIdMapping,
};
