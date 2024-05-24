const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const sequelize = require('./config/database');
const User = require('./models/User');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public_html'))); // Serve static files


sequelize.sync()
    .then(() => console.log('MySQL connected and tables created'))
    .catch(err => console.log(err));

const verificationCodes = {};

// Configure email service
// setup email transporter
// Configure email service with Sendinblue
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
        user: '75594b001@smtp-brevo.com',  // Sendinblue login email
        pass: 'LnEMXRpb6rWNkVc8' //Sendinblue API key
    }
});

// Define a route for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public_html', 'tutorial.html')); // Serve tutorial.html
});

app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        let user = await User.findOne({ where: { email } });
        if (user) {
            return res.json({ success: false, message: 'Email already registered' });
        }

        user = await User.create({ username, email, password });

        const verificationCode = crypto.randomBytes(3).toString('hex');
        verificationCodes[email] = verificationCode;

        const mailOptions = {
            from: 'your-email@gmail.com',
            to: email,
            subject: 'Email Verification',
            text: `Your verification code is: ${verificationCode}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.json({ success: false, message: 'Error sending email' });
            }
            console.log('Email sent:', info.response);
            res.json({ success: true, message: 'Verification code sent' });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/verify', async (req, res) => {
    const { verificationCode } = req.body;
    const email = Object.keys(verificationCodes).find(email => verificationCodes[email] === verificationCode);

    if (!email) {
        return res.json({ success: false, message: 'Invalid verification code' });
    }

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        user.verified = true;
        await user.save();
        delete verificationCodes[email];
        res.json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

