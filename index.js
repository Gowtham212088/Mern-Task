import express, { request, response } from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt, { hash } from "bcrypt";
import nodemailer from "nodemailer";
import jsonwebtocken from "jsonwebtoken";
import { json } from "stream/consumers";

const app = express();

//! Express MiddleWare (Body Parser)
app.use(express.json());

//! Custom Middleware

const auth = (request, response, next) => {
  const token = request.header("x-auth-token");
  console.log(token);
  next();
};

//! Configuring Enviroinment variables
dotenv.config();

//! Cors (Third party middleware)
app.use(cors());

//! Soluction for after deployment CORS ERROR.
// app.use(cors({allow:"*"}));

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
      const token = jsonwebtocken.sign(signIn, process.env.privateKey1);
      response.send({ token: token });
    }
  }
});

app.post("/check/mailVerification", async (request, response) => {
  const data = request.body;

  const { email } = request.body;

  let token = await tokenGenerator(email);

  const verifyIt = await jsonwebtocken.verify(token, process.env.privateKey3);

  // ? Here we check wheather the mentioned email-id in forgot-password page available in DB or Not.

  // ? If email exists in DB we send mail to the existing mail-id.

  const checkAvailablity = await client
    .db("AuthApp")
    .collection("user")
    .findOne({ email: email });

  const BSON_id = await checkAvailablity._id;

  if (!checkAvailablity) {
    response.status(404).send("User doesn't exist");
  } else {
    // ?  Node Mailer

    var sender = nodemailer.createTransport({
      service: "gmail", // Service Provider
      // Authentication
      auth: {
        user: process.env.secondaryMail, // Email
        pass: process.env.secondaryPass, // Password
      },
    });

    var composemail = {
      from: process.env.secondaryMail, // Sender address
      to: email,
      subject: "Password verification",
      text: `${process.env.Base_URL}/${BSON_id}/${token}`,
    };

    sender
      .sendMail(composemail)
      .then((response, request) => {
        response.send({
          to: email,
          subject: subject,
          message:
            "Please Click the link below to reset the passsword for security reasons the link will be expired in the next 10 minute",
        });
      })
      .catch((error) => {
        response.send(error);
      });
  }
});

app.post("/new-password/:_id/:token", async (request, response) => {
  const { _id } = request.params;

  const { token } = request.params;

  const { password, newPassword } = request.body;

  const conformId = await client
    .db("AuthApp")
    .collection("user")
    .findOne({ _id: ObjectId(`${_id}`) });

  if (!conformId) {
    response.status(404).send("not found");
  } else {
    const verify = await jsonwebtocken.decode(token, process.env.privateKey3);

    //? CONFORMING E-MAIL FROM TOKEN AND DATABASE
    if (verify.email !== conformId.email) {
      response.status(404).send("Token not Matched");
    } else {
      if (password == newPassword) {
        const updatedHashPassword = await createPassword(password);
        const updatePassword = await client
          .db("AuthApp")
          .collection("user")
          .updateOne(
            { _id: ObjectId(`${_id}`) },
            { $set: { password: updatedHashPassword } }
          );
        response.send("Password updated Successfully");
      } else {
        response.send("Password Mismatches");
      }
    }
  }
});

//! For collecting user profile data.

app.get("/getData", auth, async (request, response) => {
  const getDatas = request.header("x-auth-token");

  const crackData = jsonwebtocken.verify(getDatas, process.env.privateKey1);

  // console.log(crackData);

  const data = await client.db("AuthApp").collection("user").find().toArray();

  response.send(crackData);
});

//! Updating an User Informations

app.put("/change/user", auth, async (request, response) => {
  const hearderToken = request.header("x-auth-token");

  const { _id, name, email, contact, password, userDp, iat } = request.body;

  const hashedPassword = await createPassword(password);

  const updateData = {
    name: name,
    email: email,
    contact: contact,
    password: hashedPassword,
    userDp: userDp,
  };

  const responseData = jsonwebtocken.verify(
    hearderToken,
    process.env.privateKey1
  );

  const updateReferance = responseData._id;

  const changeUserData = client
    .db("AuthApp")
    .collection("user")
    .updateOne({ _id: ObjectId(`${updateReferance}`) }, { $set: updateData });

  response.send("User Updated Successfully");
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
