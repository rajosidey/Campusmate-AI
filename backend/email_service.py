import os
from pathlib import Path

import httpx
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE)


BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL")
BREVO_SENDER_NAME = os.getenv(
    "BREVO_SENDER_NAME",
    "CampusMate AI"
)


def send_password_reset_email(
    recipient_email: str,
    recipient_name: str,
    reset_link: str
):
    if not BREVO_API_KEY:
        raise RuntimeError("BREVO_API_KEY is missing from .env")

    if not BREVO_SENDER_EMAIL:
        raise RuntimeError(
            "BREVO_SENDER_EMAIL is missing from .env"
        )

    url = "https://api.brevo.com/v3/smtp/email"

    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }

    payload = {
        "sender": {
            "name": BREVO_SENDER_NAME,
            "email": BREVO_SENDER_EMAIL
        },
        "to": [
            {
                "email": recipient_email,
                "name": recipient_name
            }
        ],
        "subject": "Reset your CampusMate AI password",
        "htmlContent": f"""
        <html>
            <body>
                <h2>CampusMate AI</h2>

                <p>Hello {recipient_name},</p>

                <p>
                    We received a request to reset your
                    CampusMate AI password.
                </p>

                <p>
                    Click the button below to create a new password:
                </p>

                <p>
                    <a
                        href="{reset_link}"
                        style="
                            display: inline-block;
                            padding: 12px 20px;
                            background-color: #2563eb;
                            color: white;
                            text-decoration: none;
                            border-radius: 6px;
                        "
                    >
                        Reset Password
                    </a>
                </p>

                <p>
                    This link will expire in 15 minutes.
                </p>

                <p>
                    If you did not request a password reset,
                    you can safely ignore this email.
                </p>

                <p>
                    — CampusMate AI
                </p>
            </body>
        </html>
        """
    }

    response = httpx.post(
        url,
        headers=headers,
        json=payload,
        timeout=15
    )

    if response.status_code not in (200, 201, 202):
        raise RuntimeError(
            f"Brevo email failed: "
            f"{response.status_code} - {response.text}"
        )

    return response.json()