const messageModel = require("../models/message.model");
const {_sendMessage} = require("../global");
const {fileStorageMiddleware} = require("../helpers/file_helper")
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

  static async saveMessage(obj){
    if(parseInt(obj.sender_id[0]).toString() !== "NaN" || parseInt(obj.receiver_id[0]).toString() !== "NaN"){
      let error = new Error("Invalid data format for sender_id or receiver_id");
      error.code = 400;
      throw error;
    }
    const messagePayload = new messageModel({
      sender_id: obj.sender_id,
      receiver_id: obj.receiver_id,
      message: obj.message,
      message_type: obj.message_type,
      time: new Date()
    });
    const newMessage = await messagePayload.save();
    _sendMessage(newMessage.receiver_id, newMessage);
    return {
      message: "Sent successfully",
      data: messagePayload,
    };
  }

  static async storeMessage(req, res){
    try {
      const response = await MessageController.saveMessage(req.body);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async storeFile(req, res){
    try {
      if(!req.file){
        res.status(400).json({ message: "File is missing!" });
        return;
      }
      console.log(fileStorageMiddleware);
      const docUrl = await fileStorageMiddleware(req, "docs");
      const response = await MessageController.saveMessage({...req.body, "message":req.file["originalname"]+", "+req.file["size"]+", "+docUrl});
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = MessageController;
