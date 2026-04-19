const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/college';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Models
const Course = require('./models/Course');
const Application = require('./models/Application');

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Routing
app.get('/', async (req, res) => {
  try {
    // Seed some data if completely empty
    const count = await Course.countDocuments();
    if (count === 0) {
      await Course.insertMany([
        { name: 'Computer Science', code: 'CS101', duration: '4 Years', description: 'Learn software engineering, algorithms, and more.' },
        { name: 'Business Administration', code: 'BBA101', duration: '3 Years', description: 'Master the art of business and management.' },
        { name: 'Mechanical Engineering', code: 'ME101', duration: '4 Years', description: 'Design and build the future with mechanical engineering.' }
      ]);
    }
  } catch(e) { console.error("Could not seed data", e); }
  res.render('index', { title: 'Home' });
});

app.get('/courses', async (req, res) => {
  try {
    const courses = await Course.find();
    res.render('courses', { title: 'Our Courses', courses });
  } catch (error) {
    res.status(500).send('Error fetching courses');
  }
});

app.get('/apply', (req, res) => {
  res.render('apply', { title: 'Apply Now', success: false, error: null });
});

app.post('/apply', async (req, res) => {
  try {
    const { fullName, email, phone, program } = req.body;
    const newApp = new Application({ fullName, email, phone, program });
    await newApp.save();
    res.render('apply', { title: 'Apply Now', success: true, error: null });
  } catch (error) {
    console.error(error);
    res.render('apply', { title: 'Apply Now', success: false, error: 'Failed to submit application. Please provide valid details.' });
  }
});

app.listen(PORT, () => {
  console.log(`College website running at http://localhost:${PORT}`);
});
