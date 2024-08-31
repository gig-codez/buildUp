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
            const { email, password } = req.body;
            // check if user is a freelancer
            const freelancer = await freelancerModel.findOne({
                email: email,
                active: true,
            });
            if (freelancer) {
                if (freelancer.role === "66cee9726365fb4237b73425") {
                    let respMessage = await FreelancerLogin.loginHelper(req);
                    res.status(200).json(respMessage);
                } else {
                    let respMessage = await FreelancerLogin.consultantLoginHelper(req);
                    res.status(200).json(respMessage);
                }
            }
            // check if user is an employer
            const employer = await employerModel.findOne({
                email_address: email,
                active: true,
            });
            if (employer) {
                let respMessage = await EmployerLogin.loginHelper(req);
                res.status(200).json(respMessage);
            }
            // check if user is a supplier
            const supplier = await supplierModel.findOne({
                business_email_address: email,
                active: true,
            });
            if (supplier) {
                console.log(supplier);
                const supplierData = await SupplierLogin.loginHelper(req, res);
                res.status(200).json(supplierData);
            }
            res.status(401).json({ message: "Invalid details" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}