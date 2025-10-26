// --- server.js ---
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;



// ✅ Use the official cors middleware instead of manual headers
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

// ✅ VERY IMPORTANT — handle OPTIONS explicitly for all routes
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

    const response = await fetch("https://api.maileroo.net/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MAILEROO_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Dentabase <noreply@dentabase.org>",
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
    if (!phoneNumber) return res.status(400).json({ error: "Missing phoneNumber" });

    console.log("📱 Sending SMS to:", phoneNumber);

    const response = await fetch("https://api.iprog.com.ph/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.IPROG_API_KEY}`,
      },
      body: JSON.stringify({
        number: phoneNumber, // ✅ iProg expects "number"
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
// 🔐 OTP Route (Email or SMS-based OTP Delivery)
// ------------------------------------------------------------
app.post("/send-otp", async (req, res) => {
  try {
    const { destination, method, otp } = req.body; // method: 'email' | 'sms'
    if (!destination || !method || !otp)
      return res.status(400).json({ error: "Missing required fields" });

    console.log(`🔐 Sending OTP to ${destination} via ${method}`);

    if (method === "email") {
      // ✉️ Send OTP via Maileroo
      const response = await fetch("https://api.maileroo.net/v1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MAILEROO_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Dentabase <noreply@dentabase.org>",
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
      return res.status(200).json({ success: true, result });
    }

    if (method === "sms") {
      // 📱 Send OTP via iProg
      const response = await fetch("https://api.iprog.com.ph/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.IPROG_API_KEY}`,
        },
        body: JSON.stringify({
          number: destination,
          message: `Your Dentabase verification code is ${otp}. This code will expire in 5 minutes.`,
        }),
      });

      const result = await response.json();
      console.log("✅ OTP SMS sent:", result);
      return res.status(200).json({ success: true, result });
    }

    res.status(400).json({ error: "Invalid method. Use 'email' or 'sms'." });
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});


app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
