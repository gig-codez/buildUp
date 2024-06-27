const adminModel = require("../models/admin.model");
const freelancerModel = require("../models/freelancer.model");
const supplierModel = require("../models/supplier.model");
const withdrawModel = require("../models/withdraws.model");
const mailSender = require("../utils/mailSender");
require("dotenv").config();
module.exports = class WithdrawController {
    // get withdraws
    static async getWithdraws(req, res) {
        try {
            // ADDING PAGINATION FUNCTIONALITY
            const page = parseInt(req.query.page) || 1; // Default to page 1 if page query param is not provided
            const pageSize = parseInt(req.query.pageSize) || 10; // Default page size to 10 if pageSize query param is not provided

            const totalDocuments = await withdrawModel
                .find()
                .countDocuments();
            const totalPages = Math.ceil(totalDocuments / pageSize);

            // Calculate the number of documents to skip
            const skipDocuments = (page - 1) * pageSize;
            const withdraws = await withdrawModel.find()
                .populate('contractor')
                .populate('supplier')
                .skip(skipDocuments)
                .limit(pageSize)
                .sort({ _id: -1 });
            //    response
            res.status(200).json({
                totalDocuments,
                totalPages,
                currentPage: page,
                pageSize,
                withdraws,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    // add withdraws
    static async storeWithdraws(req, res) {
        try {
            const { contractor, supplier, amount, bank, account_number } = req.body;
            // Check if the contractor or supplier exists
            if (contractor) {
                const contractorExists = await freelancerModel.findById(contractor);
                if (!contractorExists) {
                    return res.status(404).json({ message: 'Contractor not found' });
                } else {
                    // update contractor balance
                    const contractorBalance = parseInt(`${contractorExists.balance}`);
                    const newBalance = (contractorBalance - parseInt(amount));
                    const updated = await freelancerModel.findByIdAndUpdate(contractor, { balance: `${newBalance}` });
                    await updated.save();
                    // save withdraw
                    const withdraw = new withdrawModel(req.body);
                    const result = await withdraw.save();
                    if (!result) {
                        return res.status(400).json({ message: 'Failed to save withdraw' });
                    } else {
                        mailSender(
                            contractorExists.email,
                            'Withdraw Request',
                            'Your withdraw request has been received and is being processed',
                        );
                        // notifying system admin about the request
                        mailSender(
                            process.env.ADMIN_MAIL,
                            'Withdraw Request',
                            `${contractorExists.first_name} ${contractorExists.last_name} has requested a withdraw of UGX ${amount}.<b/> <p>Bank: ${bank}</p> <p>Acc. No.: ${account_number}</p>`,
                        );
                        return res.status(200).json({ message: 'Withdraw recorded', data: result });
                    }
                }
            }
            if (supplier) {
                const supplierExists = await freelancerModel.findById(supplier);
                if (!supplierExists) {
                    return res.status(404).json({ message: 'Supplier not found' });
                } else {
                    // update supplier balance
                    const supplierBalance = supplierExists.balance;
                    const newBalance = supplierBalance - req.body.amount;
                    const updated = await supplierModel.findByIdAndUpdate(supplier, { balance: newBalance });
                    updated.save();
                    const withdraw = new withdrawModel(req.body);
                    const result = await withdraw.save();
                    if (!result) {
                        return res.status(400).json({ message: 'Failed to save withdraw' });
                    } else {
                        // notify supplier
                        mailSender(
                            supplierExists.business_email_address,
                            'Withdraw Request',
                            '<p>Your withdraw request has been received and is being processed by the admin.<br/> This may take about 24 hours to process.<br/> <b>Thank you!</b></p>',
                        );
                        // notifying system admin about the request
                        mailSender(
                            process.env.ADMIN_MAIL,
                            'Withdraw Request',
                            `${supplierExists.business_name} has requested a withdraw of UGX ${amount}`,
                        );
                        return res.status(200).json({ message: 'Withdraw recorded successfully', data: result });
                    }
                }
            }
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    // update withdraws
    static async updateWithdraws(req, res) {
        try {
            const withdraw = await withdrawModel.findById(req.params.id);
            if (!withdraw) {
                return res.status(404).json({ message: 'withdraw not found' });
            }
            const result = await withdrawModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    // delete withdraws
    static async deleteWithdraws(req, res) {
        try {
            const withdraw = await withdrawModel.findById(req.params.id);
            if (!withdraw) {
                return res.status(404).json({ message: 'withdraw not found' });
            }
            await withdrawModel.findByIdAndDelete(req.params.id);
            res.status(200).json({ message: 'withdraw deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

}