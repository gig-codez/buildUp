
const PaymentModel = require('../models/payment.model');
const PesaPal = require("../services/payments/pesapal/pesapal");
const { v4: uuidv4 } = require('uuid');

class PaymentController {


    static async finishPayment(req, res) {
        try {
            // Your existing PHP code for finishPayment method
            // ...

            // Return the appropriate response or view
            return res.render('payments.finish');
        } catch (error) {
            // Handle errors
            console.error(error);
            return res.render('payments.cancel'); // Or return an error view
        }
    }

    static async registerIPN(req, res) {
        try {
            const url = req.body.url;
            if (!url) {
                return res.status(400).json({ success: false, message: 'URL is required' });
            }
            // return url;
            const result = await PesaPal.pesapalRegisterIPN(url);
            return res.json({ success: true, message: 'Success', response: result });
        } catch (error) {
            // Handle errors
            console.error(error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    static async listIPNS(req, res) {
        try {
            const result = await PesaPal.pesapalListIPNS();
            return res.json({ success: true, message: 'Success', response: result });
        } catch (error) {
            // Handle errors
            console.error(error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    static async cancelPayment(req, res) {
        try {
            return res.render('payments.cancel');
        } catch (error) {
            // Handle errors
            console.error(error);
            return res.render('payments.cancel'); // Or return an error view
        }
    }

    static async completePayment(req, res) {
        try {
            const { OrderTrackingId, OrderMerchantReference } = req.query;
            const paymentReference = OrderMerchantReference;
            //check the transaction status
            const result = PesaPal.transactionStatus(OrderTrackingId);
            //perform some logic to verify the payment and complete the payment

            return res.json({ success: true, message: 'Success', response: result });
        } catch (error) {
            // Handle errors
            console.error(error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }

    static async processOrder(req, res) {
        try {
            // Extract required parameters from the request body
            const { amount, phone_number, description } = req.body;

            // Check if the required parameters are provided
            if (!amount || !phone_number || !description) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameters. Please provide amount, phone_number, and description.',
                });
            }
            const payment_reference = uuidv4();
            const call_back_url = "https://2c53-41-75-190-243.ngrok-free.app//payments/complete-payment";
            const cancel_url = "https://2c53-41-75-190-243.ngrok-free.app//payments/cancel-payment";
            const customer_names = "John Doe";
            const customer_email = "pYk2K@example.com";
            const data = await PesaPal.orderProcess(payment_reference, amount, phone_number, description, call_back_url, customer_names, customer_email, cancel_url);
            return res.json({ success: true, message: 'Order processed successfully', response: data });
        } catch (error) {
            // Handle errors
            console.error(error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }


    static async checkTransactionStatus(req, res) {
        try {
            const { order_tracking_id } = req.query;
            if (!order_tracking_id) {
                return res.status(400).json({ success: false, message: 'Missing required parameters. Please provide order_tracking_id.' });
            }
            const data = await PesaPal.transactionStatus(order_tracking_id);
            return res.json({ success: true, message: 'Success', response: data });
        } catch (error) {
            // Handle errors
            console.error(error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
}

module.exports = PaymentController;