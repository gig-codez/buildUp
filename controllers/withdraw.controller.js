const employerModel = require("../models/employer.model");
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
                .find().where({ approved: true })
                .countDocuments();
            const totalPages = Math.ceil(totalDocuments / pageSize);

            // Calculate the number of documents to skip
            const skipDocuments = (page - 1) * pageSize;
            const withdraws = await withdrawModel.find().where({ approved: true })
                .populate('contractor')
                .populate('supplier')
                .populate('approvedBy')
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
    // get client withdraws
    static async getClientWithdraws(req, res) {
        try {
            // ADDING PAGINATION FUNCTIONALITY
            const page = parseInt(req.query.page) || 1; // Default to page 1 if page query param is not provided
            const pageSize = parseInt(req.query.pageSize) || 10; // Default page size to 10 if pageSize query param is not provided

            const totalDocuments = await withdrawModel
                .find({ approvedBy: req.params.id }).where({ approved: false })
                .countDocuments();
            const totalPages = Math.ceil(totalDocuments / pageSize);

            // Calculate the number of documents to skip
            const skipDocuments = (page - 1) * pageSize;
            const withdraws = await withdrawModel.find({ approvedBy: req.params.id }).where({ approved: false })
                .populate('contractor')
                .populate('supplier')
                .populate('approvedBy')
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
            const { contractor, supplier, amount, bank, account_number, approvedBy } = req.body;
            // check if the client exists
            const clientExists = await employerModel.findById(approvedBy);
            if (!clientExists) {
                return res.status(400).json({ message: 'Client not found' });
            }
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
                    withdraw.recipient = `${contractorExists.first_name} ${contractorExists.last_name}`;
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
                            clientExists.email_address,
                            'Withdraw Request',
                            `${contractorExists.first_name} ${contractorExists.last_name} has requested a withdraw of UGX ${amount}.<b/>`,
                        );
                        return res.status(200).json({ message: 'Withdraw recorded', data: result });
                    }
                }
            }
            if (supplier) {
                const supplierExists = await supplierModel.findById(supplier);
                if (!supplierExists) {
                    return res.status(404).json({ message: 'Supplier not found' });
                } else {
                    // update supplier balance
                    const supplierBalance = supplierExists.balance;
                    const newBalance = supplierBalance - req.body.amount;
                    const updated = await supplierModel.findByIdAndUpdate(supplier, { balance: newBalance });
                    updated.save();
                    const withdraw = new withdrawModel(req.body);
                    withdraw.recipient = supplierExists.business_name;
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
                            clientExists.email_address,
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
    // approve withdraw
    static async approveWithdraw(req, res) {
        try {
            const withdraw = await withdrawModel.findById(req.params.id);
            if (!withdraw) {
                return res.status(400).json({ message: 'Withdraw record not found' });
            }
            const result = await withdrawModel.findByIdAndUpdate(req.params.id, { $set: { approved: true, } }, { new: true });
            if (!result) {
                return res.status(400).json({ message: 'Failed to approve withdraw' });
            }
            // notify the contractor or supplier
            if (result.contractor) {
                const contractor = await freelancerModel.findById(result.contractor);
                mailSender(
                    contractor.email,
                    'Withdraw Approved',
                    'Your withdraw request has been approved and will be processed soon',
                );
                // inform the admin about the approval process
                mailSender(
                    process.env.ADMIN_MAIL,
                    'Withdraw Approved',
                    `${contractor.first_name} ${contractor.last_name} withdraw request has been approved and will be processed soon<b/>  <p>Bank: ${withdraw.bank}</p> <p>Acc. No.: ${withdraw.account_number}</p>`,
                );
            }
            if (result.supplier) {
                const supplier = await supplierModel.findById(result.supplier);
                mailSender(
                    supplier.business_email_address,
                    'Withdraw Approved',
                    '<p>Your withdraw request has been approved and will be processed soon.<br/> <b>Thank you!</b></p>',
                );
                // inform the admin about the approval process
                mailSender(
                    process.env.ADMIN_MAIL,
                    'Withdraw Approved',
                    `${supplier.business_name} withdraw request has been approved and will be processed soon<b/>  <p>Bank: ${withdraw.bank}</p> <p>Acc. No.: ${withdraw.account_number}</p>`,
                );
            }
            res.status(200).json({ message: 'Withdraw approved successfully', data: result });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    // clear withdraw
    static async clearWithdraw(req, res) {
        try {
            const withdraw = await withdrawModel.findById(req.params.id);
            if (!withdraw) {
                return res.status(404).json({ message: 'Withdraw record not found' });
            }
            const result = await withdrawModel.findByIdAndUpdate(req.params.id, { $set: { cleared: true } }, { new: true });
            if (!result) {
                return res.status(400).json({ message: 'Failed to clear withdraw' });
            }
            // notify the contractor or supplier
            if (result.contractor) {
                const contractor = await freelancerModel.findById(result.contractor);
                mailSender(
                    contractor.email,
                    'Withdraw Cleared',
                    'Your withdraw request has been processed and the funds will be sent to your account soon',
                );
                // inform the admin about the approval process
                mailSender(
                    process.env.ADMIN_MAIL,
                    'Withdraw Request Processed',
                    `You have successfully cleared ${contractor.first_name} ${contractor.last_name}'s withdraw request.`,
                    // `${contractor.first_name} ${contractor.last_name} withdraw request has been processed and the funds will be sent to your account soon<b/>  <p>Bank: ${withdraw.bank}</p> <p>Acc. No.: ${withdraw.account_number}</p>`,
                );
            }
            if (result.supplier) {
                const supplier = await supplierModel.findById(result.supplier);
                mailSender(
                    supplier.business_email_address,
                    'Withdraw Cleared',
                    '<p>Your withdraw request has been processed and the funds will be sent to your account soon.<br/> <b>Thank you!</b></p>',
                );
                // inform the admin about the approval process
                mailSender(
                    process.env.ADMIN_MAIL,
                    'Withdraw Request Processed',
                    `You have successfully cleared ${supplier.business_name}'s withdraw request.`,
                );
            }
            res.status(200).json({ message: 'Withdraw cleared successfully', data: result });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}