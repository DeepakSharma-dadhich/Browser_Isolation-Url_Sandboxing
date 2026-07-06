const axios = require("axios");

const startAnalysis = async (url) => {

    const response = await axios.post(
        `${process.env.VM_AGENT_URL}/analyze`,
        {
            url: url
        }
    );

    return {
        status: "analysis_started",
        submittedUrl: url,
        vmResponse: response.data
    };
};

module.exports = {
    startAnalysis
};