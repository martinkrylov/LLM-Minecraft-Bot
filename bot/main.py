from bot import MineflayerBotWrapper

if __name__ == '__main__':
    bot = MineflayerBotWrapper()
    bot.travel_to(5,100,5)
    bot.craft_item("stick")