const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

class Pesapal {
    static pesapalBaseUrl = 'https://pay.pesapal.com/v3';

    static consumerKey = process.env.CONSUMER_KEY;
    static consumerSecret = process.env.CONSUMER_SECRET;

    static loadConfig() {
        this.consumerKey = process.env.CONSUMER_KEY;
        this.consumerSecret = process.env.CONSUMER_SECRET;
    }

    /**
     * Retrieves the base URL for the Pesapal API.
     *
     * @return {string} The Pesapal base URL.
     */
    static pesapalBaseUrl() {
        try {
            return this.pesapalBaseUrl;
        } catch (error) {
            return error.message;
        }
    }

    /**
     * Asynchronously authenticates with Pesapal API.
     *
     * @return {Promise<any>} The authentication response data.
     */
    static async pesapalAuth() {
        try {
            this.loadConfig();
            const url = `${this.pesapalBaseUrl}/api/Auth/RequestToken`;
            const headers = { 'Content-Type': 'application/json', 'accept': 'application/json' };
            const body = JSON.stringify({
                'consumer_key': this.consumerKey,
                'consumer_secret': this.consumerSecret,
            });

            const response = await axios.post(url, body, { headers });
            const data = response.data;

            return data;
        } catch (error) {
            return error.message;
        }
    }

    /**
     * Register IPN.
     *
     * @param {string} ipnUrl - The URL for IPN registration.
     * @return {Promise} The response data from the registration request.
     */
    static async pesapalRegisterIPN(ipnUrl) {
        try {


            const res = await this.pesapalAuth();

            if (!res.token) {
                throw new Error('Failed to obtain Token');
            }

            const url = `${this.pesapalBaseUrl}/api/URLSetup/RegisterIPN`;
            const headers = {
                'Content-Type': 'application/json',
                'accept': 'application/json',
                'Authorization': `Bearer ${res.token}`,
            };

            const body = JSON.stringify({
                'url': ipnUrl,
                'ipn_notification_type': 'GET',
            });

            const response = await axios.post(url, body, { headers });
            const data = response.data;

            return data;
        } catch (error) {
            return error.message;
        }
    }

    /**
     * Retrieves a list of IPN URLs from the Pesapal API.
     *
     * @return {Promise<object>} The response data containing the list of IPN URLs.
     */
    static async pesapalListIPNS() {
        try {
            this.loadConfig();
            const res = await this.pesapalAuth();
            if (!res.token) {
                throw new Error('Failed to obtain Token');
            }
            const url = `${this.pesapalBaseUrl}/api/URLSetup/GetIpnList`;
            const headers = {
                'Content-Type': 'application/json', 'accept': 'application/json',
                'Authorization': `Bearer ${res.token}`,
            };
            const response = await axios.get(url, { headers });
            const data = response.data;

            return data;

        } catch (error) {
            return error.message;
        }
    }


    /**
     * Process an order.
     *
     * @param {string} reference - The reference of the order.
     * @param {number} amount - The amount of the order.
     * @param {string} phone - The phone number of the customer.
     * @param {string} description - The description of the order.
     * @param {function} callback - The callback function to be executed.
     * @param {string} customer_names - The name of the customer.
     * @param {string} email - The email of the customer.
     * @param {string} cancel_url - The cancel URL for the order.
     * @return {object} The result of the order process.
     */
    static async orderProcess(reference, amount, phone, description, callback, customer_names, email, cancel_url,) {
        try {
            const res = await this.pesapalAuth();
            const payload = JSON.stringify({
                'id': reference,
                'currency': 'UGX',
                'amount': amount,
                'description': description,
                'redirect_mode': 'PARENT_WINDOW',
                'callback_url': callback,
                'cancel_url': cancel_url,
                'notification_id': "1e2e14ac-a538-4400-9063-ddaa61771253",
                'billing_address': {
                    'phone_number': phone,
                    'first_name': customer_names,
                    'last_name': customer_names,
                    'email': email,
                },
            });

            if (!res.token) {
                throw new Error('Failed to obtain Token');
            }

            const url = `${this.pesapalBaseUrl}/api/Transactions/SubmitOrderRequest`;
            const headers = {
                'Content-Type': 'application/json',
                'accept': 'application/json',
                'Authorization': `Bearer ${res.token}`,
            };

            const response = await axios.post(url, payload, { headers });
            const data = response.data;

            return data;
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Retrieves the status of a transaction.
     *
     * @param {string} orderTrackingId - The ID of the transaction to retrieve the status for.
     * @return {object} The status of the transaction.
     */
    static async transactionStatus(orderTrackingId) {
        // let response = null;
        try {
            if (!orderTrackingId || orderTrackingId.trim() === '') {
                throw new Error('Missing Transaction ID');
            }

            const res = await this.pesapalAuth();
            if (!res.token) {
                return { success: false, message: 'Failed to obtain Token', response: token };
            }

            const url = `${this.pesapalBaseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`;
            const headers = {
                'Content-Type': 'application/json',
                'accept': 'application/json',
                'Authorization': `Bearer ${res.token}`,
            };

            let response = await axios.get(url, { headers });
            let data = response.data;
            return data;
        } catch (error) {
            console.log(error)
            return { success: false, message: error.message };
        }
    }
}


module.exports = Pesapal

