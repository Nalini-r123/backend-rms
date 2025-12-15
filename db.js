import mysql from "mysql2";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,       // gondola.proxy.rlwy.net
    user: process.env.DB_USER,       // root
    password: process.env.DB_PASSWORD, // your password
    database: process.env.DB_NAME,   // railway
    port: process.env.DB_PORT // 29830
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
    } else {
        console.log("Database connected successfully!");
    }
});

// Export default for easy import
export default db;
