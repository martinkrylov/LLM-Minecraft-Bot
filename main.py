import json
from llm.prompt_parser import parse_prompt
from llm.instruction_compiler import translate_command_to_instructions
from bot.bot import MineflayerBotWrapper

if __name__ == "__main__":
    bot = MineflayerBotWrapper()
    
    user_command = "Place the crafting table."

    state_data = bot.get_state_data()
    print(state_data)
    print()
    # Attempt to parse the prompt multiple times
    for attempt in range(5):  # Try 5 times
        try:
            tasks = parse_prompt(user_command, state_data)
            if tasks is None:  # Check if tasks is None
                print("Tasks returned None, retrying...")  # Inform about the retry
                continue  # Retry the parsing
            break  # Exit loop if successful
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            if attempt == 4:  # If it's the last attempt, raise the error
                raise
    print(tasks)
    print('--------------------------------')
    for task_object in tasks['tasks']:
        task = task_object['task']
        state_data = bot.get_state_data()
        
        # Attempt to translate command to instructions multiple times
        for attempt in range(15):  # Try 3 times
            try:
                instructions = translate_command_to_instructions(task, state_data)
                if instructions is None:  # Check if instructions is None
                    print("Instructions returned None, retrying...")  # Inform about the retry
                    continue  # Retry the translation
                break  # Exit loop if successful
            except Exception as e:
                print(f"Attempt {attempt + 1} failed: {e}")
                if attempt == 14:  # If it's the last attempt, raise the error
                    raise
        
        print(task, instructions)
        print()

        for instruction in instructions:
            print("instruction: ", instruction)
            bot.execute_instruction(instruction)
