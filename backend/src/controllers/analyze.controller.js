// analyze.controller.js

// Business logic:
// Receive URL
// Validate URL
// Create Session ID
// Call VM Service
// Return response


const vmAgentService = require("../services/vmAgent.service");

const analyzeURL = async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: "URL is required"
            });
        }

        const result = await vmAgentService.startAnalysis(url);

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    analyzeURL
};