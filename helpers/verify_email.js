const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const employerModel = require('../models/employer.model');
const freelancerModel = require('../models/freelancer.model');
const supplierModel = require('../models/supplier.model');
require("dotenv").config();
const secret = process.env.JWT_SECRET_KEY; // Replace with your actual secret key
const app = express.Router();


app.get('/verify-email/:token/:user', async (req, res) => {
    const token = req.params.token;
    // check for user
    const user = req.params.user;
    const client = await employerModel.findById(user);
    // check freelancer
    const freelancer = freelancerModel.findById(user);
    // supplier
    const supplier = supplierModel.findById(user);
    if (client) {
        jwt.verify(token, secret, async (err, decoded) => {
            if (err) {
                return res.render("verification-error", { message: err.message });
            }
            // update email_verified to true
            client.emailVerified = true;
            await client.save();
            res.render("verification-success", { message: "Email verified successfully" });
        });
    } else if (freelancer) {
        // update email verified to true
        jwt.verify(token, secret, async (err, decoded) => {
            if (err) {
                res.render("verification-error", { message: err.message });
            }
            const update = await freelancer.findOneAndUpdate({ _id: user }, { $set: { emailVerified: true } });
            await update.save();
            res.render("verification-success", { message: "Email verified successfully" });
        });
    } else if (supplier) {
        // update email verified to true
        jwt.verify(token, secret, async (err, decoded) => {
            if (err) {
                return res.render("verification-error", { message: err.message });
            }
            supplier.emailVerified = true;
            await supplier.save();
            res.render("verification-success", { message: "Email verified successfully" });

        });
    }
});

module.exports = app;