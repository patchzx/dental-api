// ==============================
// 🚀 DentaBase Server
// ==============================
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// 🌍 CORS CONFIGURATION
// ==============================
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "https://dentabase.org",
  "https://www.dentabase.org",
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

// ==============================
// 🩺 ROOT CHECK
// ==============================
app.get("/", (req, res) => {
  res.status(200).send("✅ DentaBase API Server is running!");
});

// ==============================
// 🔧 VERIFY ENV VARIABLES
// ==============================
if (!process.env.MAILEROO_API_KEY) {
  console.error("❌ Missing MAILEROO_API_KEY in .env");
}

// ==============================
// 📧 FUNCTION: Send Email via Maileroo SMTP v2
// ==============================
async function sendMailerooEmail({ to, subject, html, text }) {
  const payload = {
    from: "DentaBase <no-reply@dentabase.org>",
    to: [to],
    subject,
    content: [
      {
        type: "text/html",
        value: html || text || "No content",
      },
    ],
  };

  const response = await fetch("https://smtp.maileroo.com/api/v2/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.MAILEROO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("❌ Maileroo API Error:", result);
    throw new Error(result.message || "Maileroo API request failed");
  }

  return result;
}

// ==============================
// 📧 GENERAL EMAIL ROUTE
// ==============================
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || (!html && !text)) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    console.log("📧 Sending general email to:", to);

    const result = await sendMailerooEmail({ to, subject, html, text });

    console.log("✅ Email sent successfully:", result);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("❌ send-email error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==============================
// 🔐 OTP EMAIL ROUTE (Maileroo SMTP v2)
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

    console.log(`📨 Sending OTP email to ${destination}`);

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

    console.log("✅ OTP Email sent successfully:", result);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("🔥 send-otp error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while sending OTP",
    });
  }
});

// ==============================
// 🚀 START SERVER
// ==============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
