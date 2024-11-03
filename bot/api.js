const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');
const mcDataLoader = require('minecraft-data');
const express = require('express');
const app = express();
const crafter = require("mineflayer-crafting-util").plugin


// Use express.json() middleware to parse JSON request bodies
app.use(express.json());

// Variables to store bot and mcData
let bot;
let mcData;

// Create the bot with updated username and port
bot = mineflayer.createBot({
  host: 'localhost',        // Replace with your server IP if different
  port: 12345,               // Updated server port
  username: 'Skibidii-Gyatt', // Updated bot username
  // Additional options can be added here if needed
});

// Load the pathfinder plugin
bot.loadPlugin(pathfinder);
bot.loadPlugin(crafter)


// Handle connection errors
bot.on('error', (err) => console.log(`Bot encountered an error: ${err}`));
bot.on('end', () => console.log('Bot has disconnected from the server'));

// Wait for the bot to spawn in the world
bot.once('spawn', async () => {
  try {
    console.log('Bot has spawned in the game');

    // Initialize movements with Minecraft data
    mcData = mcDataLoader(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    // Start the Express server after the bot is ready
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Express server is running on port ${PORT}`);
    });

    // You can add more initialization tasks here if needed
  } catch (err) {
    console.log(`An error occurred during initialization: ${err.message}`);
  }
});

// -------------------- Function Definitions -------------------- //

// Function to travel to specific coordinates
function travelToCoordinates(x, y, z) {
  return new Promise((resolve, reject) => {
    const goal = new goals.GoalBlock(x, y, z);
    bot.pathfinder.setGoal(goal);

    const onGoalReached = () => {
      console.log(`Reached destination (${x}, ${y}, ${z})`);
      bot.removeListener('goal_reached', onGoalReached);
      resolve();
    };

    const onGoalFailed = (reason) => {
      console.log(`Failed to reach destination: ${reason}`);
      bot.removeListener('goal_reached', onGoalReached);
      reject(new Error(reason));
    };

    bot.once('goal_reached', onGoalReached);
    bot.once('path_update', (r) => {
      if (r.status === 'noPath') {
        onGoalFailed('No path found');
      }
    });
  });
}

// Function to mine a block at specific coordinates
// Function to mine a block at specific coordinates
function mineBlockAt(x, y, z) {
  return new Promise(async (resolve, reject) => {
    try {
      // Define the offset
      const offsetX = -1;
      const offsetY = 0;
      const offsetZ = 0;
      const targetX = x + offsetX;
      const targetY = y + offsetY;
      const targetZ = z + offsetZ;

      // Move to the offset position using the existing travelToCoordinates function
      await travelToCoordinates(targetX, targetY, targetZ);

      // Now attempt to mine the block at (x, y, z)
      const targetBlock = bot.blockAt(new Vec3(x, y, z));

      if (!targetBlock) {
        return reject(new Error(`No block found at (${x}, ${y}, ${z})`));
      }

      if (!bot.canDigBlock(targetBlock)) {
        return reject(new Error(`Cannot dig block at (${x}, ${y}, ${z})`));
      }

      // Optionally, look at the block before mining
      await bot.lookAt(targetBlock.position, true);

      // Start mining the block
      await bot.dig(targetBlock);
      console.log(`Successfully mined block at (${x}, ${y}, ${z})`);
      resolve();
    } catch (err) {
      console.log(`Error while mining: ${err.message}`);
      reject(err);
    }
  });
}


// Function to use a block like a crafting table
function useBlockAt(x, y, z) {
  return new Promise((resolve, reject) => {
    const targetBlock = bot.blockAt(new Vec3(x, y, z));

    if (!targetBlock) {
      return reject(new Error(`No block found at (${x}, ${y}, ${z})`));
    }

    bot.lookAt(targetBlock.position.offset(0.5, 0.5, 0.5), true)
      .then(() => bot.activateBlock(targetBlock))
      .then(() => {
        console.log(`Interacted with block at (${x}, ${y}, ${z})`);
        resolve();
      })
      .catch((err) => {
        console.log(`Error while using block: ${err.message}`);
        reject(err);
      });
  });
}

// Function to drop an item by name
function dropItemByName(itemName) {
  return new Promise((resolve, reject) => {
    const item = bot.inventory.items().find((i) => i.name === itemName);

    if (!item) {
      return reject(new Error(`Item "${itemName}" not found in inventory`));
    }

    bot.tossStack(item)
      .then(() => {
        console.log(`Dropped item: ${itemName}`);
        resolve();
      })
      .catch((err) => {
        console.log(`Error while dropping item: ${err.message}`);
        reject(err);
      });
  });
}

// Function to place a block at specific coordinates
function placeBlockAt(blockName, x, y, z) {
  return new Promise(async (resolve, reject) => {
    const referenceBlock = bot.blockAt(new Vec3(x, y - 1, z));
    const targetPosition = new Vec3(x, y, z);

    if (!referenceBlock) {
      return reject(new Error(`No block to place against at (${x}, ${y - 1}, ${z})`));
    }

    const item = bot.inventory.items().find((i) => i.name === blockName);

    if (!item) {
      return reject(new Error(`No "${blockName}" in inventory`));
    }

    try {
      await bot.equip(item, 'hand');
      const faceVector = new Vec3(0, 1, 0); // Adjust as needed for placement
      await bot.placeBlock(referenceBlock, faceVector);
      console.log(`Placed "${blockName}" at (${x}, ${y}, ${z})`);
      resolve();
    } catch (err) {
      console.log(`Error while placing block: ${err.message}`);
      reject(err);
    }
  });
}

// Function to craft an item
function craftItem(itemName) {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure mcData is available
      if (!mcData) {
        return reject(new Error('Minecraft data not loaded'));
      }

      const itemId = mcData.itemsByName[itemName]?.id;
      if (!itemId) {
        return reject(new Error(`Item "${itemName}" does not exist`));
      }

      // Find a crafting table or use inventory
      const craftingTableId = mcData.itemsByName['crafting_table'].id;
      let craftingTableBlock = bot.findBlock({
        matching: craftingTableId,
        maxDistance: 64,
      });

      // Place crafting table if not found
      if (!craftingTableBlock) {
        const craftingTableItem = bot.inventory.items().find(item => item.name === 'crafting_table');
        if (craftingTableItem) {
          const referenceBlock = bot.blockAt(bot.entity.position.offset(0, -1, 0));
          await bot.equip(craftingTableItem, 'hand');
          await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
          craftingTableBlock = bot.blockAt(referenceBlock.position.offset(0, 1, 0));
        } else {
          return reject(new Error('No crafting table available'));
        }
      }

      // Get the recipes for the desired item
      const recipes = bot.recipesFor(itemId, null, 1, craftingTableBlock);
      if (recipes.length === 0) {
        return reject(new Error(`No recipe found for "${itemName}"`));
      }

      const recipe = recipes[0];

      // Check if the bot has the required materials
      const missingItems = [];

      for (const ingredient of recipe.delta) {
        if (ingredient.count < 0) {
          const requiredItem = mcData.items[ingredient.id];
          const requiredCount = -ingredient.count;
          const inventoryCount = bot.inventory.count(ingredient.id, null);

          if (inventoryCount < requiredCount) {
            missingItems.push(`${requiredCount - inventoryCount}x ${requiredItem.name}`);
          }
        }
      }

      if (missingItems.length > 0) {
        return reject(new Error(`Missing materials: ${missingItems.join(', ')}`));
      }

      // Craft the item
      await bot.craft(recipe, 1, craftingTableBlock);
      console.log(`Successfully crafted "${itemName}"`);
      resolve();

    } catch (err) {
      console.log(`Error while crafting "${itemName}": ${err.message}`);
      reject(err);
    }
  });
}

// -------------------- Express API Endpoints -------------------- //

// Test
app.get('/', (req, res) => {
  res.send('Minecraft Bot API is running');
});

// Travel to coordinates
app.post('/travel', async (req, res) => {
  const { x, y, z } = req.body;
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    return res.status(400).json({ error: 'x, y, and z must be numbers' });
  }

  try {
    await travelToCoordinates(x, y, z);
    res.json({ message: `Traveling to (${x}, ${y}, ${z})` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mine block at coordinates
app.post('/mine', async (req, res) => {
  const { x, y, z } = req.body;
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    return res.status(400).json({ error: 'x, y, and z must be numbers' });
  }

  try {
    await mineBlockAt(x, y, z);
    res.json({ message: `Mined block at (${x}, ${y}, ${z})` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Use block at coordinates
app.post('/use', async (req, res) => {
  const { x, y, z } = req.body;
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    return res.status(400).json({ error: 'x, y, and z must be numbers' });
  }

  try {
    await useBlockAt(x, y, z);
    res.json({ message: `Used block at (${x}, ${y}, ${z})` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Drop item by name
app.post('/drop', async (req, res) => {
  const { itemName } = req.body;
  if (!itemName) {
    return res.status(400).json({ error: 'itemName is required' });
  }

  try {
    await dropItemByName(itemName);
    res.json({ message: `Dropped item: ${itemName}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Place block at coordinates
app.post('/place', async (req, res) => {
  const { blockName, x, y, z } = req.body;
  if (!blockName || typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    return res.status(400).json({ error: 'blockName, x, y, and z are required' });
  }

  try {
    await placeBlockAt(blockName, x, y, z);
    res.json({ message: `Placed ${blockName} at (${x}, ${y}, ${z})` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Craft item
app.post('/craft', async (req, res) => {
  const { itemName } = req.body;
  if (!itemName) {
    return res.status(400).json({ error: 'itemName is required' });
  }

  try {
    await craftItem(itemName);
    res.json({ message: `Crafted item: ${itemName}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- End of Express API Endpoints -------------------- //