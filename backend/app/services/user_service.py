from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.user import AuthResponse, LogoutResponse, UserCreate, UserLogin, UserUpdate


class UserService:
    def __init__(self, db: Session) -> None:
        self.repository = UserRepository(db)

    def get_user_by_id(self, user_id: int):
        user = self.repository.get_by_id(user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        return user

    def _build_auth_response(self, user) -> AuthResponse:
        access_token, expires_at = create_access_token(user.id)
        return AuthResponse(
            user=user,
            access_token=access_token,
            expires_at=expires_at,
        )

    def create_user(self, payload: UserCreate):
        if self.repository.get_by_email(payload.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        if self.repository.get_by_username(payload.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )

        try:
            user = self.repository.create(
                username=payload.username,
                email=payload.email,
                hashed_password=hash_password(payload.password),
                company=payload.company,
            )
            return self._build_auth_response(user)
        except IntegrityError as exc:
            self.repository.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with these credentials already exists",
            ) from exc

    def login_user(self, payload: UserLogin):
        user = self.repository.get_by_username(payload.username)

        if not user or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        return self._build_auth_response(user)

    def logout_user(self):
        return LogoutResponse(
            message="Logout successful. Clear the user session on the client side.",
        )

    def update_user(self, user_id: int, payload: UserUpdate):
        user = self.repository.get_by_id(user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        update_data = payload.model_dump(exclude_unset=True)

        if "email" in update_data and update_data["email"] != user.email:
            existing_user = self.repository.get_by_email(update_data["email"])
            if existing_user and existing_user.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered",
                )

        if "username" in update_data and update_data["username"] != user.username:
            existing_user = self.repository.get_by_username(update_data["username"])
            if existing_user and existing_user.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken",
                )

        try:
            return self.repository.update(user, **update_data)
        except IntegrityError as exc:
            self.repository.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Unable to update user",
            ) from exc
