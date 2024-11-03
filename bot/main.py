from bot import MineflayerBotWrapper

if __name__ == '__main__':
    bot = MineflayerBotWrapper()
    bot.travel_to(-15,64,80)
    bot.craft_item("stick")