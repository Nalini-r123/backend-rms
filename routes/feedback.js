import express from "express";
import db from "../db.js"; // Import MySQL database connection

const router = express.Router();

router.post("/rateOrder", (req, res) => {
    const { order_no, stars } = req.body;

    // Validate input
    if (!order_no || !stars || stars < 1 || stars > 5) {
        return res.status(400).json({ error: "Invalid input. Order number and rating between 1 and 5 are required." });
    }

    // Check if order is completed
    const orderSql = "SELECT * FROM ORDERS WHERE order_no = ? AND order_status = 'Completed'";
    db.query(orderSql, [order_no], (err, orderResult) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Internal server error while checking order status." });
        }

        if (!Array.isArray(orderResult) || orderResult.length === 0) {
            return res.status(404).json({ error: "Order not found or not completed." });
        }

        // Check if feedback already exists
        const feedbackSql = "SELECT * FROM FEEDBACK WHERE order_no = ?";
        db.query(feedbackSql, [order_no], (err, feedbackResult) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ error: "Internal server error while checking feedback." });
            }

            if (!Array.isArray(feedbackResult) || feedbackResult.length > 0) {
                return res.status(400).json({ error: "You have already rated this order. Ratings cannot be updated." });
            } else {
                // Insert new rating if not rated yet
                const insertRatingSql = "INSERT INTO FEEDBACK (order_no, stars) VALUES (?, ?)";
                db.query(insertRatingSql, [order_no, stars], (err) => {
                    if (err) {
                        console.error("Database error:", err);
                        return res.status(500).json({ error: "Internal server error while submitting rating." });
                    }

                    res.status(200).json({ message: "Rating submitted successfully!" });
                });
            }
        });
    });
});

export default router;
