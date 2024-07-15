const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const employerModel = require('../models/employer.model.js');
const freelancerModel = require('../models/freelancer.model.js');
const supplierModel = require('../models/supplier.model.js');
const app = express();

const secret = 'your_jwt_secret_key'; // Replace with your actual secret key

app.use(express.static(path.join(__dirname, 'public')));

app.get('/verify-email/:token/:user', async (req, res) => {
    const token = req.params.token;
    // check for user
    const user = req.params.user;
    const client = await employerModel.findById(user);
    // check freelancer
    const freelancer = freelancerModel.findById(user);
    // supplier
    const supplier = supplierModel.findById(user);
    if (!client) {
        return res.sendFile(path.join(__dirname, 'public', 'error.html'));
    } else if (!freelancer) {
        return res.sendFile(path.join(__dirname, 'public', 'error.html'));
    } else if (!freelancer) {
        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                return res.sendFile(path.join(__dirname, 'public', 'error.html'));
            }

            res.sendFile(path.join(__dirname, 'public', 'verified.html'));
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
