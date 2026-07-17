import os

from services.storage_service import save_json


def save_metadata(session_path, metadata):
    """
    Save page metadata.
    """

    file_path = os.path.join(session_path, "metadata.json")

    save_json(file_path, metadata)

    return file_path


def save_redirects(session_path, redirects):
    """
    Save redirect chain.
    """

    file_path = os.path.join(session_path, "redirect_chain.json")

    save_json(file_path, redirects)

    return file_path


def save_cookies(session_path, cookies):
    """
    Save browser cookies.
    """

    file_path = os.path.join(session_path, "cookies.json")

    save_json(file_path, cookies)

    return file_path


def save_network_requests(session_path, requests):
    """
    Save captured network requests.
    """

    file_path = os.path.join(session_path, "network_requests.json")

    save_json(file_path, requests)

    return file_path


def save_console_logs(session_path, logs):
    """
    Save browser console logs.
    """

    file_path = os.path.join(session_path, "console_logs.json")

    save_json(file_path, logs)

    return file_path


def save_downloads(session_path, downloads):
    """
    Save downloaded file information.
    """

    file_path = os.path.join(session_path, "downloads.json")

    save_json(file_path, downloads)

    return file_path