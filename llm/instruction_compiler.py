from openai import OpenAI
import json
import dotenv
import os
from llm.utils import extract_json_from_string
from llm.prompts import compiler_prompt

dotenv.load_dotenv()
client = OpenAI()

def translate_command_to_instructions(user_command, state_data):
    # Message
    messages = [
        {"role": "system", "content": compiler_prompt+str(state_data)},
        {"role": "user", "content": user_command}
    ]
    # Call the OpenAI API
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL"),
        messages=messages,
        max_tokens=400,
        temperature=0.7,
        response_format={"type": "json_object"},
    )

    # Get the assistant's reply
    
    assistant_reply = json.loads(response.choices[0].message.content)
    # Attempt to parse the reply as JSON
    try:
        instructions = (assistant_reply)['instructions']
        return instructions
    except json.JSONDecodeError:
        print("Failed to parse the assistant's reply as JSON.")
        return None