const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialise Firestore
if (!admin.apps.length) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log("Started locally with JSON key");
    } else {
        admin.initializeApp(); 
        console.log("Started in Google Cloud using Default Credentials");
    }
}
const db = admin.firestore();

const app = express();
app.use(express.json());
app.use(cors());


app.post('/bookings', async (req, res) => {
    try {
        const bookingData = req.body; 

        console.log('[Booking MS] Requesting payment calculation...');
        
        const paymentResponse = await axios.post(`${process.env.PAYMENT_SERVICE_URL}/pay`, bookingData);
        
        const { transactionId, finalTotal, breakdown, paymentMethod } = paymentResponse.data;

        const bookingRef = await db.collection('bookings').add({
            email: bookingData.email,
            originName: bookingData.originName,
            destinationName: bookingData.destinationName,
            origin: { lat: bookingData.dep_lat, lng: bookingData.dep_lng },
            destination: { lat: bookingData.arr_lat, lng: bookingData.arr_lng },
            cabType: bookingData.cabType,
            passengers: bookingData.passengers,
            pickupTime: bookingData.pickupTime,
            transactionId: transactionId,
            paymentMethod: paymentMethod,
            pricePaid: finalTotal,
            status: 'Confirmed',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[Booking MS] Booking saved: ${bookingRef.id}`);

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
           
        }

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

app.post('/events', (req, res) => {
    console.log(`[Booking MS] Event Received: ${req.body.type}`);
    res.send({ status: 'OK' });
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`Booking Service running on http://localhost:${PORT}`));