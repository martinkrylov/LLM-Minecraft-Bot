import json

def get_state(bot):
    data_dict = {
        "bot_position": bot.entity.position,
        "nearby_entities": bot.entities,
        "inventory": bot.inventory.items()
    }

    print(data_dict)
    return json.dumps(data_dict)