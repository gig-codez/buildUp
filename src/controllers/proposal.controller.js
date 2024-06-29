const Proposal = require("../models/proposal.model");
class ProposalController {
    async create(req, res) {
        try {
            const proposal = await Proposal.create(req.body);
            return res.status(201).json(proposal);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    async index(req, res) {
        try {
            const proposals = await Proposal.find();
            return res.status(200).json(proposals);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    async show(req, res) {
        try {
            const proposal = await Proposal.findById(req.params.id);
            return res.status(200).json(proposal);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    async update(req, res) {
        try {
            const proposal = await Proposal.findByIdAndUpdate(req.params.id, req.body, { new: true });
            return res.status(200).json(proposal);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    async delete(req, res) {
        try {
            await Proposal.findByIdAndDelete(req.params.id);
            return res.status(204).send();
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
}
module.exports = ProposalController;