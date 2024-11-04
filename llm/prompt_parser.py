from openai import OpenAI
import json
import dotenv
import os
from llm.utils import extract_json_from_string
from llm.prompts import parser_prompt

dotenv.load_dotenv()
client = OpenAI()

def parse_prompt(prompt, state_data):
    # Message
    messages = [
        {"role": "system", "content": parser_prompt + str(state_data)},
        {"role": "user", "content": prompt}
    ]
    # Call the OpenAI API
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL"),
        messages=messages,
        max_tokens=400,
        temperature=0.7,
        response_format={"type": "json_object"},
    )

    # Access the content of the message
    assistant_reply_content = (response.choices[0].message.content)
    # Attempt to parse the reply as JSON
    try:
        instructions = json.loads(assistant_reply_content)
        return instructions
    except json.JSONDecodeError:
        print("Failed to parse the assistant's reply as JSON.")
        return None
