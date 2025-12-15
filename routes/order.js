import express from "express";
import db from "../db.js"; // Import MySQL database connection

const router = express.Router();

/**
 * Fetch All Orders
 */
router.get("/fetch-all-orders", (req, res) => {
    const sql = "SELECT * FROM ORDERS ORDER BY order_date DESC";

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching orders:", err);
            return res.status(500).json({ error: "Failed to fetch orders" });
        }
        res.json(results);
    });
});

router.get("/fetch-order-details/:orderId", (req, res) => {
    const { orderId } = req.params;
    const sql = `
        SELECT 
            O.order_no, O.order_status, O.order_type, O.total_amount, O.order_date, OD.item_no, M.name, OD.quantity, M.price,
            P.payment_id, P.payment_status, P.payment_method, P.payment_time, 
            CASE WHEN P.payment_method = 'UPI' THEN P.upi_id ELSE NULL END AS upi_id, 
            F.stars AS feedback_stars
        FROM ORDERS O
        JOIN ORDER_DETAILS OD ON O.order_no = OD.order_no
        JOIN MENU M ON OD.item_no = M.item_no
        LEFT JOIN PAYMENT P ON O.order_no = P.order_no  -- Include payment status
        LEFT JOIN FEEDBACK F ON O.order_no = F.order_no -- Include feedback stars
        WHERE O.order_no = ?`;

    db.query(sql, [orderId], (err, results) => {
        if (err) {
            console.error("Error fetching order details:", err);
            return res.status(500).json({ error: "Failed to fetch order details" });
        }
        res.json(results);
    });
});

/**
 * Place Order - Adds an order with "Pending" status
 * Body: { cart: [{item_no, quantity, price}], orderType: "Dine-in" | "Takeaway" }
 */
router.post("/place-order", (req, res) => {
    const { cart, orderType } = req.body;

    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: "Cart cannot be empty" });
    }

    let totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (orderType === "Takeaway") {
        totalAmount += 15.00;
    }

    // 1️⃣ Call PlaceOrder procedure
    db.query("CALL PlaceOrder(?, ?, @newOrderId)", [orderType, totalAmount], (err) => {
        if (err) {
            console.error("Error placing order:", err);
            return res.status(500).json({ error: "Failed to place order", details: err.message });
        }

        // 2️⃣ Retrieve newOrderId separately
        db.query("SELECT @newOrderId AS orderId", (err, results) => {
            if (err) {
                console.error("Error retrieving order ID:", err);
                return res.status(500).json({ error: "Failed to retrieve order ID" });
            }

            const orderId = results[0]?.orderId;
            if (!orderId) {
                return res.status(500).json({ error: "Order ID not found" });
            }

            // 3️⃣ Insert order details
            let insertPromises = cart.map(item => {
                return new Promise((resolve, reject) => {
                    db.query(
                        "INSERT INTO ORDER_DETAILS (order_no, item_no, quantity) VALUES (?, ?, ?)",
                        [orderId, item.item_no, item.quantity],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            });

            Promise.all(insertPromises)
                .then(() => {
                    // 4️⃣ Call CalculateOrderTotal procedure with orderId and orderType
                    db.query("CALL CalculateOrderTotal(?, ?)", [orderId, orderType], (err) => {
                        if (err) {
                            console.error("Error calculating order total:", err);
                            return res.status(500).json({ error: "Failed to calculate order total" });
                        }
                        res.json({ message: "Order placed successfully", orderId });
                    });
                })
                .catch(err => {
                    console.error("Error inserting order details:", err);
                    return res.status(500).json({ error: "Failed to insert order details" });
                });
        });
    });
});

/**
 * Confirm Order - Updates order status to "Confirmed" and updates total amount
 * Params: orderId
 */
router.put("/confirm-order/:orderId", (req, res) => {
    const { orderId } = req.params;

    // Fetch current order details
    const fetchOrderSql = "SELECT order_type, total_amount FROM ORDERS WHERE order_no = ?";
    db.query(fetchOrderSql, [orderId], (err, results) => {
        if (err) {
            console.error("Error fetching order details:", err);
            return res.status(500).json({ error: "Failed to fetch order details" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "Order not found" });
        }

        const { order_type, total_amount } = results[0];

        // Apply additional charges for Takeaway orders (only on confirmation)
        let updatedTotalAmount = total_amount;
        if (order_type === "Takeaway") {
            updatedTotalAmount += 15.00;  // Additional charge for Takeaway orders
        }

        // Update the total amount in the database on order confirmation
        const updateOrderSql = "UPDATE ORDERS SET order_status = 'Confirmed', total_amount = ? WHERE order_no = ?";
        db.query(updateOrderSql, [updatedTotalAmount, orderId], (err, result) => {
            if (err) {
                console.error("Error confirming order:", err);
                return res.status(500).json({ error: "Failed to confirm order" });
            }

            if (result.affectedRows === 0) {
                return res.status(400).json({ error: "Order cannot be confirmed" });
            }

            // Respond back with the updated total amount and confirmation message
            res.json({ message: "Order confirmed", updatedTotalAmount });
        });
    });
});

/**
 * Cancel Order - Updates order status to "Cancelled"
 * Params: orderId
 */
router.put("/cancel-order/:orderId", (req, res) => {
    const { orderId } = req.params;
    const sql = "UPDATE ORDERS SET order_status = 'Cancelled' WHERE order_no = ? AND order_status = 'Pending'";

    db.query(sql, [orderId], (err, result) => {
        if (err) {
            console.error("Error cancelling order:", err);
            return res.status(500).json({ error: "Failed to cancel order" });
        }
        if (result.affectedRows === 0) {
            return res.status(400).json({ error: "Order cannot be cancelled" });
        }
        res.json({ message: "Order cancelled" });
    });
});

// Fetch All Pending Orders (For Menu Page)
router.get("/fetch-pending-orders", (req, res) => {
    const sql = "SELECT * FROM ORDERS WHERE order_status = 'Pending' ORDER BY order_date DESC";

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching pending orders:", err);
            return res.status(500).json({ error: "Failed to fetch pending orders" });
        }
        res.json(results);
    });
});

// Route to fetch daily revenue and completed orders
router.get("/daily-revenue", (req, res) => {
    db.query("CALL GetDailyRevenue()", (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Internal server error while fetching daily revenue." });
        }

        // Extracting results (Stored procedures return multiple result sets)
        const todayRevenue = results[0][0].TodayRevenue || 0;  // First result set (Total revenue)
        const completedOrders = results[1];  // Second result set (Completed orders)

        res.status(200).json({ todayRevenue, completedOrders });
    });
});

export default router;