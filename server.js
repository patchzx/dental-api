// ==========================================================
// 🦷 DentaBase Server
// ==========================================================
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================================
// 🌍 CORS CONFIGURATION
// ==========================================================
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "https://dentabase.org",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else {
        console.warn("🚫 Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors());
app.use(express.json());

// ==========================================================
// 🩺 ROOT CHECK
// ==========================================================
app.get("/", (req, res) => {
  res.status(200).send("✅ Dental API Server is running!");
});

// ==========================================================
// 📧 Maileroo General Email Sender (Clean v2)
// ==========================================================
app.post("/send-email", async (req, res) => {
  const { to, subject, html, plain } = req.body;
  if (!to) return res.status(400).json({ success: false, message: "Missing recipient email" });

  try {
    console.log(`📧 Sending email to ${to}`);

    const response = await fetch("https://smtp.maileroo.com/api/v2/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MAILEROO_TOKEN}`,
      },
      body: JSON.stringify({
        from: { address: process.env.MAILEROO_FROM, display_name: "DentaBase" },
        to: [{ address: to }],
        subject,
        html,
        plain: plain || "",
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("❌ Maileroo Error:", result);
      return res.status(response.status).json({ success: false, message: result.message || "Maileroo failed", result });
    }

    console.log("✅ Email sent successfully:", result);
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("❌ Server Error (send-email):", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================================
// 🔐 OTP ROUTE (FINAL FIXED VERSION)
// ==========================================================
app.post("/send-otp", async (req, res) => {
  try {
    const { destination, otp } = req.body;
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
        from: { address: process.env.MAILEROO_FROM, display_name: "DentaBase" },
        to: [{ address: destination }],
        subject: "🔐 Your DentaBase Verification Code",
        html: `
          <h2>Verification Code</h2>
          <p>Your OTP code is:</p>
          <h1 style="color:#0f766e">${otp}</h1>
          <p>This code expires in 5 minutes.</p>
        `,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("❌ Maileroo OTP Error:", result);
      return res.status(response.status).json({
        success: false,
        message: result.message || "Maileroo OTP sending failed",
        result,
      });
    }

    console.log("✅ OTP Email sent:", result);
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("❌ Server Error (send-otp):", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================================
// 🚀 START SERVER
// ==========================================================
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
