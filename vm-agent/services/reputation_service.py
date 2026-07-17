def get_reputation(url):
    return {
        "virustotal": {
            "status": "not_checked",
            "malicious": 0,
            "suspicious": 0
        },
        "google_safe_browsing": {
            "status": "not_checked"
        }
    }