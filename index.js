import express from "express";
import pkg from "pg";
import Stripe from "stripe";

const { Pool } = pkg;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();

app.use(express.json());

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false }
});

// Health
app.get("/", (req,res)=>{
res.json({status:"Veluria API running"});
});

// Register
app.post("/register", async (req,res)=>{
try{
const { email, password } = req.body;
await pool.query(
`INSERT INTO users_new (email,password_hash,role,created_at,last_login,premium)
VALUES ($1,$2,'user',NOW(),NOW(),false)`,
[email,password]
);
res.json({success:true});
}catch(e){
res.json({success:false,error:e.message});
}
});

// Login
app.post("/login", async (req,res)=>{
try{
const { email, password } = req.body;
const r = await pool.query(
"SELECT premium FROM users_new WHERE email=$1 AND password_hash=$2",
[email,password]
);
if(r.rows.length>0){
res.json({success:true,premium:r.rows[0].premium});
} else {
res.json({success:false});
}
}catch(e){
res.json({success:false});
}
});

// Stripe webhook
app.post("/stripe-webhook", express.raw({type: 'application/json'}), async (req, res) => {
const sig = req.headers["stripe-signature"];

try {
const event = stripe.webhooks.constructEvent(
req.body,
sig,
"whsec_JfJBeGD1XmONKsu4awCOD4LghDI8GRVX"
);

if (event.type === "checkout.session.completed") {
const session = event.data.object;
const email = session.customer_details.email;

await pool.query(
"UPDATE users_new SET premium=true WHERE email=$1",
[email]
);
}

res.json({ received: true });
} catch (err) {
res.status(400).send(`Webhook Error: ${err.message}`);
}
});
app.post("/check", async (req,res)=>{
const { email } = req.body;
const r = await pool.query(
"SELECT premium FROM users_new WHERE email=$1",
[email]
);
if(r.rows.length>0){
res.json({premium:r.rows[0].premium});
} else {
res.json({premium:false});
}
});
app.listen(process.env.PORT || 3000, ()=>{
console.log("Veluria backend running");
});
