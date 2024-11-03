const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');
const mcDataLoader = require('minecraft-data');
const express = require('express');
const app = express();

const winston = require('winston'); // For logging

// Load environment variables from .env file
require('dotenv').config();

// Use express.json() middleware to parse JSON request bodies
app.use(express.json());

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

// Variables to store bot and mcData
let bot;
let mcData;

// Define authorized users
const authorizedUsers = ['Magic_karp24']; // Replace with your Minecraft username(s)

// Create the bot with updated username and port
bot = mineflayer.createBot({
  host: 'localhost',             // Replace with your server IP if different
  port: process.env.SERVER_PORT,                    // Updated server port
  username: process.env.USERNAME,    // Updated bot username
  // Additional options can be added here if needed
});

// Load the pathfinder plugin
bot.loadPlugin(pathfinder);

// Handle connection errors
bot.on('error', (err) => logger.error(`Bot encountered an error: ${err}`));
bot.on('end', () => logger.info('Bot has disconnected from the server'));

// Wait for the bot to spawn in the world
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
    const PORT = process.env.API_PORT || 5001; // Use port from .env or default to 5001
    app.listen(PORT, () => {
      logger.info(`Express server is running on port ${PORT}`);
    });

    // You can add more initialization tasks here if needed
  } catch (err) {
    logger.error(`An error occurred during initialization: ${err.message}`);
  }
});

// -------------------- Function Definitions -------------------- //

// Function to travel to specific coordinates
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

// Function to mine a block at specific coordinates
function mineBlockAt(x, y, z) {
  return new Promise(async (resolve, reject) => {
    try {
      // Define the offset (you can adjust this as needed)
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
      logger.info(`Successfully mined block at (${x}, ${y}, ${z})`);
      resolve();
    } catch (err) {
      logger.error(`Error while mining: ${err.message}`);
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
        logger.info(`Interacted with block at (${x}, ${y}, ${z})`);
        resolve();
      })
      .catch((err) => {
        logger.error(`Error while using block: ${err.message}`);
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
        logger.info(`Dropped item: ${itemName}`);
        resolve();
      })
      .catch((err) => {
        logger.error(`Error while dropping item: ${err.message}`);
        reject(err);
      });
  });
}

// Function to place a block at specific coordinates
function placeBlockAt(blockName, x, y, z) {
  return new Promise(async (resolve, reject) => {
    try {
      const referenceBlock = bot.blockAt(new Vec3(x, y - 1, z));
      const targetPosition = new Vec3(x, y, z);

      if (!referenceBlock) {
        return reject(new Error(`No block to place against at (${x}, ${y - 1}, ${z})`));
      }

      const item = bot.inventory.items().find((i) => i.name === blockName);

      if (!item) {
        return reject(new Error(`No "${blockName}" in inventory`));
      }

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

// Function to craft an item using Mineflayer's built-in crafting
function craftItem(itemName) {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure mcData is available
      if (!mcData) {
        return reject(new Error('Minecraft data not loaded'));
      }

      const item = mcData.itemsByName[itemName];
      if (!item) {
        return reject(new Error(`Item "${itemName}" does not exist`));
      }

      const itemId = item.id;

      // Get all possible recipes for the item
      const recipes = bot.recipesFor(itemId, null, 1, null);

      if (recipes.length === 0) {
        return reject(new Error(`No recipe found for "${itemName}"`));
      }

      const recipe = recipes[0]; // Choose the first available recipe

      // Attempt to craft the item
      await bot.craft(recipe, 1);
      logger.info(`Successfully crafted "${itemName}"`);
      resolve();
    } catch (err) {
      logger.error(`Error while crafting "${itemName}": ${err.message}`);
      reject(err);
    }
  });
}

// Function to find the nearest block and return its coordinates
/**
 * Finds the nearest block of the specified type within a given range.
 * @param {string} blockName - The name of the block to find (e.g., 'stone', 'dirt').
 * @param {number} [maxDistance=64] - The maximum distance to search for the block.
 * @returns {Vec3|null} - The position of the found block or null if not found.
 */
function getBlockCoordinates(blockName, maxDistance = 64) {
  // Get the block ID from the block name
  const blockId = mcData.blocksByName[blockName]?.id;

  if (blockId === undefined) {
    // Block name is invalid
    logger.warn(`Block "${blockName}" does not exist.`);
    bot.chat(`Block "${blockName}" does not exist.`);
    return null;
  }

  // Use bot.findBlock to locate the nearest block
  const block = bot.findBlock({
    matching: blockId,
    maxDistance: maxDistance,
    count: 1, // Find only one block
  });

  if (block) {
    return block.position;
  } else {
    // Block not found within the specified range
    logger.info(`"${blockName}" not found within ${maxDistance} blocks.`);
    bot.chat(`"${blockName}" not found within ${maxDistance} blocks.`);
    return null;
  }
}

// Function to follow a user
/**
 * Makes the bot follow the specified user.
 * @param {string} username - The Minecraft username to follow.
 */
async function followUser(username) {
  try {
    const player = bot.players[username];
    if (!player || !player.entity) {
      bot.chat(`Player "${username}" not found.`);
      logger.warn(`Player "${username}" not found.`);
      return;
    }

    const goal = new goals.GoalFollow(player.entity, 1); // Follow at a distance of 1 block
    bot.pathfinder.setGoal(goal, true); // True for dynamic goal (following movement)

    bot.chat(`Now following "${username}".`);
    logger.info(`Now following "${username}".`);

    // Optionally, listen for 'playerMoved' or other events to update the goal dynamically
  } catch (err) {
    bot.chat(`Failed to follow "${username}": ${err.message}`);
    logger.error(`Failed to follow "${username}": ${err.message}`);
  }
}

// -------------------- Express API Endpoints -------------------- //

// Test endpoint
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


// -------------------- Chat Listener -------------------- //

bot.on('chat', async (username, message) => {
  // Ignore messages from the bot itself
  if (username === bot.username) return;

  // Check if the user is authorized to send commands
  if (!authorizedUsers.includes(username)) {
    logger.warn(`Unauthorized user "${username}" attempted to send a command.`);
    return;
  }

  // Parse commands starting with '!'
  if (message.startsWith('!')) {
    const args = message.slice(1).trim().split(' ');
    const command = args.shift().toLowerCase();

    switch (command) {
      case 'craft':
        const itemName = args.join('_').toLowerCase();
        if (itemName) {
          try {
            await craftItem(itemName);
            bot.chat(`Crafting "${itemName}"...`);
          } catch (err) {
            bot.chat(`Failed to craft "${itemName}": ${err.message}`);
          }
        } else {
          bot.chat('Please specify an item to craft. Usage: !craft <item_name>');
        }
        break;

      case 'travel':
        if (args.length === 3) {
          const [x, y, z] = args.map(coord => parseInt(coord, 10));
          if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            try {
              await travelToCoordinates(x, y, z);
              bot.chat(`Traveling to (${x}, ${y}, ${z})`);
              logger.info(`Traveling to (${x}, ${y}, ${z})`);
            } catch (err) {
              bot.chat(`Failed to travel to (${x}, ${y}, ${z}): ${err.message}`);
              logger.error(`Failed to travel to (${x}, ${y}, ${z}): ${err.message}`);
            }
          } else {
            bot.chat('Invalid coordinates. Usage: !travel <x> <y> <z>');
          }
        } else {
          bot.chat('Please provide x, y, and z coordinates. Usage: !travel <x> <y> <z>');
        }
        break;

      case 'mine':
        if (args.length === 3) {
          const [mx, my, mz] = args.map(coord => parseInt(coord, 10));
          if (!isNaN(mx) && !isNaN(my) && !isNaN(mz)) {
            try {
              await mineBlockAt(mx, my, mz);
              bot.chat(`Successfully mined block at (${mx}, ${my}, ${mz})`);
              logger.info(`Successfully mined block at (${mx}, ${my}, ${mz})`);
            } catch (err) {
              bot.chat(`Failed to mine block at (${mx}, ${my}, ${mz}): ${err.message}`);
              logger.error(`Failed to mine block at (${mx}, ${my}, ${mz}): ${err.message}`);
            }
          } else {
            bot.chat('Invalid coordinates. Usage: !mine <x> <y> <z>');
          }
        } else {
          bot.chat('Please provide x, y, and z coordinates. Usage: !mine <x> <y> <z>');
        }
        break;

      case 'drop':
        if (args.length === 1) {
          const dropItemName = args[0].toLowerCase();
          try {
            await dropItemByName(dropItemName);
            bot.chat(`Dropped item: ${dropItemName}`);
            logger.info(`Dropped item: ${dropItemName}`);
          } catch (err) {
            bot.chat(`Failed to drop item "${dropItemName}": ${err.message}`);
            logger.error(`Failed to drop item "${dropItemName}": ${err.message}`);
          }
        } else {
          bot.chat('Please specify an item to drop. Usage: !drop <item_name>');
        }
        break;

      case 'place':
        if (args.length === 4) {
          const [blockName, px, py, pz] = args;
          const placeX = parseInt(px, 10);
          const placeY = parseInt(py, 10);
          const placeZ = parseInt(pz, 10);
          if (!isNaN(placeX) && !isNaN(placeY) && !isNaN(placeZ)) {
            try {
              await placeBlockAt(blockName.toLowerCase(), placeX, placeY, placeZ);
              bot.chat(`Placed "${blockName}" at (${placeX}, ${placeY}, ${placeZ})`);
              logger.info(`Placed "${blockName}" at (${placeX}, ${placeY}, ${placeZ})`);
            } catch (err) {
              bot.chat(`Failed to place block "${blockName}" at (${placeX}, ${placeY}, ${placeZ}): ${err.message}`);
              logger.error(`Failed to place block "${blockName}" at (${placeX}, ${placeY}, ${placeZ}): ${err.message}`);
            }
          } else {
            bot.chat('Invalid coordinates. Usage: !place <block_name> <x> <y> <z>');
          }
        } else {
          bot.chat('Please provide block name and coordinates. Usage: !place <block_name> <x> <y> <z>');
        }
        break;

      case 'come_to_me':
        // Implement the followUser function
        await followUser(username);
        break;

      case 'get_block_coords':
        if (args.length === 1) {
          const blockName = args[0].toLowerCase();
          const blockPosition = getBlockCoordinates(blockName);

          if (blockPosition) {
            const { x, y, z } = blockPosition;
            bot.chat(`Nearest "${blockName}" is at (X: ${x}, Y: ${y}, Z: ${z}).`);
            logger.info(`Nearest "${blockName}" is at (X: ${x}, Y: ${y}, Z: ${z}).`);
          } else {
            bot.chat(`"${blockName}" not found within 64 blocks.`);
            logger.info(`"${blockName}" not found within 64 blocks.`);
          }
        } else {
          bot.chat('Usage: !get_block_coords <block_name>');
        }
        break;

      case 'help':
        bot.chat('Available commands:\n!craft <item_name>\n!travel <x> <y> <z>\n!mine <x> <y> <z>\n!drop <item_name>\n!place <block_name> <x> <y> <z>\n!come_to_me\n!get_block_coords <block_name>\n!stop_mine');
        break;

      case 'stop_mine':
        bot.pathfinder.setGoal(null); // Clears the current mining goal
        bot.chat('Stopped mining operation.');
        logger.info('Mining operation stopped.');
        break;

      default:
        bot.chat(`Unknown command: ${command}`);
        break;
    }
  }
});

// -------------------- End of Chat Listener -------------------- //