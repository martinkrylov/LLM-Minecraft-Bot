from javascript import require, On, Once, AsyncTask, once, off
Vec3 = require('vec3').Vec3

# mine_block
# place_block
# craft
# attack
# drop
# 

# Move to specific coordinates
def move_to(bot, x, y, z, movements, pathfinder):
    bot.pathfinder.setMovements(movements)
    bot.pathfinder.setGoal(pathfinder.goals.GoalBlock(x, y, z))
    bot.chat(f"Moving to coordinates ({x}, {y}, {z})")

def mine_spot(bot, x, y, z, movements, pathfinder):
    


# Place a block at specific coordinates with improved error handling
def place_block(bot, x, y, z):
    try:
        reference_block = bot.blockAt(Vec3(x, y - 1, z))  # Reference the block below
        held_item = bot.heldItem
        if held_item and reference_block:
            bot.chat(f"Placing block at ({x}, {y}, {z})")
            bot.placeBlock(reference_block, Vec3(0, 1, 0), lambda err: bot.chat("Block placed!" if not err else "Failed to place block."))
        else:
            bot.chat("No block in hand or invalid target location.")
    except Exception as e:
        bot.chat(f"Error placing block: {e}")

def attack(bot, entity):
    pass

# Define crafting function for sticks
def craft(bot, item):
    pass

def drop(bot, stick):
    pass

def breaker(bot):
    pos = bot.entity.position.offset(0, -1, 0)
    print("POSITION", pos)
    blockUnder = bot.blockAt(pos)

    if bot.canDigBlock(blockUnder):
        bot.chat(f"{pos} \n {type(pos)} \n {bot.canDigBlock(blockUnder)} \n {blockUnder}")
        bot.chat(f"I'm breaking the '{blockUnder.name}' block underneath")
        # The start=True parameter means to immediately invoke the function underneath
        # If left blank, you can start it with the `start()` function later on.
        try:
          @AsyncTask(start=True)
          def break_block(task):
            bot.dig(blockUnder)
          bot.chat('I started digging!')
        except Exception as e:
          bot.chat(f"I had an error {e}")
    else:
        bot.chat(f"I can't break the '{blockUnder.name}' block underneath")

# Define travel function
def travel(bot, sender, message, pathfinder, movements, RANGE_GOAL=1):
    target = bot.players[sender].entity
    if not target:
        bot.chat("I don't see you!")
        return
    pos = target.position
    bot.pathfinder.setMovements(movements)
    bot.pathfinder.setGoal(pathfinder.goals.GoalNear(pos.x, pos.y, pos.z, RANGE_GOAL))


# Set up action responses
action_responses = {
    "come": travel,
    "break": breaker,
    "craft": craft,
    "move_to": lambda sender, x, y, z: move_to(int(x), int(y), int(z)),
    "mine_spot": lambda sender, x, y, z: mine_spot(int(x), int(y), int(z)),
    "place_block": lambda sender, x, y, z: place_block(int(x), int(y), int(z)),
    "attack": attack,
    "drop": drop,
}



