import express from "express";
import db from "../db.js"; // Import MySQL database connection

const router = express.Router();

// 💰 Handle Payment Processing
router.post("/", async (req, res) => {
    try {
        const { order_no, payment_method, upi_id } = req.body;

        if (!order_no || !payment_method) {
            return res.status(400).json({ error: "Order number and payment method are required" });
        }

        if (payment_method === "UPI" && (!upi_id || upi_id.trim() === "")) {
            return res.status(400).json({ error: "UPI ID is required for UPI payment" });
        }

        let payment_status = "Success"; // Always successful for simulation

        // 🔍 Check if a payment already exists for this order
        const checkQuery = `SELECT payment_time FROM PAYMENT WHERE order_no = ?`;

        db.query(checkQuery, [order_no], (err, results) => {
            if (err) {
                console.error("Error checking existing payment:", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            // ✅ If payment already exists, return the existing payment details
            if (results.length > 0) {
                const paymentDate = new Date(results[0].payment_time);
                const formattedTime = paymentDate.toLocaleString("en-US", {
                    timeZone: "Asia/Kolkata",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                });

                return res.json({
                    message: "Payment already processed",
                    order_no,
                    payment_method,
                    payment_status: "Success",
                    payment_time: formattedTime // Send existing payment time
                });
            }

            // 💾 Insert payment if no existing record is found
            const insertQuery = `
                INSERT INTO PAYMENT (order_no, payment_method, upi_id, payment_status)
                VALUES (?, ?, ?, ?)
            `;

            db.query(insertQuery, [order_no, payment_method, upi_id || null, payment_status], (err) => {
                if (err) {
                    console.error("Payment Error:", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                // 🔍 Fetch the newly inserted payment time
                db.query(checkQuery, [order_no], (err, newResults) => {
                    if (err) {
                        console.error("Error fetching payment time:", err);
                        return res.status(500).json({ error: "Internal Server Error" });
                    }

                    let formattedTime = null;
                    if (newResults.length > 0 && newResults[0].payment_time) {
                        const newPaymentDate = new Date(newResults[0].payment_time);
                        formattedTime = newPaymentDate.toLocaleString("en-US", {
                            timeZone: "Asia/Kolkata",
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                        });
                    }

                    res.json({
                        message: "Payment successful",
                        order_no,
                        payment_method,
                        payment_status,
                        payment_time: formattedTime // Always return payment time
                    });
                });
            });
        });
    } catch (error) {
        console.error("Payment Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
