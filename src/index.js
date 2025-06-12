// server.js
const express = require('express');
const http = require('http'); // ⭐ PENTING: Import http
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const cors = require('cors');
//test
//coba
//coba2
//coba3

// Import routes
const authRoutes = require('./routes/auth.route');
const categoryRoutes = require('./routes/category.route');
const transactionRoutes = require("./routes/transaction.route");
const deviceRoutes = require("./routes/device.route");
const connectionRoutes = require('./routes/connectionRoutes');

// Import WebSocket functions
const { initWebSocketServer, sendToESP32, getConnectionStatus } = require('./wsClient');

// Load Swagger YAML file
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/connection', connectionRoutes);

// ⭐ LANGKAH PENTING: Buat HTTP Server dari Express app
const server = http.createServer(app);

// ⭐ SEKARANG: Initialize WebSocket dengan HTTP server (bukan Express app)
initWebSocketServer(server);

// ⭐ TERAKHIR: Listen menggunakan HTTP server (bukan app.listen)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🔌 WebSocket ready for IoT connections on ws://localhost:${PORT}`);
});

// Export untuk testing atau penggunaan lain
module.exports = { app, server };