const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const { initWebSocketServer } = require('./wsClient');
const cors = require('cors');
const authRoutes = require('./routes/auth.route');
const categoryRoutes = require('./routes/category.route');
const transactionRoutes = require("./routes/transaction.route");
const deviceRoutes = require("./routes/device.route");
const connectionRoutes = require('./routes/connectionRoutes');


// Load Swagger YAML file
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml')); // Sesuaikan path jika Anda menempatkan swagger.yaml di tempat lain

const app = express();

app.use(bodyParser.json());

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Contoh penggunaan rute yang sudah ada
app.use('/api/auth', authRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/connection', connectionRoutes);

app.listen(3000, function(){
    console.log("Server is running on port 3000");
});
initWebSocketServer(app);