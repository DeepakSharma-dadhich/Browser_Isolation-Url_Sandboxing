// app.js
// Start Express server
// Load environment variables
// Register routes
// Handle errors

// Import required packages
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Import routes
const analyzeRoutes = require("./routes/analyze.routes");

// Create Express application
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Email-URL Sandbox Host Server is Running"
    });
});

// Register Routes
app.use("/api/analyze", analyzeRoutes);

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Host Server running on http://localhost:${PORT}`);
});