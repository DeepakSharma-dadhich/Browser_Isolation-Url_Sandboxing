import json
import os


def create_directory(path):
    """
    Create a directory if it does not already exist.
    """
    os.makedirs(path, exist_ok=True)


def save_json(file_path, data):
    """
    Save any Python dictionary/list as JSON.
    """
    create_directory(os.path.dirname(file_path))

    with open(file_path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=4)


def read_json(file_path):
    """
    Read JSON file.
    """
    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


def save_text(file_path, content):
    """
    Save text or HTML file.
    """
    create_directory(os.path.dirname(file_path))

    with open(file_path, "w", encoding="utf-8") as file:
        file.write(content)