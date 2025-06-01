const WebSocket = require('ws');

let wss;
let connectedClients = new Map(); // Menyimpan client berdasarkan deviceId

// Inisialisasi WebSocket Server
const initWebSocketServer = (server) => {
    wss = new WebSocket.Server({ server });
    
    wss.on('connection', (ws, req) => {
        console.log('New WebSocket connection');
        
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                console.log('Received from client:', data);
                
                // Jika ESP32 mengirim deviceId, simpan mapping
                if (data.deviceId) {
                    connectedClients.set(data.deviceId, ws);
                    console.log(`Device ${data.deviceId} registered`);
                }
                
                // Handle response dari ESP32
                if (data.status) {
                    console.log(`Device status: ${data.status}`);
                    // Bisa ditambahkan logic untuk update database
                }
                
            } catch (error) {
                console.log('Received text message:', message.toString());
            }
        });
        
        ws.on('close', () => {
            console.log('Client disconnected');
            // Remove dari mapping
            for (let [deviceId, client] of connectedClients.entries()) {
                if (client === ws) {
                    connectedClients.delete(deviceId);
                    console.log(`Device ${deviceId} unregistered`);
                    break;
                }
            }
        });
        
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });
    
    console.log('WebSocket server initialized');
};

// Fungsi untuk mengirim data ke ESP32 tertentu
const sendToESP32 = (data) => {
    if (!wss) {
        console.error('WebSocket server not initialized');
        return false;
    }
    
    const { deviceId } = data;
    
    if (deviceId && connectedClients.has(deviceId)) {
        // Kirim ke device tertentu
        const client = connectedClients.get(deviceId);
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
            console.log(`Data sent to device ${deviceId}:`, data);
            return true;
        } else {
            console.log(`Device ${deviceId} is not connected`);
            connectedClients.delete(deviceId);
            return false;
        }
    } else {
        // Broadcast ke semua client yang terhubung
        let sent = false;
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
                sent = true;
            }
        });
        
        if (sent) {
            console.log('Data broadcasted to all clients:', data);
        } else {
            console.log('No clients connected');
        }
        
        return sent;
    }
};

// Fungsi untuk mendapatkan status koneksi
const getConnectionStatus = () => {
    return {
        totalClients: wss ? wss.clients.size : 0,
        registeredDevices: connectedClients.size,
        devices: Array.from(connectedClients.keys())
    };
};

module.exports = {
    initWebSocketServer,
    sendToESP32,
    getConnectionStatus
};