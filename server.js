// --- server.js ---
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config(); // ✅ Load .env variables

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CORS Configuration
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "https://dentabase.org",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    credentials: true,
  })
);

app.options("*", cors());
app.use(express.json());

// ✅ Root check
app.get("/", (req, res) => {
  res.status(200).send("✅ Dental API Server is running!");
});

// ------------------------------------------------------------
// 📧 MAILEROO Email Route
// ------------------------------------------------------------
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    if (!to) return res.status(400).json({ error: "Missing email address" });

    console.log("📧 Sending email to:", to);

    const response = await fetch("https://smtp.maileroo.com/api/v2/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MAILEROO_TOKEN}`,
      },
      body: JSON.stringify({
        from: `Dentabase <${process.env.MAILEROO_FROM}>`,
        to,
        subject,
        html,
      }),
    });

    const result = await response.json();
    console.log("✅ Maileroo response:", result);
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ------------------------------------------------------------
// 📱 IPROG SMS Route
// ------------------------------------------------------------
app.post("/send-sms", async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    if (!phoneNumber)
      return res.status(400).json({ error: "Missing phoneNumber" });

    console.log("📱 Sending SMS to:", phoneNumber);

    const response = await fetch("https://api.iprog.com.ph/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.IPROG_API_TOKEN}`,
      },
      body: JSON.stringify({
        number: phoneNumber,
        message,
      }),
    });

    const result = await response.json();
    console.log("✅ iProg response:", result);
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("❌ Error sending SMS:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ------------------------------------------------------------
// 🔐 OTP Route (Email Only)
// ------------------------------------------------------------
app.post("/send-otp", async (req, res) => {
  try {
    const { destination, otp } = req.body; // only email OTP
    if (!destination || !otp)
      return res.status(400).json({ error: "Missing required fields" });

    console.log(`🔐 Sending OTP email to ${destination}`);

    const response = await fetch("https://smtp.maileroo.com/api/v2/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MAILEROO_TOKEN}`,
      },
      body: JSON.stringify({
        from: `Dentabase <${process.env.MAILEROO_FROM}>`,
        to: destination,
        subject: "🔐 Your Dentabase Verification Code",
        html: `
          <h2>Verification Code</h2>
          <p>Your OTP code is:</p>
          <h1 style="color:#0f766e">${otp}</h1>
          <p>This code expires in 5 minutes.</p>
        `,
      }),
    });

    const result = await response.json();
    console.log("✅ OTP Email sent:", result);
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("❌ Error sending OTP email:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
