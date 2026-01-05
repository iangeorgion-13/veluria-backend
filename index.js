import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get("/", (req, res) => {
  res.json({ status: "Veluria backend running" });
});

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  await pool.query(
    "INSERT INTO users (email, password) VALUES ($1,$2)",
    [email, password]
  );
  res.json({ success: true });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const r = await pool.query(
    "SELECT * FROM users WHERE email=$1 AND password=$2",
    [email, password]
  );
  if (r.rows.length > 0) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Veluria API running");
});
