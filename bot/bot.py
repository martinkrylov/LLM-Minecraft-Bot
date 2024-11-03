import requests

class MineflayerBotWrapper:
    def __init__(self, api_url='http://localhost:3000'):
        self.api_url = api_url
        self.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

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
            print("WE DID IT!!!")
            print(response)
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
            print(response)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Mine command failed: {e}")
            return None

    def craft_item(self, item_name):
        payload = {'itemName': item_name}
        try:
            response = requests.post(f"{self.api_url}/craft", json=payload, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Craft command failed: {e}")
            return None
