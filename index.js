const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = 3000;

// In-memory OTP store (phone -> {otp, expiresAt})
const otpStore = {};

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Fast2SMS API Key - get it from https://www.fast2sms.com/dev/otp-api
const FAST2SMS_API_KEY = "HFKV9rApjJfIGtOeWoYMxCquDyUXi31cdSTnNh7B0PLgkQm4l23qKHnlBN4EmeCw5dpF0uDPR8U1aXJz";

app.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone number required" });

  const otp = generateOTP();
  const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes from now

  otpStore[phone] = { otp, expiresAt };

  try {
    const msg = `Your Mobista OTP is ${otp}. It expires in 2 minutes.`;
    // Call Fast2SMS API to send SMS
    await axios.get('https://www.fast2sms.com/dev/bulkV2', {
      params: {
        authorization: FAST2SMS_API_KEY,
        route: 'otp',
        numbers: phone,
        message: msg,
        variables_values: otp,
        flash: 0,
      }
    });

    res.json({ success: true, message: "OTP sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

app.post('/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: "Phone and OTP required" });

  const record = otpStore[phone];
  if (!record) return res.status(400).json({ error: "OTP not requested for this number" });

  if (Date.now() > record.expiresAt) {
    delete otpStore[phone];
    return res.status(400).json({ error: "OTP expired" });
  }

  if (record.otp === otp) {
    delete otpStore[phone];
    return res.json({ success: true, message: "OTP verified" });
  } else {
    return res.status(400).json({ error: "Invalid OTP" });
  }
});

app.listen(PORT, () => {
  console.log(`OTP server running on port ${PORT}`);
});
