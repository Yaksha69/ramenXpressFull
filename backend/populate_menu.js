const fs = require('fs');
const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const dbName = 'ramenxpressApp';
const collectionName = 'menus'; // Use the correct collection for the Menu model
const jsonFilePath = './sample_menu.json';

async function main() {
  let client;
  try {
    // Read and parse the JSON file
    const data = fs.readFileSync(jsonFilePath, 'utf8');
    const menuItems = JSON.parse(data);

    if (!Array.isArray(menuItems)) {
      throw new Error('Parsed menu data is not an array. Please check sample_menu.json format.');
    }

    // Map ingredients to match the Menu schema
    const mappedMenuItems = menuItems.map(item => ({
      ...item,
      category: item.category ? item.category.toLowerCase() : '', // match enum in schema
      ingredients: Array.isArray(item.ingredients)
        ? item.ingredients.map(ing => ({
            inventoryItem: ing.name,
            quantity: ing.quantity
          }))
        : []
    }));

    // Connect to MongoDB
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Remove existing documents to avoid duplicates
    await collection.deleteMany({});

    // Insert menu items
    const result = await collection.insertMany(mappedMenuItems);
    console.log(`Inserted ${result.insertedCount} menu items into '${collectionName}' collection.`);
  } catch (err) {
    console.error('Error populating menu:', err.message);
  } finally {
    if (client) await client.close();
  }
}

main();
