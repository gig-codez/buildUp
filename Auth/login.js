var freelancerModel = require("../models/freelancer.model");
var FreelancerLogin = require("./freelancerLogin");
var employerModel = require("../models/employer.model");
var EmployerLogin = require("./employerlogin");
var supplierModel = require("../models/supplier.model");
var SupplierLogin = require("./supplierlogin");

module.exports = class LoginController {
    // function to check which user to login
    static async loginUser(req, res) {
        try {
            const { email } = req.body;

            // check if user is a freelancer
            const freelancer = await freelancerModel.findOne({
                email: email,
                active: true,
            });
            if (freelancer) {
                let respMessage;
                if (freelancer.role === "6970599784638dd58abdb554") {
                    respMessage = await FreelancerLogin.loginHelper(req);
                } else {
                    respMessage = await FreelancerLogin.consultantLoginHelper(req);
                }
                return res.status(200).json(respMessage);  // Return after sending response
            }

            // check if user is an employer
            const employer = await employerModel.findOne({
                email_address: email,
                active: true,
            });
            if (employer) {
                let respMessage = await EmployerLogin.loginHelper(req);
                return res.status(200).json(respMessage);  // Return after sending response
            }

            // check if user is a supplier
            const supplier = await supplierModel.findOne({
                business_email_address: email,
                active: true,
            });
            if (supplier) {
                const supplierData = await SupplierLogin.loginHelper(req, res);
                return res.status(200).json(supplierData);  // Return after sending response
            }
            return res.status(401).json({ message: "Invalid details" });  // Return after sending response
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: error.message });  // Return after sending response
        }
    }
}