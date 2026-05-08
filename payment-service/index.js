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

// --- HELPER FUNCTIONS FOR MULTIPLIERS ---

function getCabMultiplier(cabType) {
    if (cabType === 'Premium') return 1.2;
    if (cabType === 'Executive') return 1.4;
    return 1; // Default to Economic
}

function getDaytimeMultiplier(isoDateString) {
    const date = new Date(isoDateString);
    const hour = date.getHours();
    if (hour >= 0 && hour < 8) return 1.2;
    return 1;
}

function getPassengersMultiplier(passengers) {
    if (passengers >= 1 && passengers <= 4) return 1;
    if (passengers >= 5 && passengers <= 8) return 2;
    throw new Error('More than 8 passengers are not allowed');
}

// --- ROUTES ---

// 1. Process Payment / Calculate Final Fare
app.post('/pay', async (req, res) => {
    try {
        // THE FIX IS HERE: Added cardNumber to the end of this line!
        const { userId, email, dep_lat, dep_lng, arr_lat, arr_lng, cabType, pickupTime, passengers, applyDiscount, cardNumber } = req.body;

        // Create a masked version of the card safely
        const maskedCard = cardNumber ? `**** **** **** ${cardNumber.slice(-4)}` : '**** **** **** 0000';

        // Step A: Validate Passenger Count
        let passengersMultiplier;
        try {
            passengersMultiplier = getPassengersMultiplier(passengers);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }

        // Step B: Call Fare Estimation MS for Base Price
        const fareResponse = await axios.get(`${process.env.FARE_SERVICE_URL}/estimate`, {
            params: { dep_lat, dep_lng, arr_lat, arr_lng }
        });
        
        const baseFare = fareResponse.data.priceInEuros;

        // Step C: Get Remaining Multipliers
        const cabMultiplier = getCabMultiplier(cabType);
        const daytimeMultiplier = getDaytimeMultiplier(pickupTime);

        // Step D: Apply Formula: cab_fare * cab_multiplier * daytime_multiplier * passengers_multiplier
        let totalBeforeDiscount = baseFare * cabMultiplier * daytimeMultiplier * passengersMultiplier;

        // Step E: Apply the 25% Discount if eligible
        let discountAmount = 0;
        if (applyDiscount) {
            discountAmount = totalBeforeDiscount * 0.25; 
        }

        const finalTotal = totalBeforeDiscount - discountAmount;

        // Step F: Audit Trail - Save transaction to Firestore
        const paymentRef = await db.collection('payments').add({
            userId,
            email,
            baseFare,
            multipliers: {
                cab: cabMultiplier,
                time: daytimeMultiplier,
                passengers: passengersMultiplier
            },
            discountApplied: discountAmount,
            finalTotal: parseFloat(finalTotal.toFixed(2)),
            status: 'Completed',
            paymentMethod: maskedCard, // <--- Saving the masked card to Firestore
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // Step G: Return the receipt
        res.status(201).json({
            message: 'Payment processed successfully',
            transactionId: paymentRef.id,
            paymentMethod: maskedCard, // <--- Sending the masked card back to Booking MS
            finalTotal: parseFloat(finalTotal.toFixed(2)),
            breakdown: {
                baseFare,
                discount: parseFloat(discountAmount.toFixed(2))
            }
        });

    } catch (error) {
        console.error('[Payment MS] Error:', error.message);
        res.status(500).json({ error: 'Failed to process payment' });
    }
});

// 2. Retrieve Payment Details for a User
app.get('/payments/:email', async (req, res) => {
    try {
        const snapshot = await db.collection('payments').where('email', '==', req.params.email).get();
        const payments = [];
        snapshot.forEach(doc => payments.push({ id: doc.id, ...doc.data() }));
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch payment details' });
    }
});

const PORT = process.env.PORT || 4003;

// Listen for internal events
app.post('/events', (req, res) => {
    res.send({ status: 'OK' });
});
app.listen(PORT, () => console.log(`Payment Service running on http://localhost:${PORT}`));