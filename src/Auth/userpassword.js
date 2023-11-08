const freelancerModel = require("../models/freelancer.model");
const SupplierModel = require("../models/Supplier.model");
const EmployerModel = require("../models/Employer.model");
const crypto = require("crypto");

class Password {
  static async forgotPassword(req, res) {
    const { email, business_email_address, email_address } = req.body;
    try {
      //am getting the user based ion email
      const checkUserPresent = await freelancerModel.findOne({ email });
      const checkSupplier = await SupplierModel.findOne({
        business_email_address,
      });
      const checkEmployer = await EmployerModel.findOne({ email_address });

      if (!checkEmployer) {
        res.status(400).json({ message: "wrong  email" });
      }

      //am checking if the email passedin exists
      //   if (!checkUserPresent || !checkSupplier || !checkEmployer) {
      //     return res.status(401).json({
      //       success: false,
      //       message: "Couldnt find the user with given email..!",
      //     });
      //   }
      //lets generate the the token using crypto w/c isin built
      const resetToken = checkEmployer.createResetPasswordToken();
      await checkEmployer.save({ validateBeforeSave: false });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async resetPassword(res, req) {}
}
module.exports = Password;
