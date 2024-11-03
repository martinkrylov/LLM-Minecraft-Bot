// Import required modules
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');
const mcDataLoader = require('minecraft-data');
const express = require('express');
const rateLimit = require('express-rate-limit'); // For rate limiting
const winston = require('winston'); // For logging

// Initialize Express app
const app = express();

// Use express.json() middleware to parse JSON request bodies
app.use(express.json());

// -------------------- Configure Logging with Winston -------------------- //

// Configure winston logger
const logger = winston.createLogger({
  level: 'info', // Log level
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(), // Log to console
    new winston.transports.File({ filename: 'bot.log' }) // Log to file
  ],
});

// -------------------- API Rate Limiting -------------------- //

// Define rate limiting rules
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 60, // Limit each IP to 60 requests per windowMs
  message: 'Too many requests from this IP, please try again after a minute',
});

// Apply the rate limiting middleware to all requests
app.use(limiter);

// -------------------- API Key Authentication -------------------- //

// Set your API key as an environment variable for security
const API_KEY = process.env.API_KEY || 'your_default_api_key';

// Middleware to authenticate requests using API Key
function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === API_KEY) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
}

// Apply the authentication middleware to all routes
app.use(authenticate);

// -------------------- Initialize Variables -------------------- //

let bot; // Mineflayer bot instance
let mcData; // Minecraft data for the current version

// -------------------- Create and Configure the Bot -------------------- //

bot = mineflayer.createBot({
  host: 'localhost',            // Replace with your server IP if different
  port: 7754,                   // Updated server port
  username: 'Skibidi-Rizz',  // Updated bot username
  // Additional options can be added here if needed
});

// Load the pathfinder plugin
bot.loadPlugin(pathfinder);

// Handle connection errors
bot.on('error', (err) => logger.error(`Bot encountered an error: ${err}`));
bot.on('end', () => logger.info('Bot has disconnected from the server'));

// -------------------- Bot Spawn Event -------------------- //

bot.once('spawn', async () => {
  try {
    logger.info('Bot has spawned in the game');

    // Initialize Minecraft data based on the bot's version
    mcData = mcDataLoader(bot.version);
    logger.info('mcData loaded successfully');

    // Initialize movements with Minecraft data
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);
    logger.info('Pathfinder movements set');

    // Start the Express server after the bot is ready
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      logger.info(`Express server is running on port ${PORT}`);
    });

    // Additional initialization tasks can be added here if needed

  } catch (err) {
    logger.error(`An error occurred during initialization: ${err.message}`);
  }
});

// -------------------- Function Definitions -------------------- //

/**
 * Travels the bot to the specified coordinates.
 * @param {number} x - X-coordinate.
 * @param {number} y - Y-coordinate.
 * @param {number} z - Z-coordinate.
 */
function travelToCoordinates(x, y, z) {
  return new Promise((resolve, reject) => {
    const goal = new goals.GoalBlock(x, y, z);
    bot.pathfinder.setGoal(goal);

    const onGoalReached = () => {
      logger.info(`Reached destination (${x}, ${y}, ${z})`);
      bot.removeListener('goal_reached', onGoalReached);
      resolve();
    };

    const onGoalFailed = (reason) => {
      logger.warn(`Failed to reach destination: ${reason}`);
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

/**
 * Mines the block at the specified coordinates.
 * @param {number} x - X-coordinate.
 * @param {number} y - Y-coordinate.
 * @param {number} z - Z-coordinate.
 */
function mineBlockAt(x, y, z) {
  return new Promise((resolve, reject) => {
    const targetBlock = bot.blockAt(new Vec3(x, y, z));

    if (!targetBlock) {
      return reject(new Error(`No block found at (${x}, ${y}, ${z})`));
    }

    if (!bot.canDigBlock(targetBlock)) {
      return reject(new Error(`Cannot dig block at (${x}, ${y}, ${z})`));
    }

    bot.dig(targetBlock)
      .then(() => {
        logger.info(`Successfully mined block at (${x}, ${y}, ${z})`);
        resolve();
      })
      .catch((err) => {
        logger.error(`Error while mining: ${err.message}`);
        reject(err);
      });
  });
}

/**
 * Uses (activates) the block at the specified coordinates.
 * @param {number} x - X-coordinate.
 * @param {number} y - Y-coordinate.
 * @param {number} z - Z-coordinate.
 */
function useBlockAt(x, y, z) {
  return new Promise((resolve, reject) => {
    const targetBlock = bot.blockAt(new Vec3(x, y, z));

    if (!targetBlock) {
      return reject(new Error(`No block found at (${x}, ${y}, ${z})`));
    }

    bot.lookAt(targetBlock.position.offset(0.5, 0.5, 0.5), true)
      .then(() => bot.activateBlock(targetBlock))
      .then(() => {
        logger.info(`Interacted with block at (${x}, ${y}, ${z})`);
        resolve();
      })
      .catch((err) => {
        logger.error(`Error while using block: ${err.message}`);
        reject(err);
      });
  });
}

/**
 * Drops an item from the bot's inventory by item name.
 * @param {string} itemName - Name of the item to drop.
 */
function dropItemByName(itemName) {
  return new Promise((resolve, reject) => {
    const item = bot.inventory.items().find((i) => i.name === itemName);

    if (!item) {
      return reject(new Error(`Item "${itemName}" not found in inventory`));
    }

    bot.tossStack(item)
      .then(() => {
        logger.info(`Dropped item: ${itemName}`);
        resolve();
      })
      .catch((err) => {
        logger.error(`Error while dropping item: ${err.message}`);
        reject(err);
      });
  });
}

/**
 * Places a block at the specified coordinates.
 * @param {string} blockName - Name of the block to place.
 * @param {number} x - X-coordinate.
 * @param {number} y - Y-coordinate.
 * @param {number} z - Z-coordinate.
 */
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
      logger.info(`Placed "${blockName}" at (${x}, ${y}, ${z})`);
      resolve();
    } catch (err) {
      logger.error(`Error while placing block: ${err.message}`);
      reject(err);
    }
  });
}

/**
 * Crafts an item using a crafting table.
 * @param {string} itemName - Name of the item to craft.
 */
function craftItem(itemName) {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info(`Attempting to craft "${itemName}"`);

      // Ensure mcData is available
      if (!mcData) {
        logger.error('Minecraft data is not loaded');
        return reject(new Error('Minecraft data not loaded'));
      }

      const itemId = mcData.itemsByName[itemName]?.id;
      if (!itemId) {
        logger.error(`Item "${itemName}" does not exist`);
        return reject(new Error(`Item "${itemName}" does not exist`));
      }

      // Find a crafting table within 64 blocks
      const craftingTableId = mcData.itemsByName['crafting_table'].id;
      let craftingTableBlock = bot.findBlock({
        matching: craftingTableId,
        maxDistance: 64,
      });

      // If no crafting table is found, attempt to place one
      if (!craftingTableBlock) {
        const craftingTableItem = bot.inventory.items().find(item => item.name === 'crafting_table');
        if (craftingTableItem) {
          // Find a block to place the crafting table against (e.g., ground)
          const referenceBlock = bot.blockAt(bot.entity.position.offset(0, -1, 0));
          if (!referenceBlock) {
            logger.error('No reference block found to place the crafting table');
            return reject(new Error('No reference block found to place the crafting table'));
          }

          // Equip the crafting table
          await bot.equip(craftingTableItem, 'hand');
          logger.info('Equipped crafting table');

          // Attempt to place the crafting table
          await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
          logger.info('Placed crafting table');

          // Wait briefly to ensure the block is placed
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

          // Retrieve the placed crafting table block
          craftingTableBlock = bot.blockAt(referenceBlock.position.offset(0, 1, 0));

          if (!craftingTableBlock) {
            logger.error('Failed to place crafting table');
            return reject(new Error('Failed to place crafting table'));
          }

          logger.info('Crafting table placed and block reference obtained');
        } else {
          logger.error('No crafting table available in inventory');
          return reject(new Error('No crafting table available in inventory'));
        }
      } else {
        logger.info('Crafting table found in vicinity');
      }

      // Get the recipes for the desired item using the crafting table
      const recipes = bot.recipesFor(itemId, null, 1, craftingTableBlock);
      if (recipes.length === 0) {
        logger.error(`No recipe found for "${itemName}"`);
        return reject(new Error(`No recipe found for "${itemName}"`));
      }

      const recipe = recipes[0];
      logger.info(`Found recipe for "${itemName}"`);

      // Check if the bot has the required materials
      const missingItems = [];

      for (const ingredient of recipe.delta) {
        if (ingredient.count < 0) { // Negative count indicates required items
          const requiredItem = mcData.items[ingredient.id];
          const requiredCount = -ingredient.count;
          const inventoryCount = bot.inventory.count(ingredient.id, null);

          if (inventoryCount < requiredCount) {
            missingItems.push(`${requiredCount - inventoryCount}x ${requiredItem.name}`);
          }
        }
      }

      if (missingItems.length > 0) {
        logger.warn(`Missing materials: ${missingItems.join(', ')}`);
        return reject(new Error(`Missing materials: ${missingItems.join(', ')}`));
      }

      // Craft the item
      await bot.craft(recipe, 1, craftingTableBlock);
      logger.info(`Successfully crafted "${itemName}"`);
      resolve();

    } catch (err) {
      logger.error(`Error while crafting "${itemName}": ${err.message}`);
      reject(err);
    }
  });
}

// -------------------- Express API Endpoints -------------------- //

/**
 * Health Check Endpoint
 * GET /status
 */
app.get('/status', (req, res) => {
  if (bot && bot.connected && mcData) {
    res.json({ status: 'Bot is connected and ready' });
  } else {
    res.json({ status: 'Bot is not ready' });
  }
});

/**
 * Travel to Coordinates
 * POST /travel
 * Body: { "x": number, "y": number, "z": number }
 */
app.post('/travel', async (req, res) => {
  const { x, y, z } = req.body;

  // Input validation
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    logger.warn('Invalid travel request payload');
    return res.status(400).json({ error: 'x, y, and z must be numbers' });
  }

  try {
    await travelToCoordinates(x, y, z);
    res.json({ message: `Traveling to (${x}, ${y}, ${z})` });
  } catch (err) {
    logger.error(`Traveling failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Mine Block at Coordinates
 * POST /mine
 * Body: { "x": number, "y": number, "z": number }
 */
app.post('/mine', async (req, res) => {
  const { x, y, z } = req.body;

  // Input validation
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    logger.warn('Invalid mine request payload');
    return res.status(400).json({ error: 'x, y, and z must be numbers' });
  }

  try {
    await mineBlockAt(x, y, z);
    res.json({ message: `Mined block at (${x}, ${y}, ${z})` });
  } catch (err) {
    logger.error(`Mining failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Use (Activate) Block at Coordinates
 * POST /use
 * Body: { "x": number, "y": number, "z": number }
 */
app.post('/use', async (req, res) => {
  const { x, y, z } = req.body;

  // Input validation
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    logger.warn('Invalid use request payload');
    return res.status(400).json({ error: 'x, y, and z must be numbers' });
  }

  try {
    await useBlockAt(x, y, z);
    res.json({ message: `Used block at (${x}, ${y}, ${z})` });
  } catch (err) {
    logger.error(`Using block failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Drop Item by Name
 * POST /drop
 * Body: { "itemName": string }
 */
app.post('/drop', async (req, res) => {
  const { itemName } = req.body;

  // Input validation
  if (!itemName || typeof itemName !== 'string') {
    logger.warn('Invalid drop request payload');
    return res.status(400).json({ error: 'itemName is required and must be a string' });
  }

  try {
    await dropItemByName(itemName);
    res.json({ message: `Dropped item: ${itemName}` });
  } catch (err) {
    logger.error(`Dropping item failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Place Block at Coordinates
 * POST /place
 * Body: { "blockName": string, "x": number, "y": number, "z": number }
 */
app.post('/place', async (req, res) => {
  const { blockName, x, y, z } = req.body;

  // Input validation
  if (!blockName || typeof blockName !== 'string') {
    logger.warn('Invalid place request payload: blockName missing or not a string');
    return res.status(400).json({ error: 'blockName is required and must be a string' });
  }
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    logger.warn('Invalid place request payload: x, y, and z must be numbers');
    return res.status(400).json({ error: 'x, y, and z must be numbers' });
  }

  try {
    await placeBlockAt(blockName, x, y, z);
    res.json({ message: `Placed ${blockName} at (${x}, ${y}, ${z})` });
  } catch (err) {
    logger.error(`Placing block failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Craft Item by Name
 * POST /craft
 * Body: { "itemName": string }
 */
app.post('/craft', async (req, res) => {
  const { itemName } = req.body;

  // Input validation
  if (!itemName || typeof itemName !== 'string') {
    logger.warn('Invalid craft request payload');
    return res.status(400).json({ error: 'itemName is required and must be a string' });
  }

  try {
    await craftItem(itemName);
    res.json({ message: `Crafted item: ${itemName}` });
  } catch (err) {
    if (err.message.startsWith('Missing materials')) {
      logger.warn(`Crafting failed due to missing materials: ${err.message}`);
      res.status(400).json({ error: `I don't have mats! Needed: ${err.message.replace('Missing materials: ', '')}` });
    } else {
      logger.error(`Crafting failed: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }
});

// -------------------- End of Express API Endpoints -------------------- //