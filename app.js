const express = require('express');
const mqtt = require('mqtt');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Setup SQLite database
const db = new sqlite3.Database('./weather_data.db');

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS weather_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT,
    value REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS weather_averages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temperature REAL,
    humidity REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Connect to MQTT broker
const mqttClient = mqtt.connect('ws://157.173.101.159:9001');

let latestTemperature = null;
let latestHumidity = null;
let temperatureReadings = [];
let humidityReadings = [];

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe('/work_group_01/room_temp/temperature');
  mqttClient.subscribe('/work_group_01/room_temp/humidity');
});

mqttClient.on('message', (topic, message) => {
  const value = parseFloat(message.toString());
  console.log(`Received: ${topic} → ${value}`);
  
  // Store in database
  db.run('INSERT INTO weather_data (topic, value) VALUES (?, ?)', [topic, value], function(err) {
    if (err) {
      console.error('Error storing data:', err);
    }
  });

  // Update latest values
  if (topic === '/work_group_01/room_temp/temperature') {
    latestTemperature = value;
    temperatureReadings.push({ value, timestamp: new Date() });
  } else if (topic === '/work_group_01/room_temp/humidity') {
    latestHumidity = value;
    humidityReadings.push({ value, timestamp: new Date() });
  }

  // Emit to connected clients
  io.emit('mqtt-data', { topic, value });
});

// Calculate and store 5-minute averages
setInterval(() => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  // Filter readings from the last 5 minutes
  const recentTempReadings = temperatureReadings.filter(r => r.timestamp > fiveMinutesAgo);
  const recentHumidReadings = humidityReadings.filter(r => r.timestamp > fiveMinutesAgo);
  
  if (recentTempReadings.length > 0 && recentHumidReadings.length > 0) {
    // Calculate averages
    const avgTemp = recentTempReadings.reduce((sum, r) => sum + r.value, 0) / recentTempReadings.length;
    const avgHumid = recentHumidReadings.reduce((sum, r) => sum + r.value, 0) / recentHumidReadings.length;
    
    // Store in database
    db.run('INSERT INTO weather_averages (temperature, humidity) VALUES (?, ?)', 
      [avgTemp, avgHumid], 
      function(err) {
        if (err) {
          console.error('Error storing averages:', err);
        } else {
          console.log(`Stored 5-min averages: Temp ${avgTemp.toFixed(2)}°C, Humidity ${avgHumid.toFixed(2)}%`);
          
          // Emit averages to clients
          io.emit('average-data', { 
            temperature: avgTemp, 
            humidity: avgHumid,
            timestamp: new Date() 
          });
        }
      }
    );
  }
  
  // Clean up old readings (older than 10 minutes)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  temperatureReadings = temperatureReadings.filter(r => r.timestamp > tenMinutesAgo);
  humidityReadings = humidityReadings.filter(r => r.timestamp > tenMinutesAgo);
  
}, 5 * 60 * 1000); // Run every 5 minutes

// API Routes
app.get('/api/latest', (req, res) => {
  res.json({
    temperature: latestTemperature,
    humidity: latestHumidity,
    timestamp: new Date()
  });
});

app.get('/api/history', (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  const query = `
    SELECT * FROM weather_averages 
    WHERE timestamp > datetime('now', '-${hours} hours')
    ORDER BY timestamp
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Send latest data to newly connected client
  if (latestTemperature !== null && latestHumidity !== null) {
    socket.emit('mqtt-data', { 
      topic: '/work_group_01/room_temp/temperature', 
      value: latestTemperature 
    });
    socket.emit('mqtt-data', { 
      topic: '/work_group_01/room_temp/humidity', 
      value: latestHumidity 
    });
  }
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});