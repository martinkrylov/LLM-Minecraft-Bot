
def extract_json_from_string(s):
    start = s.find('[')
    end = s.rfind(']') + 1
    if start == -1 or end == -1:
        raise ValueError("No JSON data found in the string.")
    return s[start:end]