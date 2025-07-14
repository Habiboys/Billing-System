const WebSocket = require('ws');
const { Device } = require('./models');

let wss;
let connectedClients = new Map(); // Menyimpan client berdasarkan deviceId
let activeTimers = new Set(); // Menyimpan device yang sedang aktif timernya
let pausedDevices = new Set(); // Menyimpan device yang timer-nya dihentikan
let lastActivityTime = new Map(); // Menyimpan waktu aktivitas terakhir per device
let mobileClients = new Set(); // Menyimpan koneksi mobile untuk notifikasi
let deviceDisconnectCallbacks = new Map(); // Callback untuk handle disconnect
// Hapus: let sseClients = new Map(); // Menyimpan SSE clients untuk mobile notifications

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
    }, 1000); // Check setiap 1 detik - untuk timer yang akurat

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
                
                // Semua penggunaan device_id diganti menjadi deviceId (camelCase)
                const deviceId = data.deviceId;
                
                // Update waktu aktivitas terakhir
                if (deviceId) {
                    lastActivityTime.set(deviceId, Date.now());
                }
                
                // Handle mobile client registration
                if (data.type === 'mobile_client') {
                    mobileClients.add(ws);
                    console.log('Mobile client registered for notifications');
                    return;
                }
                
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
                    
                    // Cek apakah device memiliki timer yang di-pause
                    if (pausedDevices.has(deviceId)) {
                        console.log(`Device ${deviceId} reconnected with paused timer`);
                        
                        // Jangan otomatis resume, biarkan user yang memutuskan
                        // Timer tetap di pausedDevices sampai user manual resume
                        
                        // Kirim notifikasi ke mobile client bahwa device reconnect dengan timer paused
                        notifyMobileClients({
                            type: 'device_connect',
                            deviceId: deviceId,
                            timestamp: new Date().toISOString(),
                            detail: {
                                message: `Device ${deviceId} reconnected with paused timer`,
                                canResume: true
                            }
                        });
                    }
                    
                    // Kirim konfirmasi ke device
                    ws.send(JSON.stringify({
                        type: 'registration',
                        status: 'success',
                        deviceId: deviceId
                    }));
                    
                    // Kirim notifikasi ke mobile client bahwa device connect (hanya jika tidak ada timer paused)
                    if (!pausedDevices.has(deviceId)) {
                        notifyMobileClients({
                            type: 'device_connect',
                            deviceId: deviceId,
                            timestamp: new Date().toISOString(),
                            detail: {
                                message: `Device ${deviceId} connected`
                            }
                        });
                    }
                }
                
                // Handle status update dari ESP32
                if (data.status === 'relay_off') {
                    const deviceId = data.deviceId;
                    console.log(`Timer completed for device ${deviceId}. Relay turned off.`);
                    // Hapus dari active timers karena timer sudah selesai
                    activeTimers.delete(deviceId);
                    pausedDevices.delete(deviceId);
                } else if (data.status === 'timer_paused') {
                    const deviceId = data.deviceId;
                    console.log(`Timer paused for device ${deviceId}`);
                    activeTimers.delete(deviceId);
                    pausedDevices.add(deviceId);
                } else if (data.status === 'timer_ended') {
                    const deviceId = data.deviceId;
                    console.log(`Timer ended for device ${deviceId}`);
                    activeTimers.delete(deviceId);
                    pausedDevices.delete(deviceId);
                }
                
            } catch (error) {
                console.error('Error processing message:', error);
                console.log('Raw message:', message.toString());
            }
        });
        
        ws.on('close', async () => {
            console.log('Client disconnected');
            
            // Check if it's a mobile client
            if (mobileClients.has(ws)) {
                mobileClients.delete(ws);
                console.log('Mobile client disconnected');
                return;
            }
            
            // Remove dari mapping untuk IoT device
            for (let [deviceId, client] of connectedClients.entries()) {
                if (client === ws) {
                    connectedClients.delete(deviceId);
                    console.log(`Device ${deviceId} unregistered`);
                    
                    // Jika device sedang memiliki timer aktif, jangan hapus dari activeTimers
                    // tapi tambahkan ke pausedDevices untuk menandakan timer di-pause
                    if (activeTimers.has(deviceId)) {
                        activeTimers.delete(deviceId);
                        pausedDevices.add(deviceId);
                        console.log(`Timer for device ${deviceId} paused due to disconnect`);
                    }
                    
                    // Kirim notifikasi ke mobile client bahwa device disconnect
                    notifyMobileClients({
                        type: 'device_disconnect',
                        deviceId: deviceId,
                        timestamp: new Date().toISOString(),
                        detail: {
                            message: `Device ${deviceId} disconnected`,
                            reason: 'connection_lost'
                        }
                    });
                    
                    // Update device status di database - jangan ubah timerStatus menjadi 'stop'
                    // tapi simpan informasi bahwa device disconnect
                    const device = await Device.findByPk(deviceId);
                    if (device && device.timerStatus === 'start') {
                        const now = new Date();
                        const elapsed = Math.floor((now - device.timerStart) / 1000);
                        await device.update({
                            timerElapsed: elapsed,
                            lastPausedAt: now,
                            // Jangan ubah timerStatus, biarkan tetap 'start' agar bisa dilanjutkan
                        });
                    }
                    
                    // Execute disconnect callback if exists
                    if (deviceDisconnectCallbacks.has(deviceId)) {
                        const callback = deviceDisconnectCallbacks.get(deviceId);
                        callback(deviceId, 'connection_lost');
                    }
                    
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

// Fungsi untuk mengecek apakah device memiliki timer yang di-pause
const isTimerPaused = (deviceId) => {
    return pausedDevices.has(deviceId);
};

// Fungsi untuk mengecek apakah device bisa di-resume
const canResumeTimer = (deviceId) => {
    return pausedDevices.has(deviceId);
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
    
    const deviceId = data.deviceId || data.deviceId;
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

    // Cek apakah device memiliki timer yang di-pause
    if (isTimerPaused(deviceId)) {
        return {
            success: false,
            message: `Device ${deviceId} memiliki timer yang di-pause. Gunakan command start untuk melanjutkan timer yang ada.`
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
        // Standardize payload format untuk timer baru
        const payload = {
            type: 'command',
            deviceId: deviceId,
            command: 'start',  // Tambahkan command start untuk konsistensi
            timer,  // Durasi timer dalam detik
            timestamp: new Date().toISOString()
        };

        // Set timer status
        activeTimers.add(deviceId);

        // Kirim data
        client.send(JSON.stringify(payload));
        console.log(`Timer started for device ${deviceId}:`, payload);
        
        return {
            success: true,
            message: `Timer started for device ${deviceId}`,
            data: payload
        };
    } catch (error) {
        console.error(`Error starting timer for device ${deviceId}:`, error);
        return {
            success: false,
            message: `Error starting timer: ${error.message}`
        };
    }
};

// Fungsi untuk mengirim perintah start/stop ke ESP32 (termasuk resume timer)
const sendCommand = async (data) => {
    if (!wss) {
        return {
            success: false,
            message: 'WebSocket server not initialized'
        };
    }
    
    const deviceId = data.deviceId || data.deviceId;
    const { command } = data;
    
    // Validasi input
    if (!deviceId) {
        return {
            success: false,
            message: 'Device ID is required'
        };
    }

    if (!command || !['start', 'stop', 'end'].includes(command)) {
        return {
            success: false,
            message: 'Command harus berupa "start", "stop", atau "end"'
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
    
    // Jika command start dan device memiliki timer yang di-pause, handle resume timer
    if (command === 'start' && isTimerPaused(deviceId)) {
        try {
            // Import model untuk handle resume timer
            const { Device, Transaction } = require('./models');
            
            const device = await Device.findByPk(deviceId);
            if (device && device.timerStatus === 'start' && device.lastPausedAt) {
                const now = new Date();
                const pauseDuration = now - device.lastPausedAt;
                
                // Update timer start dengan menambahkan durasi pause
                await device.update({
                    timerStart: new Date(device.timerStart.getTime() + pauseDuration),
                    lastPausedAt: null
                });

                // Cari transaksi aktif dan update status
                const activeTransaction = await Transaction.findOne({
                    where: {
                        deviceId: deviceId,
                        end: null
                    },
                    order: [['createdAt', 'DESC']]
                });

                if (activeTransaction && activeTransaction.status) {
                    await activeTransaction.update({
                        status: 'active'
                    });
                }

                // Notify mobile clients
                notifyMobileClients({
                    type: 'timer_resumed',
                    deviceId: deviceId,
                    timestamp: now.toISOString(),
                    detail: {
                        message: `Timer for device ${deviceId} resumed successfully`,
                        transactionId: activeTransaction?.id
                    }
                });

                console.log(`Timer resumed for device ${deviceId} with pause duration: ${pauseDuration}ms`);
            }
        } catch (error) {
            console.error(`Error handling resume timer for device ${deviceId}:`, error);
            // Lanjutkan dengan command biasa meskipun ada error di resume
        }
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
        // Pada bagian pengiriman payload ke device (sendToESP32, sendCommand)
        const payload = {
            type: 'command',
            deviceId: deviceId,
            command,
            timestamp: new Date().toISOString()
        };

        // Update timer status
        if (command === 'start') {
            activeTimers.add(deviceId);
            pausedDevices.delete(deviceId);
        } else if (command === 'stop') {
            activeTimers.delete(deviceId);
            pausedDevices.add(deviceId);
        } else if (command === 'end') {
            activeTimers.delete(deviceId);
            pausedDevices.delete(deviceId);
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

// Fungsi untuk notifikasi mobile clients (WebSocket saja)
const notifyMobileClients = (data) => {
    // Notify WebSocket mobile clients
    mobileClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(data));
                console.log('Notification sent to WebSocket mobile client:', data);
            } catch (error) {
                console.error('Error sending notification to WebSocket mobile client:', error);
                mobileClients.delete(client);
            }
        } else {
            mobileClients.delete(client);
        }
    });
};

// Fungsi untuk mengirim perintah add time ke ESP32
const sendAddTime = (data) => {
    if (!wss) {
        return {
            success: false,
            message: 'WebSocket server not initialized'
        };
    }
    
    const deviceId = data.deviceId;
    const { additionalTime } = data;
    
    // Validasi input
    if (!deviceId) {
        return {
            success: false,
            message: 'Device ID is required'
        };
    }

    if (!additionalTime || typeof additionalTime !== 'number' || additionalTime <= 0) {
        return {
            success: false,
            message: 'Additional time must be a positive number'
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
    if (!isTimerActive(deviceId)) {
        return {
            success: false,
            message: `Device ${deviceId} tidak memiliki timer yang aktif`
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
        const payload = {
            type: 'add_time',
            deviceId: deviceId,
            additionalTime: additionalTime,
            timestamp: new Date().toISOString()
        };

        // Kirim data
        client.send(JSON.stringify(payload));
        console.log(`Add time command sent to device ${deviceId}:`, payload);
        
        return {
            success: true,
            message: `Add time command sent to device ${deviceId}`,
            data: payload
        };
    } catch (error) {
        console.error(`Error sending add time to device ${deviceId}:`, error);
        return {
            success: false,
            message: `Error sending add time: ${error.message}`
        };
    }
};

// Fungsi untuk register callback ketika device disconnect
const onDeviceDisconnect = (deviceId, callback) => {
    deviceDisconnectCallbacks.set(deviceId, callback);
};

// Fungsi untuk mendapatkan status koneksi
const getConnectionStatus = () => {
    // Ubah format data untuk memastikan konsistensi dengan device_id
    const devices = Array.from(connectedClients.keys()).map(deviceId => {
        let status = 'off'; // Default status
        
        // Cek status berdasarkan timer state
        if (isTimerActive(deviceId)) {
            status = 'on';
        } else if (pausedDevices.has(deviceId)) {
            status = 'pause';
        }
        
        return {
            deviceId: deviceId,
            status: status
        };
    });

    // Tambahkan device yang di-pause tapi tidak terkoneksi
    pausedDevices.forEach(deviceId => {
        if (!connectedClients.has(deviceId)) {
            devices.push({
                deviceId: deviceId,
                status: 'pause_disconnected'
            });
        }
    });

    console.log('Current connected devices:', devices);
    console.log('Active timers:', Array.from(activeTimers));
    console.log('Paused devices:', Array.from(pausedDevices));

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
    sendAddTime,
    getConnectionStatus,
    isTimerActive,
    isTimerPaused,
    canResumeTimer,
    notifyMobileClients,
    onDeviceDisconnect,
    // Export internal variables untuk debugging
    connectedClients,
    activeTimers,
    pausedDevices,
    lastActivityTime
};