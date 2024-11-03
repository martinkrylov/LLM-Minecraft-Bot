from javascript import require, On, Once, AsyncTask, once, off
import actions

mineflayer = require("mineflayer")
Vec3 = require('vec3').Vec3

BOT_USERNAME = "skibidi-gyatt"
HOST = "localhost"
PORT = 7754
VERSION = "1.19.4"

bot = mineflayer.createBot(
    {"username": BOT_USERNAME, "host": HOST, "port": PORT, "version": VERSION, "hideErrors": False}
)

pathfinder = require('mineflayer-pathfinder')
bot.loadPlugin(pathfinder.pathfinder)

mcData = require('minecraft-data')(bot.version)

movements = pathfinder.Movements(bot, mcData)

RANGE_GOAL = 1

@On(bot, "login")
def login(this):
    bot.chat("Hi guys! My name is Skib! Let me know what you want me to do!")
    
    actions.move_to(bot, 100, 103, -260, movements, pathfinder)
    moo = bot.entity.position
    moot = type(moo)
    choo = Vec3(100, 102, -260)
    choot = type(choo)

    bot.chat(f"{moo} \n {moot} \n {choo} \n {choot}")
    target_block = bot.blockAt(choo)
    bot.chat(f"TARGET BLOCK {target_block} DIGGABLE: {bot.canDigBlock(target_block)}")
    actions.mine_spot(bot, 94, 102, -258, movements, pathfinder)


@On(bot, 'chat')
def breakListener(this, sender, message, *args):
  if sender and (sender != BOT_USERNAME):
    if message == "come":
       actions.action_responses['come'](bot, sender, message, pathfinder, movements)
    elif message == "break":
       actions.action_responses['break'](bot)

"""
@On(bot, 'chat')
def handleMsg(this, sender, message, *args):
    if sender and (sender != BOT_USERNAME):
        bot.chat('Hi, you said ' + message)
        # Call the appropriate function from action_responses if it exists
        if message in actions.action_responses:
            actions.action_responses[message](sender, message, *args)
        else:
            bot.chat("I don't understand that command!")
"""