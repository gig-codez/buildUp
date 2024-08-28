const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const employerModel = require('../models/employer.model');
const freelancerModel = require('../models/freelancer.model');
const supplierModel = require('../models/supplier.model');
const LoginController = require('../Auth/login');
require("dotenv").config();
const secret = process.env.JWT_SECRET_KEY; // Replace with your actual secret key
const app = express.Router();


app.get('/verify-email/:token/:user', async (req, res) => {
    const { token, user } = req.params;
    console.log(user);

    try {
        // Check for employer
        const client = await employerModel.findById(user);
        if (client) {
            jwt.verify(token, secret, async (err, decoded) => {
                if (err) {
                    return res.render("verification-error", { message: err.message });
                }
                client.emailVerified = true;
                await client.save();
                return res.render("verification-success", { message: "Email verified successfully" });
            });
            return; // Exit the function here to prevent further execution
        }

        // Check for freelancer
        const freelancer = await freelancerModel.findOne({ _id: user });
        if (freelancer) {
            jwt.verify(token, secret, async (err, decoded) => {
                if (err) {
                    return res.render("verification-error", { message: err.message });
                }
                freelancer.emailVerified = true;
                await freelancer.save();
                return res.render("verification-success", { message: "Email verified successfully" });
            });
            return;
        }

        // Check for supplier
        const supplier = await supplierModel.findOne({ _id: user });
        if (supplier) {
            jwt.verify(token, secret, async (err, decoded) => {
                if (err) {
                    return res.render("verification-error", { message: err.message });
                }
                supplier.emailVerified = true;
                await supplier.save();
                return res.render("verification-success", { message: "Email verified successfully" });
            });
            return;
        }

        // If no user found
        res.render("verification-error", { message: "User not found" });

    } catch (error) {
        console.error(error);
        res.render("verification-error", { message: "An error occurred during verification" });
    }
});
// render change password view
app.get('/passwordReset/:token/:id', (req, res) => {
    const { token, id } = req.params;
    jwt.verify(token, secret, async (err, decoded) => {
        if (err) {
            return res.render("verification-error", { message: err.message });
        }
        // rendering change password screen
        res.render('change-password', { message: id });
    });
    // res.render('change-password');
});
// render success screen
app.get('/passwordReset/successPage', (req, res) => {
    res.render('success-page');
});

// update password
app.post("/update-password", async (req, res) => {
    const { password, confirmPassword, userId } = req.body;
    if (password !== confirmPassword) {
        return res.render("verification-error", { message: "Passwords do not match" });
    }
    try {
        // update employer password
        const employer = await employerModel.findById(userId);
        if (employer) {
            employer.password = bcrypt.hashSync(password, 10);
            await employer.save();
            return res.render("success-page", { message: "Password updated successfully" });
        }
        // update freelancer password
        const freelancer = await freelancerModel.findById(userId);
        if (freelancer) {

            freelancer.password = bcrypt.hashSync(password, 10);
            await freelancer.save();
            return res.render("success-page", { message: "Password updated successfully" });
        }
        // update supplier password
        const supplier = await supplierModel.findById(userId);
        if (supplier) {
            supplier.password = bcrypt.hashSync(password, 10);
            await supplier.save();
            return res.render("success-page", { message: "Password updated successfully" });
        }
        return res.render("verification-error");

    } catch (error) {
        return res.render("verification-error", { message: error.message });

    }
    // res.render('success-page');
    //
})

app.post("/login", LoginController.loginUser);

module.exports = app;