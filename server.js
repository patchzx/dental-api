// ==============================
// 📦 Imports
// ==============================
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

// ==============================
// ⚙️ Load Environment Variables
// ==============================
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// 🌍 CORS CONFIGURATION
// ==============================
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://localhost:3000",
  "https://dentabase.org",
  "https://www.dentabase.org",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("🚫 Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
  })
);

app.use(express.json());
app.options("*", cors());

// ==============================
// 🩺 Health Check
// ==============================
app.get("/", (req, res) => {
  res.status(200).send("✅ DentaBase API Server is running!");
});

// ==============================
// 📧 Maileroo Helper
// ==============================
async function sendMailerooEmail({ to, subject, html, text }) {
  try {
    const payload = {
      from: {
        address: process.env.MAILEROO_FROM || "no-reply@dentabase.org",
        name: process.env.IPROG_SENDER || "DentaBase",
      },
      to: Array.isArray(to) ? to : [{ address: to }],
      subject,
      html,
      text,
    };

    const response = await fetch("https://smtp.maileroo.com/api/v2/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.MAILEROO_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Maileroo API Error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (err) {
    console.error("❌ Maileroo request failed:", err.message);
    throw new Error(
      "Failed to send email — check internet access, Maileroo endpoint, or API key."
    );
  }
}

// ==============================
// 📩 /send-email
// ==============================
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    if (!to || !subject || (!html && !text))
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });

    console.log("📧 Sending email to:", to);
    const result = await sendMailerooEmail({ to, subject, html, text });
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("❌ /send-email error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================
// 🔐 /send-otp
// ==============================
app.post("/send-otp", async (req, res) => {
  try {
    const { destination, otp } = req.body;
    if (!destination || !otp)
      return res
        .status(400)
        .json({ success: false, message: "Missing destination or OTP" });

    console.log(`📨 Sending OTP to ${destination}`);

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>🔐 Email Verification</h2>
        <p>Your One-Time Password (OTP) is:</p>
        <h1 style="color: #0f766e; letter-spacing: 2px;">${otp}</h1>
        <p>This code will expire in 5 minutes. Do not share it with anyone.</p>
        <br>
        <p>Regards,<br><b>DentaBase Team</b></p>
      </div>
    `;

    const result = await sendMailerooEmail({
      to: destination,
      subject: "🔐 Your DentaBase OTP Code",
      html,
    });

    console.log("✅ OTP email sent successfully!");
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("❌ /send-otp error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================
// 🚀 Start Server
// ==============================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 DentaBase API running on port ${PORT}`);
});
