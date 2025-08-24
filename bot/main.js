const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');
const mcDataLoader = require('minecraft-data');

// Create the bot with updated username and port
const bot = mineflayer.createBot({
  host: 'localhost',        // Replace with your server IP if different
  port: 7754,               // Updated server port
  username: 'Skibidi-Gyatt', // Updated bot username
  // Additional options can be added here if needed
});

// Load the pathfinder plugin
bot.loadPlugin(pathfinder);

// Handle connection errors
bot.on('error', (err) => console.log(`Bot encountered an error: ${err}`));
bot.on('end', () => console.log('Bot has disconnected from the server'));

// Command Prefix
const COMMAND_PREFIX = '!';

// Wait for the bot to spawn in the world
bot.once('spawn', async () => {
  try {
    console.log('Bot has spawned in the game');

    // Initialize movements with Minecraft data
    const mcData = mcDataLoader(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    // Ensure the bot has a crafting table in inventory for crafting (optional)
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
        console.log(`Successfully mined block at (${x}, ${y}, ${z})`);
        resolve();
      })
      .catch((err) => {
        console.log(`Error while mining: ${err.message}`);
        reject(err);
      });
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
  return new Promise((resolve, reject) => {
    const referenceBlock = bot.blockAt(new Vec3(x, y - 1, z));
    const targetPosition = new Vec3(x, y, z);

    if (!referenceBlock) {
      return reject(new Error(`No block to place against at (${x}, ${y - 1}, ${z})`));
    }

    const item = bot.inventory.items().find((i) => i.name === blockName);

    if (!item) {
      return reject(new Error(`No "${blockName}" in inventory`));
    }

    bot.equip(item, 'hand')
      .then(() => {
        const faceVector = new Vec3(0, 1, 0); // Adjust as needed for placement
        return bot.placeBlock(referenceBlock, faceVector);
      })
      .then(() => {
        console.log(`Placed "${blockName}" at (${x}, ${y}, ${z})`);
        resolve();
      })
      .catch((err) => {
        console.log(`Error while placing block: ${err.message}`);
        reject(err);
      });
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
              return reject(new Error('No reference block found to place the crafting table'));
            }
  
            // Equip the crafting table
            await bot.equip(craftingTableItem, 'hand');
  
            // Attempt to place the crafting table
            await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
  
            // Wait briefly to ensure the block is placed
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  
            // Retrieve the placed crafting table block
            craftingTableBlock = bot.blockAt(referenceBlock.position.offset(0, 1, 0));
  
            if (!craftingTableBlock) {
              return reject(new Error('Failed to place crafting table'));
            }
          } else {
            return reject(new Error('No crafting table available in inventory'));
          }
        }
  
        // Get the recipes for the desired item using the crafting table
        const recipes = bot.recipesFor(itemId, null, 1, craftingTableBlock);
        if (recipes.length === 0) {
          return reject(new Error(`No recipe found for "${itemName}"`));
        }
  
        const recipe = recipes[0];
  
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

// -------------------- Chat Listener and Command Handling -------------------- //

// Authorized users who can send commands to the bot (optional)
const authorizedUsers = ['YourUsername', 'FriendUsername']; // Replace with actual usernames

bot.on('chat', async (username, message) => {
  // Ignore messages from the bot itself
  if (username === bot.username) return;

  // Optional: Restrict commands to authorized users
  // Uncomment the following lines to enable
  /*
  if (!authorizedUsers.includes(username)) {
    bot.chat(`Sorry, ${username}, you are not authorized to use bot commands.`);
    return;
  }
  */

  // Check if the message starts with the command prefix
  if (!message.startsWith(COMMAND_PREFIX)) return;

  // Parse the command and its arguments
  const args = message.slice(COMMAND_PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Handle the "come" command (move to player)
  if (command === 'come') {
    console.log(`Received command "come" from ${username}`);

    const player = bot.players[username];

    if (!player || !player.entity) {
      bot.chat(`I can't find player "${username}".`);
      return;
    }

    const targetPos = player.entity.position;

    // Move the bot to the player's position
    travelToCoordinates(targetPos.x, targetPos.y, targetPos.z)
      .then(() => {
        bot.chat(`Coming to you, ${username}!`);
      })
      .catch((err) => {
        bot.chat(`Sorry, I couldn't reach you, ${username}.`);
        console.log(`Failed to move to ${username}: ${err.message}`);
      });

    return;
  }

  // Handle the "craft" command (craft an item)
  if (command === 'craft') {
    bot.chat("Oh you want me Ol' Skibber to craf sumting?")
    const itemToCraft = args.join(' '); // Supports multi-word item names

    if (!itemToCraft) {
      bot.chat(`Please specify an item to craft. Usage: ${COMMAND_PREFIX}craft <item_name>`);
      return;
    }

    bot.chat(`Attempting to craft "${itemToCraft}"...`);

    try {
      await craftItem(itemToCraft);
      bot.chat(`Successfully crafted "${itemToCraft}".`);
    } catch (err) {
      if (err.message.startsWith('Missing materials')) {
        bot.chat(`I don't have mats! Needed: ${err.message.replace('Missing materials: ', '')}`);
      } else {
        bot.chat(`Failed to craft "${itemToCraft}": ${err.message}`);
      }
      console.log(`Crafting error: ${err.message}`);
    }

    return;
  }

  // You can add more commands here following the same pattern

  // If the command is not recognized
  bot.chat(`Unknown command: "${command}". Available commands: come, craft`);
});

// -------------------- Additional Chat Listener for "come" Without Prefix -------------------- //

// If you still want to respond to "come" without a prefix
bot.on('chat', (username, message) => {
  // Ignore messages from the bot itself
  if (username === bot.username) return;

  // Check if the message is exactly "come" (case-insensitive)
  if (message.toLowerCase() === 'come') {
    console.log(`Received trigger "come" from ${username}`);

    const player = bot.players[username];

    if (!player || !player.entity) {
      bot.chat(`I can't find player "${username}".`);
      return;
    }

    const targetPos = player.entity.position;

    // Move the bot to the player's position
    travelToCoordinates(targetPos.x, targetPos.y, targetPos.z)
      .then(() => {
        bot.chat(`Coming to you, ${username}!`);
      })
      .catch((err) => {
        bot.chat(`Sorry, I couldn't reach you, ${username}.`);
        console.log(`Failed to move to ${username}: ${err.message}`);
      });
  }
});