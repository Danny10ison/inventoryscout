from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_user_access
from app.schemas.user import AuthResponse, LogoutResponse, UserCreate, UserLogin, UserOut, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create User Account",
    description="Register a new user in the InventoryScout system.",
)
def create_user(user: UserCreate, db: Session = Depends(get_db)) -> AuthResponse:
    service = UserService(db)
    return service.create_user(user)


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="User Login",
    description="Authenticate a user with email and password.",
)
def login_user(credentials: UserLogin, db: Session = Depends(get_db)) -> AuthResponse:
    service = UserService(db)
    return service.login_user(credentials)


@router.post(
    "/logout",
    response_model=LogoutResponse,
    status_code=status.HTTP_200_OK,
    summary="User Logout",
    description="Log out the current user in the stateless MVP flow.",
)
def logout_user(
    _: object = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LogoutResponse:
    service = UserService(db)
    return service.logout_user()


@router.get(
    "/{user_id}",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Get User By ID",
    description="Fetch a user's profile information by ID.",
)
def get_user_by_id(
    user_id: int,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> UserOut:
    service = UserService(db)
    return service.get_user_by_id(user_id)


@router.patch(
    "/{user_id}",
    response_model=UserOut,
    status_code=status.HTTP_200_OK,
    summary="Update User",
    description="Update a user's profile information.",
)
def update_user(
    user_id: int,
    payload: UserUpdate,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> UserOut:
    service = UserService(db)
    return service.update_user(user_id, payload)
