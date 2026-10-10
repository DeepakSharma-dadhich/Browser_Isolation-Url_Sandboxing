from services.threat_analyzer import analyze_threats

# Test 1: Fake Microsoft Login on untrusted domain exfiltrating to Telegram
fake_msft_evidence = {
    "metadata": {
        "page_title": "Sign in to your Microsoft account",
        "final_url": "https://micros0ft-verify.com/login.html"
    },
    "forms": {
        "has_login_form": True,
        "has_password_field": True,
        "forms": [{
            "index": 1,
            "resolved_action": "https://api.telegram.org/bot1234/sendMessage",
            "password_field_count": 1
        }]
    }
}

res = analyze_threats(fake_msft_evidence)
print("=== FAKE MICROSOFT LOGIN TEST ===")
print("Risk Score:", res["risk_score"])
print("Risk Level:", res["risk_level"])
print("Critical Findings:", res["critical_finding_count"])
print("High Findings:", res["high_finding_count"])
print("All Findings:")
for f in res["findings"]:
    print(f"  * [{f['id']}] {f['title']} (severity={f['severity']}, score={f['score']})")

# Test 2: Legitimate Microsoft Login (control test)
legit_msft_evidence = {
    "metadata": {
        "page_title": "Sign in to your Microsoft account",
        "final_url": "https://login.microsoftonline.com/common/oauth2/authorize"
    },
    "forms": {
        "has_login_form": True,
        "has_password_field": True,
        "forms": [{
            "index": 1,
            "resolved_action": "https://login.microsoftonline.com/kmsi",
            "password_field_count": 1
        }]
    }
}

res_legit = analyze_threats(legit_msft_evidence)
print("\n=== LEGITIMATE MICROSOFT LOGIN TEST ===")
print("Risk Score:", res_legit["risk_score"])
print("Risk Level:", res_legit["risk_level"])
print("Findings Count:", len(res_legit["findings"]))

# Test 3: Free Cloud Phishing (Firebase + Password form)
cloud_phish_evidence = {
    "metadata": {
        "page_title": "Document Verification Portal",
        "final_url": "https://secure-invoice-auth.web.app/"
    },
    "forms": {
        "has_login_form": True,
        "has_password_field": True,
        "forms": [{
            "index": 1,
            "resolved_action": "https://secure-invoice-auth.web.app/submit",
            "password_field_count": 1
        }]
    }
}

res_cloud = analyze_threats(cloud_phish_evidence)
print("\n=== CLOUD HOSTED PHISHING TEST ===")
print("Risk Score:", res_cloud["risk_score"])
print("Findings:")
for f in res_cloud["findings"]:
    print(f"  * [{f['id']}] {f['title']} (severity={f['severity']}, score={f['score']})")
