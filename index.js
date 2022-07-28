import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import jsonwebtocken from "jsonwebtoken";

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

// ?  SIGNUP DETAILS

app.post("/create/newUsers", async (request, response) => {
  const { name, email, contact, password, userDp } = request.body;

  // !  PASSWORD HASHING PROCESS

  const hashPassword = await createPassword(password);

  const newUser = {
    name: name,
    email: email,
    contact: contact,
    password: hashPassword,
    userDp: userDp,
  };

  const checkExisting = await client
    .db("AuthApp")
    .collection("user")
    .findOne({ email: newUser.email });

  if (!checkExisting) {
    const signUp = await client
      .db("AuthApp")
      .collection("user")
      .insertOne(newUser);

    if (!signUp) {
      response.status(404).send("Error");
    } else {
      response.send("User Created Sucessfully");
    }
  } else {
    response.status(409).send("Account already exists");
  }
});

// ? LOGIN VERIFICATION

app.post("/user/signIn", async (request, response) => {
  const { email, password } = request.body;

  const signIn = await client
    .db("AuthApp")
    .collection("user")
    .findOne({ email: email });

  if (!signIn) {
    response.status(401).send("Invalid Credentials");
  } else {
    const storedPassword = signIn.password;
    const isPasswordMatch = await bcrypt.compare(password, storedPassword);
    if (!isPasswordMatch) {
      response.status(401).send("Invalid credentials");
    } else {
      const token = jsonwebtocken.sign(
        {
          id: signIn._id,
          email: signIn.email,
        },
        process.env.privateKey1
      );
      response.send({ message: `Welcome ${signIn.name}`, token: token });
    }
  }
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

// ?  Hashing and salting process before storing a password in DB

async function createPassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

//? TOKEN GENERATOR

const tokenGenerator = async (email) => {
  const token = jsonwebtocken.sign({ email }, process.env.privateKey3, {
    expiresIn: "3hours",
  });
  return token;
};
