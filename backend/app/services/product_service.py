from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.repositories.product_repository import ProductRepository
from app.repositories.user_repository import UserRepository
from app.schemas.product import ProductCreate, ProductUpdate


class ProductService:
    def __init__(self, db: Session) -> None:
        self.user_repository = UserRepository(db)
        self.repository = ProductRepository(db)

    def _ensure_user_exists(self, user_id: int) -> None:
        if not self.user_repository.get_by_id(user_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

    def _get_product_or_404(self, user_id: int, product_id: int):
        product = self.repository.get_by_user_and_id(user_id, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found",
            )
        return product

    def list_products(self, user_id: int):
        self._ensure_user_exists(user_id)
        return self.repository.list_by_user_id(user_id)

    def get_product(self, user_id: int, product_id: int):
        self._ensure_user_exists(user_id)
        return self._get_product_or_404(user_id, product_id)

    def create_product(self, user_id: int, payload: ProductCreate):
        self._ensure_user_exists(user_id)
        normalized_url = str(payload.url) if payload.url is not None else None

        if self.repository.get_by_user_and_name(user_id, payload.name):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product name already exists for this user",
            )

        if normalized_url and self.repository.get_by_user_and_url(user_id, normalized_url):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product URL already exists for this user",
            )

        try:
            return self.repository.create(
                user_id=user_id,
                name=payload.name,
                url=normalized_url,
                category=payload.category,
                description=payload.description,
            )
        except IntegrityError as exc:
            self.repository.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Unable to create product",
            ) from exc

    def update_product(self, user_id: int, product_id: int, payload: ProductUpdate):
        self._ensure_user_exists(user_id)
        product = self._get_product_or_404(user_id, product_id)
        update_data = payload.model_dump(exclude_unset=True)

        if "url" in update_data and update_data["url"] is not None:
            update_data["url"] = str(update_data["url"])

        if "name" in update_data and update_data["name"] != product.name:
            existing_product = self.repository.get_by_user_and_name(user_id, update_data["name"])
            if existing_product and existing_product.id != product_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Product name already exists for this user",
                )

        if "url" in update_data and update_data["url"] != product.url:
            updated_url = update_data["url"]
            if updated_url:
                existing_product = self.repository.get_by_user_and_url(user_id, updated_url)
                if existing_product and existing_product.id != product_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Product URL already exists for this user",
                    )

        try:
            return self.repository.update(product, **update_data)
        except IntegrityError as exc:
            self.repository.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Unable to update product",
            ) from exc

    def delete_product(self, user_id: int, product_id: int):
        self._ensure_user_exists(user_id)
        product = self._get_product_or_404(user_id, product_id)
        self.repository.delete(product)
