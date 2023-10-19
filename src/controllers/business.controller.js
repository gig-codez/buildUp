const businessModel = require("../models/business.model")
class BusinessController {
    static async getAll(req, res)  {
        try {
            let business = await businessModel.find();
            res.status(200).json({ data: business });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    static async store(req, res) {
        try {
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}
module.exports = BusinessController;