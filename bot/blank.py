from javascript import require, On, Once, AsyncTask, once, off

mineflayer = require("mineflayer")

BOT_USERNAME = "skibidi-gyatt"
HOST = "localhost"
PORT = 7754
VERSION = "1.19.4"

bot = mineflayer.createBot(
    {"username": BOT_USERNAME, "host": HOST, "port": PORT, "version": VERSION, "hideErrors": False}
)





# Login event requred for bot
@On(bot, "login")
def login(this):
    pass