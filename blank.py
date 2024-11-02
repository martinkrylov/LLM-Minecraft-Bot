from javascript import require, On, Once, AsyncTask, once, off

mineflayer = require("mineflayer")

bot = mineflayer.createBot(
    {"username": "skibidi-gyatt", "host": "localhost", "port": 65230, "version": "1.19.4", "hideErrors": False}
)

# Login event requred for bot
@On(bot, "login")
def login(this):
    pass