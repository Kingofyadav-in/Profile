require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* =====================================================
   APP INIT
===================================================== */

const app = express();

app.use(cors());
app.use(express.json());

/* =====================================================
   ENV VALIDATION
===================================================== */

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI not defined");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET not defined");
  process.exit(1);
}

/* =====================================================
   DATABASE CONNECTION
===================================================== */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:");
    console.error(err.message);
    process.exit(1);
  });

/* =====================================================
   MODELS
===================================================== */

/* ---------------- ADMIN MODEL ---------------- */

const AdminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    default: "admin"
  }
});

const Admin = mongoose.model("Admin", AdminSchema);

/* ---------------- ENQUIRY MODEL ---------------- */

const EnquirySchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    subject: String,
    message: String,
    status: {
      type: String,
      default: "New"
    }
  },
  { timestamps: true }
);

const Enquiry = mongoose.model("Enquiry", EnquirySchema);

/* =====================================================
   AUTH MIDDLEWARE
===================================================== */

const protect = async (req, res, next) => {

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.admin = decoded;

    next();

  } catch (error) {

    return res.status(401).json({ error: "Invalid Token" });

  }
};

/* =====================================================
   ADMIN LOGIN
===================================================== */

app.post("/api/admin/login", async (req, res) => {

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username & Password Required" });
  }

  const admin = await Admin.findOne({ username });

  if (!admin) {
    return res.status(401).json({ error: "Invalid Credentials" });
  }

  const isMatch = await bcrypt.compare(password, admin.password);

  if (!isMatch) {
    return res.status(401).json({ error: "Invalid Credentials" });
  }

  const token = jwt.sign(
    { id: admin._id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });

});

/* =====================================================
   ENQUIRY ROUTES
===================================================== */

/* ---------- PUBLIC CREATE ENQUIRY ---------- */

app.post("/api/enquiry", async (req, res) => {

  try {

    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "All Fields Required" });
    }

    const enquiry = await Enquiry.create({
      name,
      email,
      subject,
      message
    });

    res.json({
      success: true,
      message: "Enquiry Submitted",
      enquiry
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server Error" });

  }

});

/* ---------- ADMIN GET ALL ENQUIRIES ---------- */

app.get("/api/admin/enquiries", protect, async (req, res) => {

  const enquiries = await Enquiry.find()
    .sort({ createdAt: -1 });

  res.json(enquiries);

});

/* ---------- UPDATE ENQUIRY STATUS ---------- */

app.put("/api/admin/enquiry/:id", protect, async (req, res) => {

  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status Required" });
  }

  const enquiry = await Enquiry.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  if (!enquiry) {
    return res.status(404).json({ error: "Enquiry Not Found" });
  }

  res.json({
    message: "Updated Successfully",
    enquiry
  });

});

/* ---------- DELETE ENQUIRY ---------- */

app.delete("/api/admin/enquiry/:id", protect, async (req, res) => {

  const enquiry = await Enquiry.findByIdAndDelete(req.params.id);

  if (!enquiry) {
    return res.status(404).json({ error: "Enquiry Not Found" });
  }

  res.json({ message: "Deleted Successfully" });

});

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use((err, req, res, next) => {
  console.error("🔥 Unexpected Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

/* =====================================================
   SERVER START
===================================================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 CRM Running on Port ${PORT}`);
});
