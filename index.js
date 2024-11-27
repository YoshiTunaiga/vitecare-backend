import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import * as sdk from "node-appwrite";
import { ID, Query } from "node-appwrite";
import { decodeBase64 } from "./utils.js";

dotenv.config({ path: "./.env.local" });

// Import appwrite collections
export const {
  PROJECT_ID,
  API_KEY,
  DATABASE_ID,
  PATIENT_COLLECTION_ID,
  DOCTOR_COLLECTION_ID,
  APPOINTMENT_COLLECTION_ID,
  PUBLIC_BUCKET_ID: BUCKET_ID,
  PUBLIC_ENDPOINT: ENDPOINT, // https://appwrite.io/docs/references/cloud/server-nodejs/users
  PUBLIC_ADMIN_PASSKEY,
} = process.env;

const client = new sdk.Client();

client.setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);

export const databases = new sdk.Databases(client);
export const users = new sdk.Users(client);
export const messaging = new sdk.Messaging(client);
export const storage = new sdk.Storage(client);

// Create Express app
const app = express();

// SET PORT
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Adds security headers
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Configure your frontend URL
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(morgan("dev")); // Logging middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Root route for server health check
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// // In your server setup
// app.use((req, res, next) => {
//   console.log("---INCOMING REQUEST---");
//   console.log("Method:", req.method);
//   console.log("Path:", req.path);
//   console.log("Headers:", req.headers);
//   console.log("Body:", req.body);
//   next();
// });

// // 404 Handler
// app.use((req, res, next) => {
//   res.status(404).json({
//     message: "Route not found",
//     path: req.path,
//   });
// });

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "An unexpected error occurred",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// GET SINGLE USER
app.get("/patient/:userId", async (req, res) => {
  try {
    // const users = new sdk.Users(client);
    const userId = req.params.userId;
    const user = await users.get(userId);
    res.send(JSON.parse(JSON.stringify(user)));
  } catch (error) {
    res
      .status(500)
      .send({ error: "An error occurred while fetching the user" });
  }
});

// GET SINGLE PATIENT
app.get("/patient/:patientId", async (req, res) => {
  try {
    // const databases = new sdk.Databases(client);
    const patientId = req.params.patientId;
    const patient = await databases.getDocument(
      DATABASE_ID,
      PATIENT_COLLECTION_ID,
      [Query.equal("userId", [patientId])]
    );
    res.send(JSON.parse(JSON.stringify(patient)));
  } catch (error) {
    res
      .status(500)
      .send({ error: "An error occurred while fetching the patient" });
  }
});

// POST CURRENT USER BASIC DATA
app.post("/patient/register", async (req, res) => {
  try {
    // const databases = new sdk.Databases(client);
    const registerPatient = req.body;
    const newPatient = await databases.createDocument(
      DATABASE_ID,
      PATIENT_COLLECTION_ID,
      ID.unique(),
      {
        identificationDocumentId: "",
        identificationDocumentUrl: "",
        ...registerPatient,
      }
    );

    res.send(JSON.parse(JSON.stringify(newPatient)));
  } catch (error) {
    console.error(error);
  }
});

// POST CREATE USER DOCUMENT
// Expected structure of newUser object:
// {
//   ID.unique(),
//   email:string,
//   phone:string,
//   undefined, "required for password"
//   name: string.
// }
app.post("/create-user", async (req, res) => {
  try {
    // const users = new sdk.Users(client);
    const { name, email, phone } = req.body;

    const existingUser = await users.list([Query.equal("email", [email])]);
    if (existingUser.total) {
      res.send({
        message: "User already exists",
        newUser: existingUser.users[0],
        isMember: true,
      });
    } else {
      const result = await users.create(
        ID.unique(),
        email,
        phone,
        undefined,
        name
      );
      // Respond with the created user (excluding sensitive information)
      res.send({
        message: "User registered successfully",
        newUser: result,
        isMember: false,
      });
    }
  } catch (error) {
    // Handle potential errors
    console.error("User creation error:", error);

    // Check for specific error types
    if (error.name === "ValidationError") {
      // Mongoose validation error
      return res.status(400).json({
        message: "Invalid user data",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    if (error.code === 11000) {
      // Duplicate key error (e.g., duplicate email)
      return res.status(409).json({
        message: "User already exists",
        field: Object.keys(error.keyPattern)[0],
      });
    }
    // Generic server error
    res.status(500).json({
      message: "Server error during user creation",
      error: error.message,
    });
  }
});

// VERIFY ADMIN ACCESS KEY
app.get("/api/:key", (req, res) => {
  try {
    const passkey = req.params.key;

    const decryptKey = decodeBase64(passkey);
    if (decryptKey === process.env.PUBLIC_ADMIN_PASSKEY) {
      // localStorage.setItem("accessKey", encryptedKey);
      console.log(`========= APPROVED USER!  =========`);
      res.send({ user: "gi" });
    }
    res.send({ message: "Accessing register" });
  } catch (error) {
    res
      .status(500)
      .send({ error: "An error occurred while registering the user" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
