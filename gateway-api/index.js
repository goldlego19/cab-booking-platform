const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// --- AXIOS FORWARDING HELPER ---
const forwardRequest = async (req, res, targetBaseUrl) => {
    try {
        const targetUrl = `${targetBaseUrl}${req.originalUrl}`;
        console.log(`[Gateway] Forwarding ${req.method} to ${targetUrl}`);

        const cleanHeaders = { ...req.headers };
        delete cleanHeaders.host;
        delete cleanHeaders['content-length'];
        delete cleanHeaders['accept-encoding']; 

        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.method !== 'GET' ? req.body : undefined,
            headers: cleanHeaders,
            validateStatus: () => true 
        });

        res.status(response.status).json(response.data);

    } catch (error) {
        console.error(`[Gateway Error] NETWORK FAILURE: Cannot connect to ${targetBaseUrl}.`);
        res.status(502).json({ error: `Bad Gateway: Microservice at ${targetBaseUrl} is offline.` });
    }
};

// --- ROUTING RULES ---

app.use(['/login', '/register', '/inbox'], (req, res) => {
    forwardRequest(req, res, 'https://customer-service-88100526402.europe-west1.run.app');
});

app.use('/bookings', (req, res) => {
    forwardRequest(req, res, 'https://booking-service-88100526402.europe-west1.run.app');
});

app.use('/estimate', (req, res) => {
    forwardRequest(req, res, 'https://fare-estimation-service-88100526402.europe-west1.run.app');
});

app.use(['/locations', '/cities', '/weather'], (req, res) => {
    forwardRequest(req, res, 'https://location-service-88100526402.europe-west1.run.app');
});

app.use((req, res) => {
    res.status(404).json({ error: 'API Gateway Route Not Found' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`API Gateway is running on ${PORT}`);
});