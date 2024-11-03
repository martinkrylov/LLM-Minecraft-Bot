from bot import MineflayerBotWrapper

if __name__ == '__main__':
    bot = MineflayerBotWrapper()
    bot.travel_to(-5,70,100)
    bot.mine_block(10, 71, 100)