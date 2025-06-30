const express = require("express");
const router = express.Router();
const pool = require("../db");
const crypto = require("crypto-js");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const authorizeRole = require("../middlewares/authorizeRoles");
const bcrypt = require("bcryptjs");

// Helper functions for consistent responses
const createErrorResponse = (message) => ({ success: false, message });
const createSuccessResponse = (message, data ={} ) => {
  return {success: true,
  message,
  data };
}

// // Register a user
// router.post("/user/register", async (request, response) => {
//   const { email, password, role } = request.body;

//   if (!email || !password) {
//     return response.status(400).json(createErrorResponse("All fields are required"));
//   }else{
//     const hashPassword = String(crypto.SHA256(password));
  

//   console.log("Password: ", password);
//     console.log("hashPassword: ", hashPassword);

//     // Insert user into the database
//     pool.query(
//       "INSERT INTO users ( email, password,role) VALUES (?, ?, ?)",
//       [ email, hashPassword,role],
//       (error, results) => {
//         if (error) {
//           // console.error(error);
//           if (error.code === "ER_DUP_ENTRY") {
//             return response
//               .status(400)
//               .send({ message: "Email already exists" });
//           }

//           return response.status(500).send({ message: "Server Error" });
//         } else {
//           response
//             .status(201)
//             .send({ message: "User registered successfully" });
//         }
//       }
//     );
//   }
// });




router.post("/user/login", (request, response) => {
  const { email, password } = request.body;

  console.log("login called", email, password);

  if (email == "" || password == "") {
    return response.status(400).send({ message: "All fields are required" });
  } else {
    // Hash the password using SHA-256
    const hashPassword = String(crypto.SHA256(password));

    pool.execute(
      "SELECT user_id, password, role FROM users WHERE email = ? AND password = ?",
      [email, hashPassword],
      (error, dbResponse) => {
        if (error) {
          console.error(error);
          return response.status(500).send({ message: "Server Error" });
        }

        if (dbResponse.length === 0) {
          return response
            .status(401)
            .send({ message: "Invalid email or password" });
        }

        // User found, generate a JWT token
        const user = dbResponse[0];
        const payload = {
          id: user.user_id,
          
          email: email,
          role: user.role,
        };

        const token = jwt.sign(payload, SECRET_KEY);

        response.status(200).send({
          message: "Login successful",
          token: token,
        });
      }
    );
  }
});

// Get all users (protected)
router.get("/users", authorizeRole(["admin"]), async (req, res) => {
  try {
    const [users] = await pool.promise().query("SELECT user_id, email, role FROM users");
    res.json(createSuccessResponse("Users retrieved successfully", users));
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json(createErrorResponse("Server Error"));
  }
});

// Get current user profile
router.get("/profile", authorizeRole(["admin", "user"]), async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await pool.promise().query(
      "SELECT user_id, email, role FROM users WHERE user_id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json(createErrorResponse("User not found"));
    }

    res.json(createSuccessResponse("User profile retrieved", users[0]));
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json(createErrorResponse("Server Error"));
  }
});

// Update user
router.put("/user/:id", authorizeRole(["admin"]), async (req, res) => {
  const userId = req.params.id;
  const { email, role } = req.body;

  try {
    await pool.promise().query(
      "UPDATE users SET email = ?, role = ? WHERE user_id = ?",
      [email, role, userId]
    );
    res.json(createSuccessResponse("User updated successfully"));
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json(createErrorResponse("Server Error"));
  }
});

// Delete user
router.delete("/user/:id", authorizeRole(["admin"]), async (req, res) => {
  const userId = req.params.id;

  try {
    await pool.promise().query("DELETE FROM users WHERE user_id = ?", [userId]);
    res.json(createSuccessResponse("User deleted successfully"));
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json(createErrorResponse("Server Error"));
  }
});

// Comprehensive registration and enrollment with proper transaction handling
// router.post("/user/register-and-enroll", async (request, response) => {
router.post("/register-and-enroll", async (request, response) => {
  const {
    email,
    firstName,
    middleName,
    lastName,
    gender,
    dateOfBirth,
    mobileNo,
    city,
    permanentAddress,
    pincode,
    state,
    academicYear,
    collegeName,
    isLaptopAvailable,
    batchId
  } = request.body;

  // Validate required fields
  const requiredFields = {
    email, firstName, middleName, lastName, gender, dateOfBirth,
    mobileNo, city, permanentAddress, pincode, state,
    academicYear, collegeName, isLaptopAvailable, batchId
  };

  for (const [field, value] of Object.entries(requiredFields)) {
    if (!value) {
      return response.status(400).json(createErrorResponse(`${field} is required`));
    }
  }

  const password = generateRandomPassword();
  const laptopStatus = isLaptopAvailable === "Yes" ? 1 : 0;

  // Get a connection from the pool
  const connection = await pool.promise().getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. Register user
    const hashedPassword = await bcrypt.hash(password, 10);
    const [userResult] = await connection.execute(
      "INSERT INTO users (email, password, role) VALUES (?, ?, 'student')",
      [email, hashedPassword]
    );
    const userId = userResult.insertId;

    // 2. Register student
    const [studentResult] = await connection.execute(
      `INSERT INTO students 
      (user_id, first_name, middle_name, last_name, gender, date_of_birth, mobile_no, 
       city, permanent_address, pincode, state, college_name, academic_year, is_laptop_available) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, firstName, middleName, lastName, gender, dateOfBirth, mobileNo,
        city, permanentAddress, pincode, state, collegeName, academicYear, laptopStatus
      ]
    );
    const studentId = studentResult.insertId;

    // 3. Enroll student
    await connection.execute(
      "INSERT INTO enrollments (student_id, batch_id) VALUES (?, ?)",
      [studentId, batchId]
    );

    await connection.commit();
    response.json(createSuccessResponse("Student registered and enrolled successfully"));
  } catch (error) {
    await connection.rollback();
    
    if (error.code === "ER_DUP_ENTRY") {
      return response.status(400).json(createErrorResponse("Email already exists"));
    }
    
    console.error("Registration error:", error);
    response.status(500).json(createErrorResponse("Registration failed"));
  } finally {
    connection.release();
  }
});

// Helper function to generate random password
function generateRandomPassword() {
  const length = 10;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

module.exports = router;