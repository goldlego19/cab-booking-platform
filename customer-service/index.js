const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
app.use(express.json());
app.use(cors());


app.post('/register', async (req, res) => {
    try {
        const { firstName, surname, email, password } = req.body;
        
        // Check if user exists in the cloud
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).get();
        if (!snapshot.empty) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Let Firestore generate a secure, unique alphanumeric ID
        const newUserRef = usersRef.doc(); 
        await newUserRef.set({
            firstName,
            surname,
            email,
            password: hashedPassword,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({ message: 'User registered successfully', userId: newUserRef.id });
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// 2. Login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const snapshot = await db.collection('users').where('email', '==', email).get();

        if (snapshot.empty) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const userDoc = snapshot.docs[0].data();
        const passwordMatch = await bcrypt.compare(password, userDoc.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // THE CRITICAL PIECE: We must respond to the frontend!
        // (Using a simple token here, replace with jsonwebtoken if you prefer)
        const sessionToken = `token_${Date.now()}`; 

        res.status(200).json({ 
            message: 'Login successful',
            token: sessionToken,
            email: email,
            name: userDoc.firstName
        });

    } catch (error) {
        console.error('[Login Error]', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. Event Bus Listener
app.post('/events', async (req, res) => {
    const { type, data } = req.body;
    console.log(`[Customer Service] Event Received: ${type}`);

    if (type === 'BookingCreated') {
        const { userEmail, bookingId } = data;

        // --- Action 1: The 3-Minute "Cab Ready" Timer ---
        // We use setTimeout to wait exactly 3 minutes (180,000 milliseconds) before firing.
        // TIP: Change the 180000 to 10000 (10 seconds) while testing!
        setTimeout(async () => {
            try {
                await db.collection('inbox').add({
                    email: userEmail,
                    message: `Your cab is outside and ready! (Booking Ref: ${bookingId})`,
                    type: 'CabReady',
                    read: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`[Customer Service] 🚕 'CabReady' notification saved for ${userEmail}`);
            } catch (error) {
                console.error(`[Customer Service] Error saving CabReady:`, error);
            }
        }, 180000); // 3 minutes

        // --- Action 2: Check for Loyalty Discount ---
        // Check how many bookings this user has made to see if they earn the 25% discount.
        try {
            const bookingsSnapshot = await db.collection('bookings').where('email', '==', userEmail).get();
            const totalBookings = bookingsSnapshot.size;

            // If the total bookings is a multiple of 3 (3, 6, 9, etc.), grant a discount!
            if (totalBookings > 0 && totalBookings % 3 === 0) {
                await db.collection('inbox').add({
                    email: userEmail,
                    message: `Congratulations! You have completed ${totalBookings} rides. Enjoy a 25% discount on your next booking!`,
                    type: 'DiscountAvailable',
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`[Customer Service] 🎁 'DiscountAvailable' notification saved for ${userEmail}`);
            }
        } catch (error) {
            console.error(`[Customer Service] Error checking discount status:`, error);
        }
    }

    res.send({ status: 'OK' });
});

// 4. Fetch User Inbox
app.get('/inbox/:email', async (req, res) => {
    try {
        const snapshot = await db.collection('inbox')
            .where('email', '==', req.params.email)
            .get();
            
        let messages = [];
        snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
        
        // Sort newest to oldest in JavaScript (avoids needing to build a custom Firestore index!)
        messages.sort((a, b) => {
            const timeA = a.timestamp ? a.timestamp._seconds : 0;
            const timeB = b.timestamp ? b.timestamp._seconds : 0;
            return timeB - timeA;
        });

        res.json(messages);
    } catch (error) {
        console.error('[Customer MS] Error fetching inbox:', error);
        res.status(500).json({ error: 'Failed to fetch inbox' });
    }
});

app.put('/inbox/read/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const snapshot = await db.collection('inbox')
            .where('email', '==', email)
            .where('read', '==', false)
            .get();

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });

        await batch.commit();
        res.json({ message: 'All messages marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update messages' });
    }
});
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Customer Service running on http://localhost:${PORT}`));