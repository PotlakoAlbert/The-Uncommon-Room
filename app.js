const path = require('path');
require('dotenv').config();

// Import the server app
const server = require('./server');

// Get port from environment variable or fallback to 8080 (Azure's default)
const PORT = process.env.PORT || 8080;

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});