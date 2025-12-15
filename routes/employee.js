import express from "express";
import db from "../db.js"; // Import database connection

const router = express.Router();

// ✅ 1. Get All Employees
router.get("/", (req, res) => {
    const sql = "SELECT * FROM EMPLOYEE";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching employees:", err);
            return res.status(500).json({ message: "Server error" });
        }
        res.json(results);
    });
});

// ✅ 2. Add New Employee
router.post("/add", (req, res) => {
    const { name, phone, address, role } = req.body;
    const admin_id = 1; // Assume admin_id is set (can be dynamic)
    if (!name || !phone || !role) {
        return res.status(400).json({ message: "Name, phone, and role are required" });
    }

    const sql = "INSERT INTO EMPLOYEE (name, phone, address, role, admin_id) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [name, phone, address, role, admin_id], (err, result) => {
        if (err) {
            console.error("Error adding employee:", err);
            return res.status(500).json({ message: "Server error" });
        }
        res.json({ message: "Employee added successfully", id: result.insertId });
    });
});

// ✅ 3. Update Employee
router.put("/update/:id", (req, res) => {
    const { name, phone, address, role, admin_id } = req.body;
    const { id } = req.params;

    if (!name || !phone || !role) {
        return res.status(400).json({ message: "Name, phone, and role are required" });
    }

    const sql = "UPDATE EMPLOYEE SET name = ?, phone = ?, address = ?, role = ?, admin_id = ? WHERE employee_id = ?";
    db.query(sql, [name, phone, address, role, admin_id, id], (err, result) => {
        if (err) {
            console.error("Error updating employee:", err);
            return res.status(500).json({ message: "Server error" });
        }
        res.json({ message: "Employee updated successfully" });
    });
});

// ✅ 4. Delete Employee
router.delete("/delete/:id", (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM EMPLOYEE WHERE employee_id = ?";
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Error deleting employee:", err);
            return res.status(500).json({ message: "Server error" });
        }
        res.json({ message: "Employee deleted successfully" });
    });
});

export default router;
