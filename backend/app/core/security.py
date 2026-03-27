import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import get_settings

password_hasher = PasswordHasher()


class TokenVerificationError(Exception):
    pass


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return password_hasher.verify(hashed_password, plain_password)
    except (InvalidHashError, VerificationError):
        return False


def _encode_token_part(payload: dict[str, object]) -> str:
    raw_value = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64.urlsafe_b64encode(raw_value).decode("utf-8").rstrip("=")


def _decode_token_part(value: str) -> dict[str, object]:
    padding = "=" * (-len(value) % 4)
    decoded = base64.urlsafe_b64decode(f"{value}{padding}".encode("utf-8"))
    data = json.loads(decoded.decode("utf-8"))
    if not isinstance(data, dict):
        raise TokenVerificationError("Invalid token payload")
    return data


def create_access_token(user_id: int) -> tuple[str, str]:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.auth_token_expiry_minutes)
    payload = {
        "sub": str(user_id),
        "exp": int(expires_at.timestamp()),
    }
    encoded_payload = _encode_token_part(payload)
    signature = hmac.new(
        settings.auth_secret_key.encode("utf-8"),
        encoded_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{encoded_payload}.{signature}", expires_at.isoformat()


def decode_access_token(token: str) -> dict[str, object]:
    try:
        encoded_payload, signature = token.split(".", 1)
    except ValueError as exc:
        raise TokenVerificationError("Invalid token format") from exc

    settings = get_settings()
    expected_signature = hmac.new(
        settings.auth_secret_key.encode("utf-8"),
        encoded_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_signature):
        raise TokenVerificationError("Invalid token signature")

    payload = _decode_token_part(encoded_payload)
    expires_at = payload.get("exp")
    subject = payload.get("sub")

    if not isinstance(expires_at, int) or not isinstance(subject, str):
        raise TokenVerificationError("Invalid token payload")

    if datetime.now(UTC).timestamp() > expires_at:
        raise TokenVerificationError("Token has expired")

    return payload
