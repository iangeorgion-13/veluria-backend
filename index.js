import express from "express";
import pkg from "pg";

const { Pool } = pkg;

const app = express();

app.use((req, res, next) => {
res.header("Access-Control-Allow-Origin", "*");
res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
next();
});

app.use(express.json());

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false }
});

app.get("/", (req, res) => {
res.json({ status: "Veluria backend running" });
});

app.post("/register", async (req, res) => {
try {
const { email, password } = req.body;

await pool.query(
`INSERT INTO users_new
(email, password_hash, role, created_at, last_login)
VALUES ($1, $2, 'user', NOW(), NOW())`,
[email, password]
);

res.json({ success: true });
} catch (err) {
res.json({ success: false, error: err.message });
}
});

app.post("/login", async (req, res) => {
try {
const { email, password } = req.body;

const r = await pool.query(
"SELECT * FROM users_new WHERE email=$1 AND password_hash=$2",
[email, password]
);

if (r.rows.length > 0) {
res.json({ success: true });
} else {
res.json({ success: false });
}
} catch (err) {
res.json({ success: false });
}
});

app.listen(process.env.PORT || 3000, () => {
console.log("Veluria API running");
});
