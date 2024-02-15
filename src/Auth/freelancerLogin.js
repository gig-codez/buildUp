const freelancerModel = require("../models/freelancer.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

class FreelancerLogin {
  static async loginHelper(req) {
    const freelancer = await freelancerModel.findOne({
      email: req.body.email,
    });
    // console.log(freelancer);
    if (freelancer) {
      let isMatch = bcrypt.compareSync(req.body.password, freelancer.password);
      let token = jwt.sign({ id: freelancer._id }, process.env.SECRET_KEY, {
        expiresIn: "1h",
      });
      if (isMatch) {
        return {
          token: token,
          userId: freelancer._id,
          profession: freelancer.profession,
          image: freelancer.profile_pic,
          first_name: `${freelancer.first_name} ${freelancer.last_name}`,
          email: freelancer.email,
          userData: freelancer,
          role: "contractor",
        };
      } else {
        let error = new Error("Invalid email or password");
        error.code = 401;
        throw error;
      }
    } else {
      let error = new Error("Invalid details");
      error.code = 401;
      throw error;
    }
  }

  static async login(req, res) {
    try {
      let respMessage = await FreelancerLogin.loginHelper(req);
      res.status(200).json(respMessage);
    } catch (error) {
      res
        .status(error.hasOwnProperty("code") ? error.code : 500)
        .json({ message: error.message });
    }
  
  }  
  static async consultantLoginHelper(req){
       const freelancer = await freelancerModel.findOne({
      email: req.body.email,
    });
    // console.log(freelancer);
    if (freelancer) {
      let isMatch = bcrypt.compareSync(req.body.password, freelancer.password);
      let token = jwt.sign({ id: freelancer._id }, process.env.SECRET_KEY, {
        expiresIn: "1h",
      });
      if (isMatch) {
       
        const response = {
          token: token,
          userId: freelancer._id,
          profession: freelancer.profession,
          image: freelancer.profile_pic,
          first_name: `${freelancer.first_name} ${freelancer.last_name}`,
          email: freelancer.email,
          userData: freelancer,
          role: "consultant",
        };
     
        return response;
      } else {
        let error = new Error("Invalid email or password");
        error.code = 401;
        throw error;
      }
    } else {
      let error = new Error("Invalid details");
      error.code = 401;
      throw error;
    }
  }
  static async consultant_login(req, res) {
    try {

      let respMessage = await FreelancerLogin.consultantLoginHelper(req);
      console.log(respMessage)
      if(respMessage){
        res.status(200).json(respMessage);
      } else {
        res
          .status(400)
          .json({ message: "Invalid email or password" });
      }
      res.status(200).json(respMessage);
    } catch (error) {
      res
        .status(error.hasOwnProperty("code") ? error.code : 500)
        .json({ message: error.message });
    }
  }
}
module.exports = FreelancerLogin;
