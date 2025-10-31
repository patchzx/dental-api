// --- server.js ---
// --- server.js ---
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import admin from "firebase-admin";
import fs from "fs";

dotenv.config(); // ✅ Load .env variables

// ==========================================================
// 🔥 FIREBASE ADMIN INITIALIZATION (Fixed JSON import)
// ==========================================================
const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin initialized");
}


// ==========================================================
// ⚙️ EXPRESS INITIAL SETUP
// ==========================================================
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
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("🚫 Blocked by CORS:", origin);
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

// ==========================================================
// 🩺 ROOT CHECK
// ==========================================================
app.get("/", (req, res) => {
  res.status(200).send("✅ DentaBase API Server is running!");
});

// ==========================================================
// 📧 GENERAL EMAIL ROUTE (Maileroo)
// ==========================================================
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || (!html && !text)) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    console.log("📧 Sending email to:", to);

    const response = await fetch("https://smtp.maileroo.com/api/v2/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MAILEROO_API_KEY}`,
      },
      body: JSON.stringify({
        from: {
          address: process.env.MAILEROO_FROM || "no-reply@dentabase.org",
          name: "DentaBase",
        },
        to: [{ address: to }],
        subject,
        html,
        text,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("❌ Maileroo API Error:", result);
      return res.status(response.status).json({
        success: false,
        message: result.message || "Maileroo API error",
        result,
      });
    }

    console.log("✅ Maileroo response:", result);
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("❌ Server Error (send-email):", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================================
// 🔐 OTP EMAIL ROUTE
// ==========================================================
app.post("/send-otp", async (req, res) => {
  try {
    const { destination, otp } = req.body;

    if (!destination || !otp) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (destination or otp)",
      });
    }

    console.log(`📨 Sending OTP to ${destination}`);

    const response = await fetch("https://smtp.maileroo.com/api/v2/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MAILEROO_API_KEY}`,
      },
      body: JSON.stringify({
        from: {
          address: process.env.MAILEROO_FROM || "no-reply@dentabase.org",
          name: "DentaBase",
        },
        to: [{ address: destination }],
        subject: "🔐 Your DentaBase OTP Code",
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>🔐 Email Verification</h2>
            <p>Your One-Time Password (OTP) is:</p>
            <h1 style="color: #0f766e; letter-spacing: 2px;">${otp}</h1>
            <p>This code will expire in 5 minutes. Do not share it with anyone.</p>
            <br>
            <p>Regards,<br><b>DentaBase Team</b></p>
          </div>
        `,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Maileroo Error:", result);
      return res.status(response.status).json({
        success: false,
        message: result.message || "Failed to send OTP via Maileroo",
      });
    }

    console.log("✅ OTP Email sent successfully!");
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("🔥 Server Error (send-otp):", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while sending OTP",
    });
  }
});

// ==========================================================
// 🔁 RESET PASSWORD ROUTE
// ==========================================================
app.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword)
      return res
        .status(400)
        .json({ success: false, error: "Missing email or password" });

    const db = admin.firestore();
    const safeEmail = email.replace(/\./g, ",");
    const userRef = db.collection("users").doc(safeEmail);

    const userDoc = await userRef.get();
    if (!userDoc.exists)
      return res.status(404).json({ success: false, error: "User not found" });

    await userRef.update({ password: newPassword });

    console.log(`✅ Password updated for ${email}`);
    return res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("❌ Reset password error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// ==========================================================
// 🚀 START SERVER
// ==========================================================
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
