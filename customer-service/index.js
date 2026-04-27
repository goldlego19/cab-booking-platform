const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const users = []; 
const inbox = [];


app.post('/register', async (req, res) => {
    const { firstName, surname, email, password } = req.body;
    
    // Check if user exists
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now().toString(), firstName, surname, email, password: hashedPassword };
    users.push(newUser);

    res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ message: 'Login successful', token });
});

app.get('/profile/:id', (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Don't send the password back!
    const { password, ...safeUser } = user;
    res.json(safeUser);
});

app.get('/inbox/:email', (req, res) => {
    const userNotifications = inbox.filter(n => n.email === req.params.email);
    res.json(userNotifications);
});

app.post('/events', (req, res) => {
    const { type, data } = req.body;
    console.log(`[Customer Service] Event Received: ${type}`);

    if (type === 'RideReady' || type === 'DiscountAvailable') {
        // Save notification to inbox
        inbox.push({
            email: data.userEmail,
            message: data.message,
            timestamp: new Date()
        });
        console.log(`[Customer Service] Notification saved for ${data.userEmail}`);
    }

    res.send({ status: 'OK' });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Customer Service running on http://localhost:${PORT}`));