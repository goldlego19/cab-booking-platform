const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// A hardcoded list of your local microservices that need to listen to events
const subscribers = [
    'http://localhost:4001/events', // Customer Service
    'http://localhost:4002/events', // Booking Service
    'http://localhost:4003/events', // Payment Service
];

app.post('/events', async (req, res) => {
    const event = req.body; 
    console.log(`[Event Bus] Broadcasting Event: ${event.type}`);

    // Fire and forget - send the event to all subscribers
    subscribers.forEach(async (sub) => {
        try {
            await axios.post(sub, event);
        } catch (err) {
            console.error(`[Event Bus] Failed to reach ${sub}: ${err.message}`);
        }
    });

    res.send({ status: 'Event processed' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Event Bus running on http://localhost:${PORT}`);
});