const paymentModel = require("../models/payment.model");
const PaymentModel = require("../models/payment.model");
const PesaPal = require("../services/payments/pesapal/pesapal");
const { v4: uuidv4 } = require("uuid");

class PaymentController {
  // fetch all transactions
  static async transactions(req, res) {
    try {
      // ADDING PAGINATION FUNCTIONALITY
      const page = parseInt(req.query.page) || 1; // Default to page 1 if page query param is not provided
      const pageSize = parseInt(req.query.pageSize) || 10; // Default page size to 10 if pageSize query param is not provided

      const totalDocuments = await PaymentModel.find({
        employer_id: req.params.id,
      }).countDocuments();
      const totalPages = Math.ceil(totalDocuments / pageSize);

      // Calculate the number of documents to skip
      const skipDocuments = (page - 1) * pageSize;
      const transactions = await PaymentModel.find({
        employer_id: req.params.id,
      })
        .skip(skipDocuments)
        .limit(pageSize)
        .sort({ createdAt: -1 });
      if (transactions) {
        res.status(200).json({
          totalDocuments,
          totalPages,
          currentPage: page,
          pageSize,
          transactions,
        });
      } else {
        return res.status(400).json({
          message: "No transactions found",
        });
      }
    } catch (error) {
      // Handle errors
      return res.status(500).json({ message: error.message });
    }
  }

  static async finishPayment(req, res) {
    try {
      // Your existing PHP code for finishPayment method
      // ...

      // Return the appropriate response or view
      return res.send(`<b>Complete </b>`);
    } catch (error) {
      // Handle errors
      console.error(error);
      return res.render("payments.cancel"); // Or return an error view
    }
  }

  static async registerIPN(req, res) {
    try {
      const url = req.body.url;
      if (!url) {
        return res
          .status(400)
          .json({ success: false, message: "URL is required" });
      }
      // return url;
      const result = await PesaPal.pesapalRegisterIPN(url);
      return res.json({ success: true, message: "Success", response: result });
    } catch (error) {
      // Handle errors
      console.error(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async listIPNS(req, res) {
    try {
      const result = await PesaPal.pesapalListIPNS();
      return res.json({ success: true, message: "Success", response: result });
    } catch (error) {
      // Handle errors
      console.error(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async cancelPayment(req, res) {
    try {
      return res.render("payments.cancel");
    } catch (error) {
      // Handle errors
      console.error(error);
      return res.render("payments.cancel"); // Or return an error view
    }
  }

  static async completePayment(req, res) {
    try {
      const { OrderTrackingId, OrderMerchantReference } = req.query;
      const paymentReference = OrderMerchantReference;
      //check the transaction status
      const result = PesaPal.transactionStatus(OrderTrackingId);
      //perform some logic to verify the payment and complete the payment

      return res.json({ success: true, message: "Success", response: result });
    } catch (error) {
      // Handle errors
      console.error(error);
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  static async processOrder(req, res) {
    try {
      // Extract required parameters from the request body
      const { recipient, amount, phone_number, employer, reason } = req.body;
      const payment_reference = uuidv4();
      const call_back_url = "http://127.0.0.1:4000/payments/finishPayment";
      const cancel_url = "http://127.0.0.1:4000/payments/cancel-payment";
      const customer_names = "John Doe";
      const customer_email = "pYk2K@example.com";
      const data = await PesaPal.orderProcess(
        payment_reference,
        amount,
        phone_number,
        reason,
        call_back_url,
        customer_names,
        customer_email,
        cancel_url
      );
      if (data) {
        new paymentModel({
          employer_id: employer,
          payment_reference: payment_reference,
          amount: amount,
          phone_number: phone_number,
          description: reason,
          recipeint: recipient,
          status: "PENDING",
          order: data,
        }).save();

        res.status(200).json({
          message: "Payment processed.",
          data: data,
        });
      } else {
        res.status(400).json({
          message: "Error processing order.",
        });
      }
    } catch (error) {
      // Handle errors
      // console.error(error);
      return res.status(500).json({ message: error.message });
    }
  }

  static async checkTransactionStatus(req, res) {
    try {
      const { order_tracking_id } = req.query;
      if (!order_tracking_id) {
        return res.status(400).json({
          message:
            "Missing required parameters. Please provide order_tracking_id.",
        });
      }
      const data = await PesaPal.transactionStatus(order_tracking_id);
      return res.json({ response: data });
    } catch (error) {
      // Handle errors
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  }

  static async deleteTransaction(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          message: "Missing required parameters. Please provide id.",
        });
      }
      const data = await PaymentModel.findByIdAndDelete(id);
      if (data) {
        return res.status(200).json({ response: data });
      } else {
        return res.status(400).json({ message: "Transaction not found." });
      }
    } catch (error) {
      // Handle errors
      // console.error(error);
      return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = PaymentController;
