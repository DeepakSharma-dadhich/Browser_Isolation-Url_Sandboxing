def collect_certificate(page):

    return {
        "issuer": None,
        "valid_from": None,
        "valid_to": None,
        "https": page.url.startswith("https")
    }