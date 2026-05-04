const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- ROUTES ---

// 1. Get Fare Estimate
app.get('/estimate', async (req, res) => {
    const { dep_lat, dep_lng, arr_lat, arr_lng } = req.query;

    if (!dep_lat || !dep_lng || !arr_lat || !arr_lng) {
        return res.status(400).json({ error: 'Missing coordinates.' });
    }

    try {
        const options = {
            method: 'GET',
            url: 'https://taxi-fare-calculator.p.rapidapi.com/search-geo',
            params: { dep_lat, dep_lng, arr_lat, arr_lng },
            headers: {
                'x-rapidapi-key': process.env.RAPIDAPI_KEY,
                'x-rapidapi-host': 'taxi-fare-calculator.p.rapidapi.com',
                'Content-Type': 'application/json'
            }
        };

        const response = await axios.request(options);
        const journey = response.data.journey;

        // Find the daytime fare and convert from cents to Euros
        const dayFareData = journey.fares.find(fare => fare.name === 'by Day');
        let basePriceInEuros = 0;
        
        if (dayFareData && dayFareData.price_in_cents !== 'n/a') {
            basePriceInEuros = dayFareData.price_in_cents / 100;
        }

        // Return strictly what the Payment MS needs
        res.json({
            distance: journey.distance,
            duration: journey.duration,
            priceInEuros: basePriceInEuros
        });

    } catch (error) {
        console.error('[Fare Estimation MS] API Error');
        res.status(500).json({ error: 'Failed to retrieve fare estimation from external API' });
    }
});

const PORT = process.env.PORT || 4005;
app.listen(PORT, () => console.log(`Fare Estimation Service running on http://localhost:${PORT}`));