var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// Add CORS middleware to allow cross-origin requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Increase request timeout (if needed)
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Request started`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Response: ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

mongoose.connect("mongodb://localhost:27017/C2");
mongoose.connection.on("connected", async () => {
  console.log("connected");
  
  // Initialize default roles
  const Role = require('./models/roles');
  const defaultRoles = ['user', 'mod', 'admin'];
  try {
    // Check and fix collection indexes if needed
    const roleCollection = mongoose.connection.db.collection('roles');
    
    // Drop the problematic index if it exists
    try {
      await roleCollection.dropIndex('name_1');
      console.log('Dropped old name index');
    } catch (indexErr) {
      // Index might not exist, which is fine
      console.log('No old index to drop or already dropped');
    }
    
    // Remove documents with null name/roleName that could be causing issues
    try {
      await roleCollection.deleteMany({ 
        $or: [
          { name: null }, 
          { roleName: null }
        ]
      });
      console.log('Removed problematic documents');
    } catch (deleteErr) {
      console.log('No problematic documents to remove');
    }
    
    // Now create/update the roles with the correct schema
    for (const role of defaultRoles) {
      const result = await Role.findOneAndUpdate(
        { roleName: role },
        { 
          roleName: role,
          description: `${role} role` 
        },
        { upsert: true, new: true }
      );
      console.log(`Ensured ${role} role exists`);
    }
    
    console.log('Default roles have been initialized');
  } catch (error) {
    console.error('Error initializing roles:', error);
  }
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/roles', require('./routes/roles'));
app.use('/auth', require('./routes/auth'));
app.use('/products', require('./routes/products'));
app.use('/categories', require('./routes/categories'));

// Add a debug endpoint to inspect users in database (remove in production!)
app.get('/debug/users', async function(req, res) {
  try {
    const User = require('./models/users');
    const users = await User.find({}, {username: 1, email: 1, _id: 0});
    res.json({
      success: true,
      count: users.length,
      users: users
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err);
  
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.send({
    success:false,
    message:err.message,
    stack: req.app.get('env') === 'development' ? err.stack : undefined
  });
});

module.exports = app;
