import json
from llm.prompt_parser import parse_prompt
from llm.instruction_compiler import translate_command_to_instructions



if __name__ == "__main__":
    user_command = "Find some iron ore and smelt it into iron ingots."
    tasks = parse_prompt(user_command)
    print(tasks)
    for task in tasks:
        instructions = translate_command_to_instructions(task)
        print(instructions)