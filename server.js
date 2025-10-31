// --- server.js ---
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import admin from "firebase-admin";

dotenv.config(); // ✅ Load .env variables

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
        "X-API-Key": process.env.MAILEROO_API_KEY,   // ✅ fixed
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
       "X-API-Key": process.env.MAILEROO_API_KEY,   // ✅ fixed
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




if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.resolve("./serviceAccountKey.json");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });

    console.log("✅ Firebase Admin initialized successfully");
  } catch (err) {
    console.error("❌ Firebase Admin initialization failed:", err.message);
  }
}




// ==========================================================
// 🔒 RESET PASSWORD + EMAIL NOTIFICATION
// ==========================================================
app.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields (email or newPassword)",
      });
    }

    // 🔹 Find the user
    const user = await admin.auth().getUserByEmail(email).catch(() => null);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // 🔹 Update password
    await admin.auth().updateUser(user.uid, { password: newPassword });
    console.log(`✅ Password reset successful for: ${email}`);

    // 🔹 Send email notification/log
    const mailResponse = await fetch("https://smtp.maileroo.com/api/v2/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MAILEROO_API_KEY}`,
      },
      body: JSON.stringify({
        from: {
          address: process.env.MAILEROO_FROM || "no-reply@dentabase.org",
          name: "DentaBase",
        },
        to: [{ address: email }],
        subject: "✅ Password Changed Notification",
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Password Changed</h2>
            <p>Hello ${email},</p>
            <p>Your account password was successfully changed.</p>
            <p>If you did not perform this action, please contact support immediately.</p>
            <br>
            <p>Regards,<br><b>DentaBase Team</b></p>
          </div>
        `,
      }),
    });

    const mailResult = await mailResponse.json().catch(() => ({}));
    if (!mailResponse.ok) {
      console.warn("⚠️ Failed to send email notification:", mailResult);
    } else {
      console.log("📧 Email notification sent successfully");
    }

    return res.status(200).json({ success: true, message: "Password updated successfully" });

  } catch (error) {
    console.error("❌ Reset Password Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error while resetting password",
    });
  }
});



// ==========================================================
// 🚀 START SERVER
// ==========================================================
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
