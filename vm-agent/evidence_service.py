import json
import os


def save_metadata(session_path, metadata):

    metadata_file = os.path.join(session_path, "metadata.json")

    with open(metadata_file, "w") as file:
        json.dump(metadata, file, indent=4)

    return metadata_file