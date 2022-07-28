import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
// import nodemailer from "nodemailer";
// import jsonwebtocken from "jsonwebtoken";

const app = express();

//! Express MiddleWare (Body Parser)
app.use(express.json());

//! Configuring Enviroinment variables
dotenv.config();

//! Cors (Third party middleware)
app.use(cors());

const PORT = 5000;

const MONGO_URL = process.env.MONGO_URL;

//! App Welcome Message

app.get("/", (request, response) => {
  response.send("Welcome to Authentication");
});


app.listen(PORT, () => console.log(`Server connected on port ${PORT} 😊😊`));

//! DataBase Connection
async function createConnection() {
    const client = new MongoClient(MONGO_URL);
  
    await client.connect();
  
    console.log("MongoDb is connected to server 👍🏽");
  
    return client;
  }
  
  const client = await createConnection();