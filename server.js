// ==============================
// 🚀 DentaBase Server (FINAL)
// ==============================
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";
import admin from "firebase-admin";

// ==============================
// 🔧 CONFIG
// ==============================
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// 🌍 CORS CONFIG
// ==============================
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "https://dentabase.org",
  "https://dental-api-vbx1.onrender.com",
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
  })
);
app.options("*", cors());
app.use(express.json());

// ==============================
// ✅ ROOT CHECK
// ==============================
app.get("/", (req, res) => {
  res.status(200).send("✅ DentaBase API Server is running!");
});

// ==============================
// 📧 MAILEROO - Send OTP Email
// ==============================
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

    const mailResponse = await fetch("https://smtp.maileroo.com/api/v2/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.MAILEROO_API_KEY.trim(), // ✅ make sure no extra spaces
      },
      body: JSON.stringify({
        from: {
          address: "no-reply@dentabase.org",
          name: "DentaBase",
        },
        to: [{ address: destination }],
        subject: "🔐 Your DentaBase OTP Code",
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>🔐 Email Verification</h2>
            <p>Your One-Time Password (OTP) is:</p>
            <h1 style="color: #0f766e; letter-spacing: 2px;">${otp}</h1>
            <p>This code will expire in 5 minutes. Please do not share it with anyone.</p>
            <br>
            <p>Regards,<br><b>DentaBase Team</b></p>
          </div>
        `,
      }),
    });

    const result = await mailResponse.json();

    if (!mailResponse.ok) {
      console.error("❌ Maileroo API Error:", result);
      return res.status(mailResponse.status).json({
        success: false,
        message: result.message || "Failed to send OTP via Maileroo",
        result,
      });
    }

    console.log("✅ OTP Email sent successfully via Maileroo!");
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("🔥 Server Error (send-otp):", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while sending OTP",
    });
  }
});

// ==============================
// 🔧 Initialize Firebase
// ==============================
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ==============================
// 🔐 Reset Password
// ==============================
app.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({
      success: false,
      error: "Missing email or password.",
    });
  }

  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", email).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }

    const userDoc = snapshot.docs[0];
    await userDoc.ref.update({ password: newPassword });

    return res.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    console.error("❌ Error resetting password:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error.",
    });
  }
});

// ==============================
// 🚀 START SERVER
// ==============================
app.listen(PORT, () => {
  console.log(`🚀 DentaBase API running on port ${PORT}`);
});
