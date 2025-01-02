const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const nodemailer = require("nodemailer");
const path = require("path"); // To handle file paths
const jwt = require("jsonwebtoken"); // For authentication tokens
const dotenv = require('dotenv');
const schedule = require("node-schedule");

 
dotenv.config();
// Initialize the app
const app = express(); 
app.use(cors());
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Connection
mongoose
  .connect("mongodb+srv://teermanwaranush:Anushrao9866@habittrackerwebsite.js272.mongodb.net/", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected");
    scheduleReminders();
  })
  .catch((err) => console.error("MongoDB connection failed:", err));



  // JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || "secretKey";

// Middleware to verify JWT


// server.js

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const token = req.header("Authorization")?.replace("Bearer ", ""); // Extract token from header

  if (!token) {
    console.log("No token provided");  // Log if no token is sent
    return res.status(401).send("Access denied");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token
    req.user = decoded;  // Attach user info to the request object
    next();  // Proceed to the next m
    // iddleware/route handler
  } catch (err) {
    console.error("Error verifying token:", err);  // Debugging error
    res.status(400).send("Invalid token");
  }
}

app.use(express.json());  // Middleware to parse JSON requests

// Endpoint to fetch user data, using verifyToken middleware
app.get("/user-data", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id); // Find user by decoded ID from token
    res.json({ username: user.username });
  } catch (err) {
    console.error("Error fetching user data:", err);
    res.status(500).send("Error fetching user data");
  }
});


// User Schema and Model
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  mobile: { type: String, unique: true, required: true },
});
const User = mongoose.model("User", userSchema);

//Habit/reminder schema and model
const habitSchema = new mongoose.Schema({
  username: { type: String, required: true }, // Link habit to user
  habitName: { type: String, required: true },
  description: { type: String },
  date: { type: String, required: true },
  time: { type: String, required: true },
  frequency: { type: String, required: true }, // E.g., daily, weekly
  isActive: { type: Boolean, default: true },
});
const Habit = mongoose.model("Habit", habitSchema);

// OTP Storage
const otpMap = new Map();

// Generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000); // 6-digit OTP

// Send OTP via Email
const sendOTP = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "remindyou404@gmail.com",
      pass: "tsgugoipwcmnvduz", // Replace with your app-specific password
    },
  });

  const mailOptions = {
    to: email,
    subject: "Your OTP for Registration or Password Reset",
    text: `Your OTP is ${otp}. It is valid for 15 minutes.`,
  };

  await transporter.sendMail(mailOptions);
};

// API Routes

// Root route serves index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Registration - Send OTP
app.post("/register/send-otp", async (req, res) => {
  const { email } = req.body;

  try {
    const otp = generateOTP();
    otpMap.set(email, { otp, expiresAt: Date.now() + 15 * 60 * 1000 }); // Store OTP for 15 minutes
    await sendOTP(email, otp);
    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error sending OTP", error: err });
  }
});

// Verify OTP and Register User
app.post("/register/verify-otp", async (req, res) => {
  const { email, otp, username, password, mobile } = req.body;

  const storedOTP = otpMap.get(email);

  if (!storedOTP) {
    console.log("Error: OTP not found for this email");
    return res.status(400).json({ message: "OTP not found for this email" });
  }

  if (Number(storedOTP.otp) !== Number(otp)) {
    console.log("Error: OTP mismatch");
    return res.status(400).json({ message: "Incorrect OTP" });
  }

  if (Date.now() > storedOTP.expiresAt) {
    console.log("Error: OTP expired");
    return res.status(400).json({ message: "Expired OTP" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, email, mobile });
    await newUser.save();
    otpMap.delete(email); // Clear OTP after successful registration
    res.json({ message: "Registration successful" });
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ message: "Error registering user", error: err });
  }
});

// Login - User Authentication
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ $or: [{ email: username }, { username: username }] });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(400).json({ message: "Invalid password" });
  }

  // const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1h" });
  // res.json({ token });
  const token = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Send token and username to the client
  res.json({ token, username: user.username });
});



// Forgot Password - Send OTP
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const otp = generateOTP();
  otpMap.set(email, { otp, expiresAt: Date.now() + 15 * 60 * 1000 }); // Store OTP for 15 minutes
  await sendOTP(email, otp);

  res.json({ message: "OTP sent to email" });
});

// Reset Password - Verify OTP and Update Password
app.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const storedOTP = otpMap.get(email);

  if (!storedOTP) {
    console.log("Error: OTP not found for this email");
    return res.status(400).json({ message: "OTP not found for this email" });
  }

  if (Number(storedOTP.otp) !== Number(otp)) {
    console.log("Error: OTP mismatch");
    return res.status(400).json({ message: "Incorrect OTP" });
  }

  if (Date.now() > storedOTP.expiresAt) {
    console.log("Error: OTP expired");
    return res.status(400).json({ message: "Expired OTP" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await User.updateOne({ email }, { password: hashedPassword });
  otpMap.delete(email); // Clear OTP after password reset

  res.json({ message: "Password reset successfully" });
});



app.get('/habits/:id', async (req, res) => {
  const { id } = req.params;
  // console.log("Habit ID from params:", id); // Log the habit ID

  try {
    const habit = await Habit.findOne({ _id: new  mongoose.Types.ObjectId(id) });

    if (!habit) {
      console.error("Habit not found.");
      return res.status(404).json({ message: "Habit not found" });
    }

    // console.log("Fetched habit:", habit); // Log the fetched habit
    res.json(habit);
  } catch (err) {
    console.error("Error fetching habit:", err.message);
    res.status(500).json({ message: "Error fetching habit" });
  }
});

app.get('/habits/username/:username',async (req, res) => {
  const { username } = req.params;
  // console.log("Username from params:", username); // Log username
  console.log("Token in headers:", req.headers.authorization); // Log token from headers
  
  try {
    const habits = await Habit.find({ username });
    // console.log("Fetched habits:", habits); // Log habits fetched
    res.json(habits);
  } catch (err) {
    console.error("Error fetching habits:", err);
    res.status(500).json({ message: "Error fetching habits" });
  }
});



// Fetch habit by ID


// add
app.post("/habits",verifyToken, async (req, res) => {
  const { username, habitName, description, date, time, frequency } = req.body;
  try {
    const newHabit = new Habit({ username, habitName, description, date, time, frequency });
    await newHabit.save();
    res.json({ message: "Habit added successfully", habit: newHabit });
  } catch (err) {
    console.error("Error adding habit:", err);
    res.status(500).json({ message: "Error adding habit" });
  }
});


//update
app.post("/habits/:id", async (req, res) => {
  const { id } = req.params;
  const { habitName, description, date, time, frequency } = req.body;

  try {
    // Find the habit by its ID and update it
    const updatedHabit = await Habit.findByIdAndUpdate(
      id, // Habit ID from the URL
      {
        habitName,
        description,
        date,
        time,
        frequency,
      },
      { new: true } // Return the updated habit
    );

    if (!updatedHabit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    // console.log("Updated Habit:", updatedHabit);
    res.json(updatedHabit); // Respond with the updated habit data
  } catch (error) {
    console.error("Error updating habit:", error);
    res.status(500).json({ message: "Error updating habit" });
  }
});

//delete

app.delete("/habits/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedHabit = await Habit.findByIdAndDelete(id);
    if (!deletedHabit) {
      return res.status(404).json({ message: "Habit not found" });
    }
    res.json({ message: "Habit deleted successfully" });
  } catch (err) {
    console.error("Error deleting habit:", err);
    res.status(500).json({ message: "Error deleting habit" });
  }
});


// Get all fields of a habit


app.patch('/habits/:habitId/status', async (req, res) => {
  const { habitId } = req.params; // Get the habit ID from the URL
  const { isActive } = req.body; // Get the new status from the request body

  try {
    // Update the isActive field in the database
    const updatedHabit = await Habit.findByIdAndUpdate(
      habitId,
      { isActive },
      { new: true } // Return the updated document
    );

    // If no habit is found, return a 404 error
    if (!updatedHabit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    res.json({ message: 'Habit status updated successfully', habit: updatedHabit });
  } catch (err) {
    console.error("Error updating habit status:", err);
    res.status(500).json({ message: 'Error updating habit status' });
  }
});
//sending reminder mail

const sendReminderEmail = async (email, habitDetails) => {
  // Configure nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "remindyou404@gmail.com",
      pass: "tsgugoipwcmnvduz", // Replace with your app-specific password
    },
  });

  // Customize mail content
  const mailOptions = {
    to: email,
    subject: `Reminder: ${habitDetails.habitName}`,
    text: `Hello,

This is a reminder for your habit:

Habit Name: ${habitDetails.habitName}
Description: ${habitDetails.description || "No description provided."}
Scheduled Time: ${habitDetails.time}

Keep up the good work! Stay consistent with your habit.

Best regards,
Your RemindYou!
    `,
  };

  try {
    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to ${email} for habit: ${habitDetails.habitName}`);
  } catch (error) {
    console.error("Error sending reminder email:", error);
  }
};



const scheduleReminders = async () => {
  console.log('Scheduling reminders...');

  try {
    // Fetch all active habits from the 'habits' collection
    const habits = await mongoose.connection.collection('habits').find({ isActive: true }).toArray();

    for (const habit of habits) {
      const [hour, minute] = habit.time.split(':').map(Number);

      // Fetch user details to get the email
      const user = await mongoose.connection.collection('users').findOne({ username: habit.username });
      if (!user || !user.email) {
        console.error(`Email not found for username: ${habit.username}`);
        continue; // Skip scheduling if email is not found
      }

      // Email of the user
      const email = user.email;

      // Schedule based on the habit's frequency
      if (habit.frequency === 'daily') {
        // Schedule a daily reminder+
        schedule.scheduleJob(`${minute} ${hour} * * *`, () => {
          if (habit.isActive) {
            sendReminderEmail(email, habit);
          }
        });
      } 
      
      else if (habit.frequency === "weekly" && habit.date) {
        const [hour, minute] = habit.time.split(":").map(Number);
        
        // Convert habit.date (YYYY-MM-DD) to Date object
        const [year, month, day] = habit.date.split("-").map(Number);
        const reminderDate = new Date(year, month - 1, day, hour, minute); // Extract time from the date
        const dayOfWeek = reminderDate.getDay();
        schedule.scheduleJob(`${minute} ${hour} * * ${dayOfWeek}`, async () => {
            if (habit.isActive) {
                await sendRemainderEmail(email, habit); // Send reminder email
            }
        });
    }
    
      else if (habit.frequency === 'monthly') {
        // Schedule a monthly reminder (1st day of the month)
        schedule.scheduleJob(`${minute} ${hour} 1 * *`, () => {
          if (habit.isActive) {
            sendReminderEmail(email, habit);
          }
        });

      }
      else if (habit.frequency === 'onetime' && habit.date) {
        const [year, month, day] = habit.date.split('-').map(Number);
        const reminderDate = new Date(year, month - 1, day, hour, minute);

        if (reminderDate > new Date() && habit.isActive) {
          schedule.scheduleJob(reminderDate, () => {
            sendReminderEmail(email, habit);
          });
        }
      } 
    else {
        console.warn(`Invalid frequency for habit: ${habit.habitName}`);
      }
    }

    console.log('Reminders scheduled successfully.');
  } catch (error) {
    console.error('Error scheduling reminders:', error);
  }
};
// Start Server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
