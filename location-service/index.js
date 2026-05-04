const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialise Firestore
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const app = express();
app.use(express.json());
app.use(cors());

// --- ROUTES ---

// 1. Add a favourite pickup location
app.post('/locations', async (req, res) => {
    try {
        const { email, address, latitude, longitude } = req.body;
        
        const newLocationRef = await db.collection('favourite_locations').add({
            email,
            address,
            latitude,
            longitude,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({ message: 'Location added successfully', id: newLocationRef.id });
    } catch (error) {
        res.status(500).json({ error: 'Server error adding location' });
    }
});

// 2. Get favourite pickup locations for a user
app.get('/locations/:email', async (req, res) => {
    try {
        const snapshot = await db.collection('favourite_locations').where('email', '==', req.params.email).get();
        const locations = [];
        snapshot.forEach(doc => locations.push({ id: doc.id, ...doc.data() }));
        
        res.json(locations);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching locations' });
    }
});

// 3. Remove a favourite pickup location
app.delete('/locations/:id', async (req, res) => {
    try {
        await db.collection('favourite_locations').doc(req.params.id).delete();
        res.json({ message: 'Location removed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error removing location' });
    }
});

// 4. Get Weather Forecast for a location
app.get('/weather', async (req, res) => {
    const { q } = req.query; // 'q' can be a city name or latitude,longitude
    if (!q) return res.status(400).json({ error: 'Location query (q) is required' });

    try {
        // Using the WeatherAPI via RapidAPI as per the assignment brief
        const options = {
            method: 'GET',
            url: 'https://weatherapi-com.p.rapidapi.com/current.json',
            params: { q: q },
            headers: {
                'X-RapidAPI-Key': process.env.WEATHER_API_KEY,
                'X-RapidAPI-Host': 'weatherapi-com.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        res.json({
            location: response.data.location.name,
            temperature_c: response.data.current.temp_c,
            condition: response.data.current.condition.text,
            icon: response.data.current.condition.icon
        });
    } catch (error) {
        console.error('Weather API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

const PORT = process.env.PORT || 4004;
app.listen(PORT, () => console.log(`Location Service running on http://localhost:${PORT}`));