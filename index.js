import express from "express";
import pkg from "pg";
import Stripe from "stripe";
import cors from "cors";

const { Pool } = pkg;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();

/* =========================
CORS (SOLUCIÓN DEFINITIVA)
========================= */
app.use(cors({
origin: "*",
methods: ["GET", "POST", "OPTIONS"],
allowedHeaders: ["Content-Type"]
}));

/* =========================
BODY PARSER
========================= */
app.use((req, res, next) => {
if (req.originalUrl === "/stripe-webhook") {
next(); // Stripe necesita raw body
} else {
express.json()(req, res, next);
}
});

/* =========================
DATABASE
========================= */
const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false }
});

/* =========================
HEALTH CHECK
========================= */
app.get("/", (req, res) => {
res.json({ status: "Veluria backend running" });
});

/* =========================
REGISTER
========================= */
app.post("/register", async (req, res) => {
try {
const { email, password } = req.body;

await pool.query(
`INSERT INTO users_new
(email, password_hash, role, created_at, last_login, premium)
VALUES ($1,$2,'user',NOW(),NOW(),false)`,
[email, password]
);

res.json({ success: true });
} catch (e) {
res.json({ success: false, error: e.message });
}
});

/* =========================
LOGIN
========================= */
app.post("/login", async (req, res) => {
try {
const { email, password } = req.body;

const r = await pool.query(
"SELECT premium FROM users_new WHERE email=$1 AND password_hash=$2",
[email, password]
);

if (r.rows.length > 0) {
res.json({ success: true, premium: r.rows[0].premium });
} else {
res.json({ success: false });
}
} catch {
res.json({ success: false });
}
});

/* =========================
PREMIUM CHECK (EXPLORE)
========================= */
app.post("/check", async (req, res) => {
const { email } = req.body;

const r = await pool.query(
"SELECT premium FROM users_new WHERE email=$1",
[email]
);

if (r.rows.length > 0) {
res.json({ premium: r.rows[0].premium });
} else {
res.json({ premium: false });
}
});

/* =========================
STRIPE WEBHOOK
========================= */
app.post(
"/stripe-webhook",
express.raw({ type: "application/json" }),
async (req, res) => {
const sig = req.headers["stripe-signature"];

try {
const event = stripe.webhooks.constructEvent(
req.body,
sig,
process.env.STRIPE_WEBHOOK_SECRET
);

if (event.type === "checkout.session.completed") {
const session = event.data.object;
const email = session.client_reference_id;

if (email) {
await pool.query(
"UPDATE users_new SET premium=true WHERE email=$1",
[email]
);
}
}

res.json({ received: true });
} catch (err) {
res.status(400).send(`Webhook Error: ${err.message}`);
}
}
);

/* =========================
START SERVER
========================= */
app.listen(process.env.PORT || 3000, () => {
console.log("Veluria backend running");
});
