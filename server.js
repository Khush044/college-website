require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');

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
const User = require('./models/User');
const Contact = require('./models/Contact');

// Middleware
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'university-secret-key',
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Global middleware for templates
app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Auth middleware
const isLoggedIn = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

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

app.get('/apply', isLoggedIn, (req, res) => {
  res.render('apply', { title: 'Apply Now', success: false, error: null, program: req.query.program || '' });
});

app.post('/apply', isLoggedIn, async (req, res) => {
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

app.get('/login', (req, res) => {
  res.render('login', { title: 'Log In', error: null });
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', { title: 'Log In', error: 'User not found' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', { title: 'Log In', error: 'Invalid password' });
    }

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.render('login', { title: 'Log In', error: 'Server error during login' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/signup', (req, res) => {
  res.render('signup', { title: 'Sign Up', error: null, success: false });
});

app.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const existingUser = await User.findOne({ email });
    if(existingUser) {
        return res.render('signup', { title: 'Sign Up', error: 'Email already in use', success: false });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role });
    await newUser.save();
    
    res.render('signup', { title: 'Sign Up', error: null, success: true });
  } catch (error) {
    console.error(error);
    res.render('signup', { title: 'Sign Up', error: 'Failed to create account.', success: false });
  }
});

app.get('/dashboard', isLoggedIn, async (req, res) => {
  try {
    const applications = await Application.find({ email: req.session.user.email });
    res.render('dashboard', { title: 'Dashboard', applications });
  } catch (error) {
    res.status(500).send('Error loading dashboard');
  }
});

app.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact Us', success: false, error: null });
});

app.post('/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const newContact = new Contact({ name, email, message });
    await newContact.save();
    res.render('contact', { title: 'Contact Us', success: true, error: null });
  } catch (error) {
    console.error(error);
    res.render('contact', { title: 'Contact Us', success: false, error: 'Failed to send message.' });
  }
});

app.listen(PORT, () => {
  console.log(`College website running at http://localhost:${PORT}`);
});
