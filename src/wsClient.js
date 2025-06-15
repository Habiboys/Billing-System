const WebSocket = require('ws');

let wss;
let connectedClients = new Map(); // Menyimpan client berdasarkan deviceId
let activeTimers = new Set(); // Menyimpan device yang sedang aktif timernya

function heartbeat() {
    this.isAlive = true;
}

// Inisialisasi WebSocket Server
const initWebSocketServer = (server) => {
    wss = new WebSocket.Server({ server });
    
    // Interval untuk mengecek koneksi yang tidak aktif
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                console.log('Client tidak merespon ping, menutup koneksi...');
                return ws.terminate();
            }

            ws.isAlive = false;
            ws.ping();
        });
    }, 30000); // Check setiap 30 detik

    wss.on('close', () => {
        clearInterval(interval);
    });
    
    wss.on('connection', (ws, req) => {
        console.log('New WebSocket connection');
        
        ws.isAlive = true;
        ws.on('pong', heartbeat);

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                console.log('Received from client:', data);
                
                // Mendukung baik device_id maupun deviceId
                const deviceId = data.deviceId || data.device_id;
                
                // Jika ESP32 mengirim deviceId, simpan mapping
                if (deviceId) {
                    // Update existing connection if exists
                    if (connectedClients.has(deviceId)) {
                        const existingWs = connectedClients.get(deviceId);
                        if (existingWs !== ws) {
                            existingWs.close();
                            console.log(`Closing old connection for device ${deviceId}`);
                        }
                    }
                    connectedClients.set(deviceId, ws);
                    console.log(`Device ${deviceId} registered`);
                    
                    // Kirim konfirmasi ke device
                    ws.send(JSON.stringify({
                        type: 'registration',
                        status: 'success',
                        deviceId: deviceId
                    }));
                }
                
                // Handle status update dari ESP32
                if (data.status === 'relay_off') {
                    const deviceId = data.device_id;
                    console.log(`Timer completed for device ${deviceId}. Relay turned off.`);
                    // Hapus dari active timers karena timer sudah selesai
                    activeTimers.delete(deviceId);
                }
                
            } catch (error) {
                console.error('Error processing message:', error);
                console.log('Raw message:', message.toString());
            }
        });
        
        ws.on('close', () => {
            console.log('Client disconnected');
            // Remove dari mapping
            for (let [deviceId, client] of connectedClients.entries()) {
                if (client === ws) {
                    connectedClients.delete(deviceId);
                    activeTimers.delete(deviceId);
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

// Fungsi untuk mengecek status timer device
const isTimerActive = (deviceId) => {
    return activeTimers.has(deviceId);
};

// Fungsi untuk mengirim data ke ESP32 tertentu
const sendToESP32 = (data) => {
    if (!wss) {
        console.error('WebSocket server not initialized');
        return {
            success: false,
            message: 'WebSocket server not initialized'
        };
    }
    
    const deviceId = data.deviceId || data.device_id;
    const { timer } = data;
    
    // Validasi input
    if (!deviceId) {
        return {
            success: false,
            message: 'Device ID is required'
        };
    }

    if (!timer || typeof timer !== 'number') {
        return {
            success: false,
            message: 'Timer must be a valid number'
        };
    }
    
    // Cek apakah device terdaftar
    if (!connectedClients.has(deviceId)) {
        return {
            success: false,
            message: `Device ${deviceId} not registered`
        };
    }

    // Cek apakah device sedang memiliki timer aktif
    if (isTimerActive(deviceId)) {
        return {
            success: false,
            message: `Device ${deviceId} masih memiliki timer yang aktif`
        };
    }

    // Ambil koneksi WebSocket untuk device
    const client = connectedClients.get(deviceId);
    
    // Cek status koneksi
    if (client.readyState !== WebSocket.OPEN) {
        connectedClients.delete(deviceId);
        return {
            success: false,
            message: `Device ${deviceId} connection is not open`
        };
    }

    try {
        // Format data untuk dikirim ke device
        const payload = {
            type: 'command',
            device_id: deviceId, // Gunakan device_id untuk kompatibilitas
            timer,
            timestamp: new Date().toISOString()
        };

        // Set timer status
        activeTimers.add(deviceId);

        // Kirim data
        client.send(JSON.stringify(payload));
        console.log(`Data sent to device ${deviceId}:`, payload);
        
        return {
            success: true,
            message: `Data sent to device ${deviceId}`,
            data: payload
        };
    } catch (error) {
        console.error(`Error sending data to device ${deviceId}:`, error);
        return {
            success: false,
            message: `Error sending data: ${error.message}`
        };
    }
};

// Fungsi untuk mengirim perintah start/stop ke ESP32
const sendCommand = (data) => {
    if (!wss) {
        return {
            success: false,
            message: 'WebSocket server not initialized'
        };
    }
    
    const deviceId = data.deviceId || data.device_id;
    const { command } = data;
    
    // Validasi input
    if (!deviceId) {
        return {
            success: false,
            message: 'Device ID is required'
        };
    }

    if (!command || !['start', 'stop'].includes(command)) {
        return {
            success: false,
            message: 'Command harus berupa "start" atau "stop"'
        };
    }
    
    // Cek apakah device terdaftar
    if (!connectedClients.has(deviceId)) {
        return {
            success: false,
            message: `Device ${deviceId} not registered`
        };
    }

    // Cek apakah device sedang memiliki timer aktif
    if (command === 'start' && isTimerActive(deviceId)) {
        return {
            success: false,
            message: `Device ${deviceId} masih memiliki timer yang aktif`
        };
    }

    // Ambil koneksi WebSocket untuk device
    const client = connectedClients.get(deviceId);
    
    // Cek status koneksi
    if (client.readyState !== WebSocket.OPEN) {
        connectedClients.delete(deviceId);
        return {
            success: false,
            message: `Device ${deviceId} connection is not open`
        };
    }

    try {
        // Format data untuk dikirim ke device
        const payload = {
            type: 'command',
            device_id: deviceId,
            command,
            timestamp: new Date().toISOString()
        };

        // Set timer status jika command start
        if (command === 'start') {
            activeTimers.add(deviceId);
        } else if (command === 'stop') {
            activeTimers.delete(deviceId);
        }

        // Kirim data
        client.send(JSON.stringify(payload));
        console.log(`Command ${command} sent to device ${deviceId}:`, payload);
        
        return {
            success: true,
            message: `Command ${command} sent to device ${deviceId}`,
            data: payload
        };
    } catch (error) {
        console.error(`Error sending command to device ${deviceId}:`, error);
        return {
            success: false,
            message: `Error sending command: ${error.message}`
        };
    }
};

// Fungsi untuk mendapatkan status koneksi
const getConnectionStatus = () => {
    // Ubah format data untuk memastikan konsistensi dengan device_id
    const devices = Array.from(connectedClients.keys()).map(deviceId => ({
        device_id: deviceId,
        deviceId: deviceId,
        status: isTimerActive(deviceId) ? 'on' : 'off'
    }));

    console.log('Current connected devices:', devices);

    return {
        totalClients: wss ? wss.clients.size : 0,
        registeredDevices: connectedClients.size,
        devices: devices
    };
};

module.exports = {
    initWebSocketServer,
    sendToESP32,
    sendCommand,
    getConnectionStatus,
    isTimerActive
};