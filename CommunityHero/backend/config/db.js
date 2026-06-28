const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection failed:");
    console.error(error.message);
    console.error(
      "The server will keep running, but database requests (login, register, etc.) will fail until this is fixed."
    );
  }
};

module.exports = connectDB;