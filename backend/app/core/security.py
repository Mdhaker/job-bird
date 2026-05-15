from cryptography.fernet import Fernet
from app.core.config import get_settings

settings = get_settings()

_fernet = Fernet(settings.ENCRYPTION_KEY.encode())


def encrypt(plain: str) -> str:
    return _fernet.encrypt(plain.encode()).decode()


def decrypt(token: str) -> str:
    return _fernet.decrypt(token.encode()).decode()
