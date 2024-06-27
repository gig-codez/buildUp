const employerModel = require("../models/employer.model");
const freelancerModel = require("../models/freelancer.model");
const paymentModel = require("../models/payment.model");
const supplierModel = require("../models/supplier.model");
const PesaPal = require("../services/payments/pesapal");
const { v4: uuidv4 } = require("uuid");
const mailSender = require("../utils/mailSender");

class PaymentController {
  // fetch all transactions
  static async transactions(req, res) {
    try {
      // ADDING PAGINATION FUNCTIONALITY
      const page = parseInt(req.query.page) || 1; // Default to page 1 if page query param is not provided
      const pageSize = parseInt(req.query.pageSize) || 10; // Default page size to 10 if pageSize query param is not provided

      const totalDocuments = await paymentModel
        .find({
          employer_id: req.params.id,
        })
        .countDocuments();
      const totalPages = Math.ceil(totalDocuments / pageSize);

      // Calculate the number of documents to skip
      const skipDocuments = (page - 1) * pageSize;
      const transactions = await paymentModel
        .find({
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
  static async updateTransaction(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res
          .status(400)
          .json({ message: "Missing required parameters." });
      }
      const transaction = await paymentModel.findByIdAndUpdate(id, {
        $set: req.body,
      });
      transaction.save();
      return res
        .status(200)
        .json({ message: "Transaction updated successfully." });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
  static async completePayment(req, res) {
    try {
      const { OrderTrackingId, OrderMerchantReference } = req.query;
      // console.log(req.param)
      const paymentReference = OrderMerchantReference;
      //check the transaction status
      const result = await PesaPal.transactionStatus(OrderTrackingId);
      console.log(result);
      //perform some logic to verify the payment and complete the payment
      // if (result.payment_status_description == "Completed") {
      // console.log("payment completed")
      let customer_transaction = await paymentModel.findOne({
        reference: paymentReference,
      });
      if (customer_transaction) {
        if (customer_transaction.status == "PENDING") {
          const paymentTransaction = await paymentModel.findByIdAndUpdate(
            customer_transaction._id,
            { status: "COMPLETED" }
          );
          paymentTransaction.save();
          // update client balance
          const client = await employerModel.findOne({
            _id: customer_transaction.employer_id,
          });
          if (client) {
            let old_balance = parseInt(`${client.balance}`);
            let new_balance = parseInt(`${result.amount}`);
            let total = old_balance + new_balance;
            // console.log(`Total balance ${total}`);
            //  update client balance
            const updatedAccount = await employerModel.findByIdAndUpdate(
              customer_transaction.employer_id,
              {
                $set: {
                  balance: total,
                },
              }
            );
            updatedAccount.save();
            // sender mail for successful top up
            await mailSender(
              client.email_address,
              "Account TopUp!",
              `<h4>You have topped <b>${new_balance}.</b> Your new account balance is UGX <b>${total}.</b></h4>`
            );
            return res
              .status(200)
              .json({ message: "Payment completed successfully.." });
          } else {
            return res.status(400).json({ message: "User not found." });
          }
        } else {
          return res
            .status(400)
            .json({ message: "Transaction already executed." });
        }
      } else {
        return res.status(400).json({ message: "Payment record not found." });
      }
      // }
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
  static async processTransaction(req, res) {
    try {
      const { amount, reason, recipient_id, sender } = req.body;
      const payment_reference = uuidv4();
      /***
       * Check client's account if it has sufficient funds
       */
      const employer = await employerModel
        .findOne({ _id: sender })
        .populate("business");
      if (employer) {
        if (parseInt(`${employer.balance}`) > parseInt(`${amount}`)) {
          /*
           * Supplier transaction process.
           *  if it's a supplier being paid
           */
          const supplierData = await supplierModel.findOne({
            _id: recipient_id,
          });
          if (supplierData) {
            // TODO transact money to supplier
            // top up money on the supplier's current balance
            let new_balance =
              parseInt(`${supplierData.balance}`) + parseInt(`${amount}`);
            const updatedSupplierBal = await supplierModel.findByIdAndUpdate(
              supplier._id,
              {
                $set: {
                  balance: new_balance,
                },
              }
            );
            const supplierUpdated = await updatedSupplierBal.save();
            if (updatedSupplierBal) {
              // save transaction in payments model
              new paymentModel({
                supplier_id: recipient_id,
                payment_reference: payment_reference,
                amount: amount,
                phone_number: supplierData.business_tel,
                description: reason,
                status: "COMPLETED",
              }).save();
              // send mail to recipient.
              await mailSender(
                supplierData.business_email_address,
                "Payments",
                `<p>You have received ${amount} from ${employer.first_name} ${employer.last_name} (${employer.business.business_name}) for ${reason}. But you can only withdraw these fees after completion of work.<br/>  Your new account balance is <b>UGX ${new_balance}</b></p>.`
              );
              // update employer's account
              const updated = await employerModel.findByIdAndUpdate(sender, {
                $set: {
                  balance:
                    parseInt(`${employer.balance}`) - parseInt(`${amount}`),
                },
              });
              await updated.save();
              //  -------------- done updating employer's account balance. ----------------
              return res
                .status(200)
                .json({ message: "Transaction  successfully completed" });
            } else {
              return res.status(400).json({ message: "User not found." });
            }
          } else {
            /***
              * Contractor or Consultant payment
              * if it's an contractor/consultant being paid
              *
              *
              */
            const contractor = await freelancerModel.findOne({
              _id: recipient_id,
            });
            if (contractor) {
              // TODO transact money
              let new_balance =
                parseInt(`${contractor.balance}`) + parseInt(`${amount}`);
              const updatedAccount = await freelancerModel.findByIdAndUpdate(
                contractor._id,
                {
                  $set: {
                    balance: new_balance,
                  },
                }
              );
              const updatedResult = await updatedAccount.save();
              if (updatedResult) {
                // send mail to recipient
                await mailSender(
                  contractor.email,
                  "Payments",
                  `<p>You have received ${amount} from ${employer.first_name} ${employer.last_name} (${employer.business.business_name}) for ${reason}. But you can only withdraw these fees after completion of work.<br/> Your new account balance is <b>UGX ${new_balance}</b></p>`
                );
                // save transaction
                const recordTransaction = new paymentModel({
                  employer_id: sender,
                  payment_reference: payment_reference,
                  amount: amount,
                  phone_number: contractor.tel_num,
                  description: reason,
                  contractor_id: recipient_id,
                  status: "COMPLETED",
                });
                await recordTransaction.save();
                // update employer's account
                const updated = await employerModel.findByIdAndUpdate(sender, {
                  $set: {
                    balance:
                      parseInt(`${employer.balance}`) - parseInt(`${amount}`),
                  },
                });
                await updated.save();
                //  -------------- done updating employer's account balance. ----------------
                return res
                  .status(200)
                  .json({ message: "Payment completed successfully.." });
              } else {
                res.status(400).json({ message: "Transaction failed." });
              }
            } else {
              return res.status(400).json({ message: "User not found" });
            }
          }
        } else {
          await mailSender(
            employer.email_address,
            "Transaction Failed!",
            `<p>Your current balance is <b>${employer.balance}.</b>  </p> <i>Please top up your account to complete your transaction.</i><br/> <h3>Thank You.</h3>`
          );
          return res
            .status(400)
            .json({ message: "Your account balance is low, please top up." });
        }
      } else {
        return res.status(400).json({ message: "Employer data not found." });
      }
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
  static async processOrder(req, res) {
    try {
      // Extract required parameters from the request body
      const { amount, phone_number, employer, reason } = req.body;
      const client = await employerModel.findOne({ _id: employer });
      if (!client) {
        return res.status(400).json({ message: "Client not found" });
      }
      const customer_name = `${client.first_name} ${client.last_name}`; // TODO add customer names
      const customer_email = client.email_address; // TODO add customer email
      const recipient = "John Doe";
      const payment_reference = uuidv4();
      const call_back_url =
        "https://build-up.vercel.app/payments/completePayment";
      const cancel_url = "https://build-up.vercel.app/payments/cancel-payment";
      // const customer_names = "John Doe"; /// TODO add customer names
      // const customer_email = "pYk2K@example.com"; // TODO add customer email
      const data = await PesaPal.orderProcess(
        payment_reference,
        amount,
        phone_number,
        reason,
        call_back_url,
        customer_name,
        customer_email,
        cancel_url
      );
      if (data) {

        const paymentRecord = new paymentModel({
          employer_id: employer,
          reference: payment_reference,
          amount: amount,
          phone_number: phone_number,
          description: reason,
          recipient: customer_name,
          status: "PENDING",
          order: data,
        });
        await paymentRecord.save();
        res.status(200).json({
          message: "Payment being processed.",
          data: data,
        });
      } else {
        res.status(400).json({
          message: "Error processing order.",
        });
      }
    } catch (error) {
      // Handle errors
      return res.status(500).json({ message: error.message });
    }
  }
  static async processRefund(req, res) {
    try {
      const response = await PesaPal.refundMoney(req.body);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: error.message });
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
      const data = await paymentModel.findByIdAndDelete(id);
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
  // recipients
  static async contractors(req, res) {
    try {
      const contractors = await freelancerModel.find({
        role: "65c35d821f9b6742f96bbd96",
      });
      if (contractors) {
        return res.status(200).json({ data: contractors });
      } else {
        return res.status(400).json({ message: "No contractors found." });
      }
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
  static async consultants(req, res) {
    try {
      const consultants = await freelancerModel.find({
        role: "65c35d14995a043c785acfd4",
      });
      if (consultants) {
        return res.status(200).json({ data: consultants });
      } else {
        return res.status(400).json({ message: "No consultants found." });
      }
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
  // 
  static async suppliers(req, res) {
    try {
      const contractors = await supplierModel.find({
      }).populate("supplier_type", "name");
      if (contractors) {
        return res.status(200).json({ data: contractors });
      } else {
        return res.status(400).json({ message: "No contractors found." });
      }
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = PaymentController;
