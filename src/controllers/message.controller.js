const messageModel = require("../models/message.model");
const {_sendMessage} = require("../global");
class MessageController {
  static async getAll(req, res) {
    try {
      let messages = await messageModel.find();
      res.status(200).json({ data: messages });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static columns = {sender_id: 1, receiver_id: 1, message: 1, message_type:1, time: 1, seen: 1};

  static paginateMessages(roleUserId, page, limitPerPage){
    return messageModel.find({$or:[{sender_id: roleUserId}, {receiver_id: roleUserId}]},
        MessageController.columns).limit(limitPerPage).skip(((page-1)*limitPerPage)).sort({_id:1});
  }

  static getUserMsgGreaterById(roleUserId, messageId){
    if(messageId.length===0){
      return messageModel.find({$or:[{sender_id: roleUserId}, {receiver_id: roleUserId}]},
          MessageController.columns).sort({_id:1});
    }
      return messageModel.find({$and: [{_id: {$gt: messageId}}, {$or: [{sender_id: roleUserId}, {receiver_id: roleUserId}]}]},
          MessageController.columns).sort({_id:1});
  }

  static async getUserMsgGreaterByIdReq(req, res){
    try {
      const messageId = req.params.id;
      const roleUserId = req.params.role_user_id;

      const messages = await MessageController.getUserMsgGreaterById(roleUserId, messageId);
      res.status(200).json({ data: messages});
    } catch (error) {
      res.status(error.code??500).json({ message: error.message });
    }
  }

  static async getUserMessages(req, res){
    try {
      const limitPerPage = Number(req.params.limitPerPage);
      const page = Number(req.params.page);
      const roleUserId = req.params.role_user_id;

      const messages = await MessageController.paginateMessages(roleUserId, page, limitPerPage);
      // for(let msg of messages){
      //   await MessageController.updateSeen([msg["_id"].toString()],"");
        // await messageModel.deleteOne({_id: msg["_id"]})
      // }

      res.status(200).json({ data: messages, paginationDetails:  {limitPerPage, page, roleUserId}});
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async updateSeen(messageIds){
    await messageModel.updateMany({_id: {$in: messageIds}}, {$set:{seen:true}});
  }

  static async storeMessage(req, res){
    try {
      if(parseInt(req.body.sender_id[0]).toString() !== "NaN" || parseInt(req.body.receiver_id[0]).toString() !== "NaN"){
        res.status(400).json({ message: "Invalid data format for sender_id or receiver_id" });
        return;
      }
      const messagePayload = new messageModel({
        sender_id: req.body.sender_id,
        receiver_id: req.body.receiver_id,
        message: req.body.message,
        message_type: req.body.message_type,
        time: new Date()
      });
      const newMessage = await messagePayload.save();

      _sendMessage(newMessage.receiver_id, newMessage)

      res.status(200).json({
        message: "Sent successfully",
        data: messagePayload,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = MessageController;
