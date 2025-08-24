import os
import requests

class MineflayerBotWrapper:
    def __init__(self, api_url: str | None = None, api_key: str | None = None):
        base_url = api_url or os.getenv('MINECRAFT_API_URL', 'http://localhost:5001')
        self.api_url = base_url.rstrip('/')
        api_key = api_key or os.getenv('API_KEY')
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        if api_key:
            headers['x-api-key'] = api_key
        self.headers = headers

    def health_check(self):
        try:
            response = requests.get(f"{self.api_url}/health", headers=self.headers)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Health check failed: {e}")
            return None

    def travel_to(self, x, y, z):
        payload = {'x': x, 'y': y, 'z': z}
        try:
            print('payload:', payload)
            response = requests.post(f"{self.api_url}/travel", json=payload, headers=self.headers)
            print("Travel command sent successfully.")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Travel command failed: {e}")
            return None

    def mine_block(self, x, y, z):
        payload = {'x': x, 'y': y, 'z': z}
        try:
            print('mine payload:', payload)
            response = requests.post(f"{self.api_url}/mine", json=payload, headers=self.headers)
            print("Mine command sent successfully.")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Mine command failed: {e}")
            return None

    def craft_item(self, item_name):
        payload = {'itemName': item_name}
        try:
            response = requests.post(f"{self.api_url}/craft", json=payload, headers=self.headers)
            print("Craft command sent successfully.")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Craft command failed: {e}")
            return None

    def use_block(self, x, y, z):
        payload = {'x': x, 'y': y, 'z': z}
        try:
            response = requests.post(f"{self.api_url}/use", json=payload, headers=self.headers)
            print("Use block command sent successfully.")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Use block command failed: {e}")
            return None

    def drop_item(self, item_name):
        payload = {'itemName': item_name}
        try:
            response = requests.post(f"{self.api_url}/drop", json=payload, headers=self.headers)
            print("Drop item command sent successfully.")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Drop item command failed: {e}")
            return None

    def place_block(self, block_name, x, y, z):
        payload = {'blockName': block_name, 'x': x, 'y': y, 'z': z}
        try:
            response = requests.post(f"{self.api_url}/place_block", json=payload, headers=self.headers)
            print("Place block command sent successfully.")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Place block command failed: {e}")
            return None

    def place_block_at(self, block_name, x, y, z):
        payload = {'blockName': block_name, 'x': x, 'y': y, 'z': z}
        try:
            response = requests.post(f"{self.api_url}/place", json=payload, headers=self.headers)
            print("Place block at command sent successfully.")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Place block at command failed: {e}")
            return None

    def mine_resource(self, block_name, max_distance=64):
        payload = {'blockName': block_name, 'maxDistance': max_distance}
        try:
            response = requests.post(f"{self.api_url}/mine_resource", json=payload, headers=self.headers)
            print("Mine resource command sent successfully.")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Mine resource command failed: {e}")
            return None

    def kill_entity(self, entity_type):
        payload = {'entityType': entity_type}
        try:
            response = requests.post(f"{self.api_url}/kill", json=payload, headers=self.headers)
            print("Kill entity command sent successfully.")
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Kill entity command failed: {e}")
            return None

    def get_state_data(self):
        try:
            response = requests.get(f"{self.api_url}/state_data", headers=self.headers)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Get state data command failed: {e}")
            return None
        
    def execute_instruction(self, instruction):
        method = instruction['method']
        params = instruction['parameters']
        
        if method == 'travel_to':
            self.travel_to(params['x'], params['y'], params['z'])
        elif method == 'mine_block':
            self.mine_block(params['x'], params['y'], params['z'])
        elif method == 'craft_item':
            self.craft_item(params['item_name']) 
        elif method == 'use_block':
            self.use_block(params['x'], params['y'], params['z'])
        elif method == 'drop_item':
            self.drop_item(params['item_name'])
        elif method == 'place_block':
            self.place_block(params['block_name'], params['x'], params['y'], params['z'])
        elif method == 'place_block_at':
            self.place_block_at(params['block_name'], params['x'], params['y'], params['z'])
        elif method == 'mine_resource':
            self.mine_resource(params['block_name'], params.get('max_distance', 64))
        elif method == 'kill_entity':
            self.kill_entity(params['entity_type']) 
        else:
            print(f"Unknown method: {method}")
