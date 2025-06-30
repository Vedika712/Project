const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(cors({
  origin: ['http://localhost:4000', 'http://127.0.0.1:4000'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const userRoutes = require("./routes/users");
const batchRoutes = require("./routes/batch");
const authentication = require("./middlewares/auth");
const pool = require("./db");




// Un-Authenticated Routes

app.use( userRoutes);
app.use("/batch", batchRoutes);

// Authenticated Routes
app.use(authentication.authUsers);



app.listen(4000, "0.0.0.0", () => {
  console.log(`Server Started at PORT: 4000`);
});
