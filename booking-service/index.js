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

// 1. Create a New Booking
app.post('/bookings', async (req, res) => {
    try {
        const bookingData = req.body; 
        // bookingData now contains { ..., cardNumber } from the frontend

        console.log('[Booking MS] Requesting payment calculation...');
        
        // Pass the entire bookingData (including cardNumber) to Payment MS
        const paymentResponse = await axios.post(`${process.env.PAYMENT_SERVICE_URL}/pay`, bookingData);
        
        const { transactionId, finalTotal, breakdown, paymentMethod } = paymentResponse.data;

        // Save the booking to Firestore with the NEW paymentMethod field
        const bookingRef = await db.collection('bookings').add({
            email: bookingData.email,
            origin: { lat: bookingData.dep_lat, lng: bookingData.dep_lng },
            destination: { lat: bookingData.arr_lat, lng: bookingData.arr_lng },
            cabType: bookingData.cabType,
            passengers: bookingData.passengers,
            pickupTime: bookingData.pickupTime,
            transactionId: transactionId,
            paymentMethod: paymentMethod, // This is the masked string from Payment MS
            pricePaid: finalTotal,
            status: 'Confirmed',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // ... rest of your event bus and response logic
    } catch (error) {
        console.error('[Booking MS] Error:', error.message);
        res.status(500).json({ error: 'Failed to process booking' });
    }
});

// 2. View Past & Current Bookings
app.get('/bookings/:email', async (req, res) => {
    try {
        const snapshot = await db.collection('bookings')
            .where('email', '==', req.params.email)
            .get();
            
        const bookings = [];
        snapshot.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));
        
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// 3. Listen for internal events (if needed later)
app.post('/events', (req, res) => {
    console.log(`[Booking MS] Event Received: ${req.body.type}`);
    res.send({ status: 'OK' });
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`Booking Service running on http://localhost:${PORT}`));