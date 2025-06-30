const URL = "http://localhost:4000";

const notyf = new Notyf({
  duration: 1000,
  position: {
    x: "right",
    y: "top",
  },
});

function userLogin(email, password) {
  return fetch(`${URL}/user/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })
    .then((response) => response.json())
    .then((data) => {
      debugger;
      if ( data.token) {
        
        console.log("Token received:", data.token); 
        notyf.success(data.message);
        localStorage.setItem("token", data.token);

        // Decode the JWT token to get user role
        const decodedToken = jwt_decode(data.token);
        
        console.log("decoded token: " + JSON.stringify(decodedToken));
        console.log("user Role: " + decodedToken.role);
        console.log("current user ID: " + decodedToken.id);

        debugger;
        // Redirect user based on their role
        setTimeout(() => {
          redirectUser(decodedToken.role);
        }, 1000);
      } else {
        notyf.error("Login failed. Please check your credentials.");
        console.error("Login failed.");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      notyf.error("An error occurred during login.");
    });
}

function redirectUser(role) {
  switch (role) {
    case "admin":
      window.location.href = "admin/admin-page.html";
      // window.location.href = "display-users.html";
      break;
    case "user":
    case "student":
      window.location.href = "display-users.html";
      break;
    default:
       notyf.error("Unknown role. Cannot redirect.");
      break;
  }
}

// function addUser( email, password,role) {
//   return fetch(`${URL}/user`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       token: localStorage.getItem("token"),
//     },
//     body: JSON.stringify({ email, password,role }),
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       // debugger;
//       notyf.success("User added successfully.");
//     })
//     .catch((error) => {
//       console.error(error);
//     });
// }


/**
 * Registers a new student across all tables (users, students, enrollments)
 * @param {Object} studentData - Complete student registration data
 * @returns {Promise<Object>} Response data
 */
async function registerStudent(studentData) {
  try {
    // Validate required fields
    const requiredFields = [
      'firstName', 'middleName', 'lastName', 'email', 
      'gender', 'dateOfBirth', 'mobileNo', 'city',
      'permanentAddress', 'pincode', 'state', 
      'collegeName', 'academicYear', 'isLaptopAvailable', 'batchId'
    ];

    const missingFields = requiredFields.filter(field => !studentData[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Generate a random password for the student
    const password = generateRandomPassword();
    const laptopStatus = studentData.isLaptopAvailable === "Yes" ? 1 : 0;

    // Prepare the complete payload
    const payload = {
      ...studentData,
      password: password,
      role: 'student', // Default role for students
      isLaptopAvailable: laptopStatus
    };

    const response = await fetch(`${API_BASE_URL}/user/register-and-enroll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getCurrentUserToken()}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Student registration failed");
    }

    notyf.success("Student registered successfully!");
    console.log("Registration complete:", data);
    return data;

  } catch (error) {
    console.error("Student registration error:", error);
    notyf.error(error.message || "Failed to register student");
    throw error;
  }
}

/**
 * Helper function to generate random password
 * @returns {string} Random password
 */
function generateRandomPassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}





function fetchAllUsers() {
  return fetch(`${URL}/users`, {
    method: "GET",
    headers: {
      token: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      // debugger;
      return data;
    });
}

function deleteUserById(userId) {
  console.log("userId: " + userId);
  fetch(`${URL}/user/${userId}`, {
    method: "DELETE",
    headers: {
      token: localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        return notyf.error(data.error);
      }
      debugger;
      notyf.success("User deleted successfully.");
      console.log("Delete response: ", data);

      setTimeout(() => {
        fetchAllUsers().then((users) => {
          displayAllUsers(users); // Re-display the updated list
        });
      }, 1000);
    })
    .catch((error) => {
      console.log("Error: ", error);
    });
}
