"""
Auth service — thin business logic layer for user operations.
JWT creation and password hashing live in api/middleware/auth.py.
This module handles DB-level user operations called by route handlers.
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from db.models.user import User
from api.middleware.auth import hash_password, verify_password


def get_user_by_email(db: Session, email: str) -> User | None:
    """Return a User row by email, or None if not found."""
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: str) -> User | None:
    """Return a User row by UUID string, or None if not found."""
    return db.query(User).filter(User.id == user_id).first()


def create_user(
    db: Session,
    email: str,
    password: str,
    full_name: str | None = None,
) -> User:
    """
    Create and persist a new user.
    Raises 409 if the email is already registered.
    """
    if get_user_by_email(db, email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    """
    Verify email + password.
    Raises 401 if credentials are wrong, 403 if account is inactive.
    """
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive.",
        )
    return user


def update_user_name(db: Session, user: User, full_name: str) -> User:
    """Update a user's display name."""
    user.full_name = full_name
    db.commit()
    db.refresh(user)
    return user


def deactivate_user(db: Session, user: User) -> User:
    """Soft-delete: mark user as inactive instead of deleting the row."""
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user
