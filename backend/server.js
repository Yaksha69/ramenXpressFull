require('dotenv').config();
const express = require('express');
const { default: mongoose } = require('mongoose');
const cors = require('cors');
const path = require('path');

const port = process.env.PORT;
const Mongoose_URI = process.env.MONGO_URI;


const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const menuRoutes = require('./routes/menuRoutes');
const salesRoutes = require('./routes/salesRoutes');
const mobileOrderRoutes = require('./routes/mobileOrderRoutes');
const customerRoutes = require('./routes/customerRoutes');
const paymentMethodRoutes = require('./routes/paymentMethodRoutes');
const deliveryAddressRoutes = require('./routes/deliveryAddressRoutes');
const otpRoutes = require('./routes/otpRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const kitchenRoutes = require('./routes/kitchenRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymongoRoutes = require('./routes/paymongoRoutes');


const app = express();

// Socket.io setup
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});
app.set('io', io); // Make io accessible in controllers

// CORS configuration
app.use(cors({
  origin: '*', // Allow all origins for mobile app compatibility
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false, // Set to false when using origin: '*'
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

app.use(express.json());

const mapper = '/api/v1/';


// Routes
app.use(mapper + 'auth', authRoutes);
app.use(mapper + 'inventory', inventoryRoutes);
app.use(mapper + 'menu', menuRoutes);
app.use(mapper + 'sales', salesRoutes);
app.use(mapper + 'mobile-orders', mobileOrderRoutes);
app.use(mapper + 'customers', customerRoutes);
app.use(mapper + 'payment-methods', paymentMethodRoutes);
app.use(mapper + 'delivery-addresses', deliveryAddressRoutes);
app.use(mapper + 'otp', otpRoutes);
app.use(mapper + 'reviews', reviewRoutes);
app.use(mapper + 'kitchen', kitchenRoutes);
app.use(mapper + 'notifications', notificationRoutes);
app.use(mapper + 'paymongo', paymongoRoutes);
app.use('/uploads/menus', express.static(path.join(__dirname, 'uploads/menus')));

// MongoDB connection with retry mechanism
const connectWithRetry = () => {
  console.log('🔄 Attempting to connect to MongoDB...');
  
  // Validate MongoDB URI format
  if (!Mongoose_URI) {
    console.error('❌ MONGO_URI environment variable is not set');
    return;
  }
  
  // Check if URI has the correct format
  if (!Mongoose_URI.startsWith('mongodb://') && !Mongoose_URI.startsWith('mongodb+srv://')) {
    console.error('❌ Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
    return;
  }
  
  console.log('🔗 MongoDB URI format appears valid');
  
  mongoose.connect(Mongoose_URI, {
    serverSelectionTimeoutMS: 10000, // 10 second timeout
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverApi: {
      version: '1',
      strict: true,
      deprecationErrors: true,
    }
  })
  .then(() => {
    console.log('✅ MongoDB Connected successfully');
    console.log('🔗 Database URL:', Mongoose_URI ? 'Set' : 'Not set');
    console.log('🗄️ Database name:', mongoose.connection.name);
    console.log('🔌 Connection state:', mongoose.connection.readyState);
    
    // Test the connection with a simple query
    mongoose.connection.db.admin().ping()
      .then(() => console.log('✅ Database ping successful'))
      .catch(err => console.error('❌ Database ping failed:', err));
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    console.error('🔗 Database URL:', Mongoose_URI ? 'Set' : 'Not set');
    console.error('💥 Server will continue but database operations will fail');
    
    // Log more details about the connection string (without sensitive info)
    if (Mongoose_URI) {
      const uriParts = Mongoose_URI.split('@');
      if (uriParts.length > 1) {
        const hostPart = uriParts[1].split('/')[0];
        console.error('🌐 Trying to connect to host:', hostPart);
      }
    }
    
    // Retry connection after 10 seconds
    console.log('🔄 Retrying connection in 10 seconds...');
    setTimeout(connectWithRetry, 10000);
  });
};

// Start the connection
connectWithRetry();

// Health check endpoint
app.get('/health', (req, res) => {
  const healthInfo = {
    status: 'OK',
    message: 'RamenXpress API is running',
    timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        PORT: process.env.PORT || 'not set',
        MONGO_URI: process.env.MONGO_URI ? 'set' : 'not set',
        JWT_SECRET: process.env.JWT_SECRET ? 'set' : 'not set',
        PAYMONGO_SECRET_KEY: process.env.PAYMONGO_SECRET_KEY ? 'set' : 'not set'
      },
    database: 'checking...'
  };
  
  // Check database connection
  mongoose.connection.readyState === 1 
    ? healthInfo.database = 'connected'
    : healthInfo.database = 'disconnected';
  
  res.json(healthInfo);
});

// Test sales endpoint without authentication
app.post('/api/v1/sales/test-order', async (req, res) => {
  try {
    console.log('Test order received:', req.body);
    
    // Simulate successful order processing
    const orderId = Date.now().toString();
    
    res.status(201).json({
      success: true,
      message: 'Test order processed successfully',
      orderDetails: {
        orderId: orderId,
        items: req.body.items || [],
        total: req.body.total || 0
      }
    });
  } catch (error) {
    console.error('Test order error:', error);
    res.status(500).json({
      success: false,
      message: 'Test order failed',
      error: error.message
    });
  }
});

// Test MongoDB connection endpoint
app.get('/test-mongo', (req, res) => {
  try {
    console.log('🧪 Testing MongoDB connection...');
    
    // Check if MONGO_URI is set
    if (!Mongoose_URI) {
      return res.status(500).json({
        error: 'MONGO_URI environment variable is not set',
        connectionState: mongoose.connection.readyState
      });
    }
    
    // Log connection string format (without sensitive data)
    const uriParts = Mongoose_URI.split('@');
    const hostInfo = uriParts.length > 1 ? uriParts[1].split('/')[0] : 'unknown';
    
    res.json({
      connectionState: mongoose.connection.readyState,
      mongoUriSet: !!Mongoose_URI,
      hostInfo: hostInfo,
      connectionName: mongoose.connection.name,
      readyState: mongoose.connection.readyState,
      // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
      readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      connectionState: mongoose.connection.readyState
    });
  }
});

server.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
    console.log(`🏥 Health check available at http://localhost:${port}/health`);
    console.log(`💰 PayMongo QR payments enabled for POS`);
});

