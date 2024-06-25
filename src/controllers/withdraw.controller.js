const withdrawModel = require("../models/withdraws.model");
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
            const withdraw = new withdrawModel(req.body);
            const result = await withdraw.save();
            res.status(201).json(result);
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