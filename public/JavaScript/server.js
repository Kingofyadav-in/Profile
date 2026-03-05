require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

/* =====================================================
   DATABASE CONNECTION
===================================================== */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ DB Error:", err);
    process.exit(1);
  });

/* =====================================================
   MODELS
===================================================== */

/* ================= ADMIN MODEL ================= */

const AdminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    default: "admin"
  }
});

const Admin = mongoose.model("Admin", AdminSchema);

/* ================= ENQUIRY MODEL ================= */

const EnquirySchema = new mongoose.Schema({
  name: String,
  email: String,
  subject: String,
  message: String,
  status: {
    type: String,
    default: "New"
  }
}, { timestamps: true });

const Enquiry = mongoose.model("Enquiry", EnquirySchema);

/* =====================================================
   AUTH MIDDLEWARE (PROTECTION)
===================================================== */

const protect = async (req, res, next) => {

  const token = req.headers.authorization;

  if (!token)
    return res.status(401).json({ error: "No Token" });

  try {
    const decoded = jwt.verify(
      token.split(" ")[1],
      process.env.JWT_SECRET
    );

    req.admin = decoded;
    next();

  } catch (err) {
    res.status(401).json({ error: "Invalid Token" });
  }
};

/* =====================================================
   ADMIN AUTH
===================================================== */

/* ---- LOGIN ---- */

app.post("/api/admin/login", async (req, res) => {

  const { username, password } = req.body;

  const admin = await Admin.findOne({ username });

  if (!admin)
    return res.status(401).json({ error: "Invalid Credentials" });

  const match = await bcrypt.compare(password, admin.password);

  if (!match)
    return res.status(401).json({ error: "Invalid Credentials" });

  const token = jwt.sign(
    { id: admin._id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

/* =====================================================
   ENQUIRY APIs
===================================================== */

/* ---- CREATE ENQUIRY (PUBLIC) ---- */

app.post("/api/enquiry", async (req, res) => {

  try {
    const enquiry = await Enquiry.create(req.body);

    res.json({
      success: true,
      message: "Enquiry Submitted",
      enquiry
    });

  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }

});

/* ---- GET ALL ENQUIRIES (ADMIN ONLY) ---- */

app.get("/api/admin/enquiries", protect, async (req, res) => {

  const enquiries = await Enquiry.find()
    .sort({ createdAt: -1 });

  res.json(enquiries);
});

/* ---- UPDATE STATUS ---- */

app.put("/api/admin/enquiry/:id", protect, async (req, res) => {

  await Enquiry.findByIdAndUpdate(req.params.id, {
    status: req.body.status
  });

  res.json({ message: "Updated Successfully" });
});

/* ---- DELETE ---- */

app.delete("/api/admin/enquiry/:id", protect, async (req, res) => {

  await Enquiry.findByIdAndDelete(req.params.id);

  res.json({ message: "Deleted Successfully" });
});

/* =====================================================
   SERVER START
===================================================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`🚀 CRM Running on Port ${PORT}`)
);
