import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import (
    DEFAULT_ADMIN_EMAIL,
    DEFAULT_ADMIN_NAME,
    DEFAULT_ADMIN_PASSWORD,
    TOKEN_TTL_HOURS,
)
from .database import execute, fetch_one, row_to_dict, utc_now_iso


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
bearer_scheme = HTTPBearer(auto_error=False)


def validate_email_format(email: str) -> bool:
    return bool(EMAIL_PATTERN.match(email.strip()))


def hash_password(password: str, salt: str | None = None) -> str:
    real_salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        real_salt.encode("utf-8"),
        120000,
    ).hex()
    return f"{real_salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    salt, expected = password_hash.split("$", 1)
    actual = hash_password(password, salt).split("$", 1)[1]
    return hmac.compare_digest(actual, expected)


def ensure_default_admin() -> None:
    existing = fetch_one("SELECT id, full_name FROM users WHERE email = ?", [DEFAULT_ADMIN_EMAIL])
    if existing:
        if existing["full_name"] != DEFAULT_ADMIN_NAME:
            execute(
                "UPDATE users SET full_name = ? WHERE id = ?",
                [DEFAULT_ADMIN_NAME, existing["id"]],
            )
        return

    execute(
        """
        INSERT INTO users (email, password_hash, full_name, role, created_at)
        VALUES (?, ?, ?, 'admin', ?)
        """,
        [
            DEFAULT_ADMIN_EMAIL,
            hash_password(DEFAULT_ADMIN_PASSWORD),
            DEFAULT_ADMIN_NAME,
            utc_now_iso(),
        ],
    )


def login_user(email: str, password: str) -> tuple[str, dict]:
    if not validate_email_format(email):
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")

    row = fetch_one("SELECT * FROM users WHERE email = ?", [email.strip().lower()])
    if row is None:
        raise HTTPException(status_code=401, detail="No account found for that email address.")

    user = row_to_dict(row)
    if not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect password.")

    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS)).isoformat()
    execute(
        """
        INSERT INTO auth_tokens (token, user_id, expires_at, created_at)
        VALUES (?, ?, ?, ?)
        """,
        [token, user["id"], expires_at, utc_now_iso()],
    )
    return token, {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    row = fetch_one(
        """
        SELECT u.*
        FROM auth_tokens t
        JOIN users u ON u.id = t.user_id
        WHERE t.token = ?
        """,
        [credentials.credentials],
    )
    token_row = fetch_one(
        "SELECT expires_at FROM auth_tokens WHERE token = ?",
        [credentials.credentials],
    )
    if row is None or token_row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session.")

    expires_at = datetime.fromisoformat(token_row["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Please log in again.")

    user = row_to_dict(row)
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
    }
