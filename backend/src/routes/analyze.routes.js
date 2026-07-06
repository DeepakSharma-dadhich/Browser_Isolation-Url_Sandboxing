// analyze.routes.js

// Contains endpoints like:
// POST /api/analyze
// GET  /api/status/:sessionId
// GET  /api/report/:sessionId


const express = require("express");
const router = express.Router();

const analyzeController = require("../controllers/analyze.controller");

// Analyze URL
router.post("/", analyzeController.analyzeURL);

module.exports = router;