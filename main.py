import json
from llm.prompt_parser import parse_prompt
from llm.instruction_compiler import translate_command_to_instructions
from bot.bot import MineflayerBotWrapper

if __name__ == "__main__":
    bot = MineflayerBotWrapper()
    
    user_command = "Make an wooden pickaxe."

    state_data = bot.get_state_data()
    print(state_data)
    print()
    tasks = parse_prompt(user_command, state_data)
    print(tasks)
    print('--------------------------------')
    for task in tasks:
        state_data = bot.get_state_data()
        instructions = translate_command_to_instructions(task, state_data)
        print(task, instructions)
        print()