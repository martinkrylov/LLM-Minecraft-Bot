from openai import OpenAI
import json
import dotenv
import os
from llm.utils import extract_json_from_string
from llm.prompts import compiler_prompt

dotenv.load_dotenv()
client = OpenAI()

def translate_command_to_instructions(user_command):
    # Message
    messages = [
        {"role": "system", "content": compiler_prompt},
        {"role": "user", "content": user_command}
    ]
    # Call the OpenAI API
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL"),
        messages=messages,
        max_tokens=200,
        temperature=0.7,
    )

    # Get the assistant's reply
    assistant_reply = extract_json_from_string(response.choices[0].message.content)

    # Attempt to parse the reply as JSON
    try:
        instructions = json.loads(assistant_reply)
        return instructions
    except json.JSONDecodeError:
        print("Failed to parse the assistant's reply as JSON.")
        return None