import * as sdk from "node-appwrite";
// import dotenv from "dotenv";
import { ID, Query } from "node-appwrite";

// dotenv.config();

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
