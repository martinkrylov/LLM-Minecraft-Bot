from javascript import require, On, Once, AsyncTask, once, off

mineflayer = require("mineflayer")
HOST = "localhost"
PORT = 7754
VERSION = "1.19.4"
NUM_BOTS = 5
BOT_USERNAMES = ["Skibidi-gyatt"+str(i) for i in range(1,NUM_BOTS+1)] 


bots = [mineflayer.createBot(
    {"username": BOT_USERNAMES[i], "host": HOST, "port": PORT, "version": VERSION, "hideErrors": False}
) for i in range(NUM_BOTS)]

bot = bots[0]

pathfinder = require('mineflayer-pathfinder')
bots[0].loadPlugin(pathfinder.pathfinder)
# Create a new minecraft-data instance with the bot's version
mcData = require('minecraft-data')(bot.version)
# Create a new movements class
movements = pathfinder.Movements(bot, mcData)
# How far to be from the goal
RANGE_GOAL = 1

# Login event requred for bot
@On(bot, "login")
def login(this):
    pass

bot.removeAllListeners('chat')
@On(bot, 'chat')
def handleMsg(this, sender, message, *args):
  if sender and (sender != BOT_USERNAME):
    bot.chat('Hi, you said ' + message)
    if 'come' in message:
      player = bot.players[sender]
      target = player.entity
      if not target:
        bot.chat("I don't see you !")
        return
      pos = target.position
      bot.pathfinder.setMovements(movements)
      bot.pathfinder.setGoal(pathfinder.goals.GoalNear(pos.x, pos.y, pos.z, RANGE_GOAL))
    if 'stop' in message:
      off(bot, 'chat', handleMsg)

