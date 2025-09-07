require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('./models/inventory');
const fs = require('fs');
const path = require('path');

// Read sample inventory data from JSON file
const sampleInventoryPath = path.join(__dirname, 'sample_inventory.json');
const sampleInventory = JSON.parse(fs.readFileSync(sampleInventoryPath, 'utf8'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Function to populate database
async function populateInventory() {
  try {
    // Clear existing inventory
    await Inventory.deleteMany({});
    console.log('Cleared existing inventory data');

    // Insert sample data
    const result = await Inventory.insertMany(sampleInventory);
    console.log(`Successfully added ${result.length} inventory items`);

    // Display the added items
    console.log('\nAdded items:');
    result.forEach(item => {
      console.log(`- ${item.name}: ${item.stocks} ${item.units} (Last restocked: ${item.restocked.toLocaleDateString()})`);
    });

    console.log('\nDatabase population completed successfully!');
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error populating database:', error);
    mongoose.connection.close();
  }
}

// Run the population script
populateInventory();

