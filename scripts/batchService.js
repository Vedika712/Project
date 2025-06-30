const URL = "http://localhost:4000"; // Backend base URL

// Notification setup using Notyf
const notyf = new Notyf({
  duration: 1000,
  position: {
    x: "right",
    y: "top",
  },
});

// Function to fetch all batches from the server
function fetchAllBatches() {
  return fetch(`${URL}/batch/all`, {
    method: "GET",
    // Uncomment the following if you require token authentication:
    // headers: {
    //   Authorization: `Bearer ${localStorage.getItem("token")}`,
    // },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch batches");
      }
      return response.json();
    })
    .then((data) => {
      console.log("Fetched batch data:", data); // for debugging
      return data;
    })
    .catch((error) => {
      console.error("Error fetching batches:", error);
      notyf.error("Unable to fetch batches");
    });
}
