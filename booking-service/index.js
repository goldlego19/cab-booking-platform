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
        
        // Step A: Call Payment MS to calculate the final fare and log the transaction
        console.log('[Booking MS] Requesting payment calculation...');
        const paymentResponse = await axios.post(`${process.env.PAYMENT_SERVICE_URL}/pay`, bookingData);
        
        const { transactionId, finalTotal, breakdown } = paymentResponse.data;

        // Step B: Save the official booking to Firestore
        const bookingRef = await db.collection('bookings').add({
            userId: bookingData.userId,
            email: bookingData.email,
            origin: { lat: bookingData.dep_lat, lng: bookingData.dep_lng },
            destination: { lat: bookingData.arr_lat, lng: bookingData.arr_lng },
            cabType: bookingData.cabType,
            passengers: bookingData.passengers,
            pickupTime: bookingData.pickupTime,
            transactionId: transactionId,
            pricePaid: finalTotal,
            status: 'Confirmed',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[Booking MS] Booking saved: ${bookingRef.id}`);

        // Step C: Fire the 'BookingCreated' event to the Event Bus
        try {
            await axios.post(`${process.env.EVENT_BUS_URL}/events`, {
                type: 'BookingCreated',
                data: {
                    userEmail: bookingData.email,
                    bookingId: bookingRef.id,
                    message: `Your ${bookingData.cabType} cab is confirmed for ${finalTotal} Euros.`
                }
            });
            console.log('[Booking MS] Event dispatched to Event Bus');
        } catch (eventError) {
            console.error('[Booking MS] Warning: Failed to reach Event Bus', eventError.message);
            // We don't fail the booking if the event bus is temporarily down
        }

        // Step D: Return success to the Frontend
        res.status(201).json({
            message: 'Booking confirmed successfully',
            bookingId: bookingRef.id,
            pricePaid: finalTotal,
            receipt: breakdown
        });

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