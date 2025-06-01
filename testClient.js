const WebSocket = require('ws');

// Ganti 'localhost:8080' dengan alamat dan port server WebSocket Anda
const ws = new WebSocket('ws://localhost:3000');

ws.on('open', function open() {
  console.log('Connected to WebSocket server');
  // Kirim pesan setelah koneksi terbuka
  ws.send(JSON.stringify({ deviceId: 'test-device-node', message: 'Hello from Node.js client!' }));
});

ws.on('message', function message(data) {
  console.log('Message from server:', data.toString());
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

ws.on('close', function close(code, reason) {
  console.log('WebSocket connection closed:', code, reason.toString());
});

// Untuk mengirim pesan tambahan setelah beberapa waktu (opsional)
// setTimeout(() => {
//   if (ws.readyState === WebSocket.OPEN) {
//     ws.send(JSON.stringify({ deviceId: 'test-device-node', status: 'active' }));
//   }
// }, 3000);

// Untuk menutup koneksi setelah beberapa waktu (opsional)
// setTimeout(() => {
//   ws.close();
// }, 5000);