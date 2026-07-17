def collect_forms(page):

    forms = page.locator("form").count()

    return {
        "form_count": forms
    }