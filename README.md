# MQTT Weather Data Storage & Visualization

This application collects temperature and humidity data from an MQTT broker, stores it in an SQLite database, and visualizes the data in real-time with 5-minute averaging.

## Features

- Real-time data collection from MQTT broker
- Data storage in SQLite database
- Real-time visualization of temperature and humidity
- 5-minute averaging of temperature and humidity data
- Historical data viewing with customizable time ranges
- Responsive design that works on desktop and mobile

## Technical Architecture

### Backend
- Node.js with Express
- MQTT client for data collection
- SQLite for data storage
- Socket.io for real-time data updates to the frontend

### Frontend
- HTML/CSS/JavaScript
- Chart.js for data visualization
- Socket.io client for real-time updates
- Responsive design

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup

1. Clone the repository:
```
git clone https://github.com/yourusername/mqtt-weather-app.git
cd mqtt-weather-app
```

2. Install dependencies:
```
npm install
```

3. Start the application:
```
npm start
```

4. Access the dashboard at `http://localhost:3000`

## Database Structure

The application uses an SQLite database with the following tables:

### weather_data
Stores raw MQTT data:
- id: Primary key
- topic: MQTT topic
- value: Numeric value
- timestamp: Time when the data was received

### weather_averages
Stores 5-minute averages:
- id: Primary key
- temperature: Average temperature
- humidity: Average humidity
- timestamp: Time when the average was calculated

## MQTT Configuration

The application connects to an MQTT broker at `ws://157.173.101.159:9001` and subscribes to:
- `/work_group_01/room_temp/temperature` for temperature data
- `/work_group_01/room_temp/humidity` for humidity data

## API Endpoints

- `GET /api/latest`: Returns the latest temperature and humidity values
- `GET /api/history?hours=24`: Returns historical 5-minute averages for the specified number of hours

## Development

For development with auto-restart on file changes:
```
npm run dev
```

## Customization

### Changing MQTT Broker
To connect to a different MQTT broker, modify the connection URL in `app.js`:
```javascript
const mqttClient = mqtt.connect('ws://your-broker-url:port');
```

### Modifying Chart Settings
Chart settings can be adjusted in the `index.html` file within the chart configuration objects.

## License
MIT

## Author
Elvin HUMURA
