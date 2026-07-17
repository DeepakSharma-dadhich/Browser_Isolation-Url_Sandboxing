import os

from services.storage_service import save_json


def generate_report(
    session_path,
    session_id,
    metadata,
    screenshot_path
):
    """
    Generate the master report for one analysis session.
    """

    report = {
        "session_id": session_id,
        "status": "completed",

        "metadata": metadata,

        "artifacts": {
            "screenshot": screenshot_path
        }
    }

    report_path = os.path.join(
        session_path,
        "report.json"
    )

    save_json(
        report_path,
        report
    )

    return report_path