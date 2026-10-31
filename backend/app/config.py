"""
EduSupport Configuration
Loads settings from environment variables / .env file.
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # App metadata
    APP_NAME: str = "EduSupport"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # JWT
    SECRET_KEY: str = "fallback-dev-key-please-set-in-env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Database
    DATABASE_URL: str = "sqlite:///./edusupport.db"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Risk thresholds
    LOW_RISK_MAX: int = 29
    MEDIUM_RISK_MAX: int = 59

    # Risk engine weights (must sum to 100)
    ATTENDANCE_WEIGHT: int = 40
    MARKS_WEIGHT: int = 35
    ASSIGNMENT_WEIGHT: int = 25

    # Attendance policy
    MIN_ATTENDANCE_PERCENT: float = 75.0

    # Seeding
    SEED_ON_STARTUP: bool = True

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse comma-separated CORS origins into a list."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @field_validator("ATTENDANCE_WEIGHT", "MARKS_WEIGHT", "ASSIGNMENT_WEIGHT")
    @classmethod
    def weight_must_be_positive(cls, v: int) -> int:
        if v < 0 or v > 100:
            raise ValueError("Weight must be between 0 and 100")
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton settings object used throughout the application
settings = Settings()
