# Perbaikan Status Timer - Disconnect/Reconnect

## Masalah yang Ditemukan

Ketika device disconnect saat timer berjalan, status tetap menunjukkan "on" padahal seharusnya "pause". Ini terjadi karena:

1. **Auto Resume saat Reconnect**: Ketika device reconnect, timer otomatis dipindahkan dari `pausedDevices` ke `activeTimers`
2. **Status Logic**: Status "on" hanya berdasarkan `activeTimers`, tidak mempertimbangkan `pausedDevices`

## Solusi yang Diterapkan

### 1. Perbaikan Logika Reconnect

**Sebelum:**
```javascript
// Auto resume saat reconnect
if (pausedDevices.has(deviceId)) {
    pausedDevices.delete(deviceId);
    activeTimers.add(deviceId);
    console.log(`Timer for device ${deviceId} resumed after reconnect`);
}
```

**Sesudah:**
```javascript
// Jangan auto resume, biarkan user yang memutuskan
if (pausedDevices.has(deviceId)) {
    console.log(`Device ${deviceId} reconnected with paused timer`);
    // Timer tetap di pausedDevices sampai user manual resume
}
```

### 2. Perbaikan Status Logic

**Status Mapping:**
- `on`: Device memiliki timer aktif (`activeTimers.has(deviceId)`)
- `pause`: Device memiliki timer di-pause (`pausedDevices.has(deviceId)`)
- `pause_disconnected`: Device di-pause tapi tidak terkoneksi
- `off`: Device tidak memiliki timer aktif

### 3. Debug Logging

Ditambahkan logging untuk debugging:
```javascript
console.log('Active timers:', Array.from(activeTimers));
console.log('Paused devices:', Array.from(pausedDevices));
```

## Alur Kerja yang Diperbaiki

### Skenario: Device Disconnect saat Timer Berjalan

1. **Timer Berjalan** → Status: "on"
2. **Device Disconnect** → Timer dipindahkan ke `pausedDevices`
3. **Status Update** → Status: "pause"
4. **Device Reconnect** → Timer tetap di `pausedDevices`
5. **Status Update** → Status: "pause" (tidak berubah)
6. **User Manual Resume** → Timer dipindahkan ke `activeTimers`
7. **Status Update** → Status: "on"

## Testing

### Endpoint untuk Testing

**Status Umum:**
```bash
GET /api/connection/status
```

**Status Detail:**
```bash
GET /api/connection/timer-status
```

### Expected Response

**Ketika Device Pause:**
```json
{
  "totalClients": 1,
  "registeredDevices": 1,
  "devices": [
    {
      "deviceId": "ecaed6cdda0",
      "status": "pause",
      "isTimerActive": false,
      "isTimerPaused": true,
      "canResume": true
    }
  ]
}
```

**Ketika Device Active:**
```json
{
  "totalClients": 1,
  "registeredDevices": 1,
  "devices": [
    {
      "deviceId": "ecaed6cdda0",
      "status": "on",
      "isTimerActive": true,
      "isTimerPaused": false,
      "canResume": false
    }
  ]
}
```

## Keuntungan Perbaikan

1. **Status Akurat**: Status mencerminkan kondisi timer yang sebenarnya
2. **User Control**: User yang memutuskan kapan resume timer
3. **Debugging**: Logging yang lebih detail untuk troubleshooting
4. **Consistency**: Status konsisten antara disconnect dan reconnect

## File yang Diperbarui

1. **`src/wsClient.js`** - Perbaikan logika reconnect dan status
2. **`src/routes/connection.route.js`** - Endpoint untuk debugging status

## Testing Scenarios

1. **Start Timer** → Verify status "on"
2. **Disconnect Device** → Verify status "pause"
3. **Reconnect Device** → Verify status tetap "pause"
4. **Manual Resume** → Verify status "on"
5. **Stop Timer** → Verify status "off" 