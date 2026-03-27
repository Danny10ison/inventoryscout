from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_user_access
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.services.product_service import ProductService

router = APIRouter(prefix="/users/{user_id}/products", tags=["Products"])


@router.post(
    "/",
    response_model=ProductOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create Product",
    description="Add a product for a specific user.",
)
def create_product(
    user_id: int,
    payload: ProductCreate,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> ProductOut:
    service = ProductService(db)
    return service.create_product(user_id, payload)


@router.get(
    "/",
    response_model=list[ProductOut],
    status_code=status.HTTP_200_OK,
    summary="List Products",
    description="List all products for a specific user.",
)
def list_products(
    user_id: int,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> list[ProductOut]:
    service = ProductService(db)
    return service.list_products(user_id)


@router.get(
    "/{product_id}",
    response_model=ProductOut,
    status_code=status.HTTP_200_OK,
    summary="Get Product",
    description="Fetch a single product for a specific user.",
)
def get_product(
    user_id: int,
    product_id: int,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> ProductOut:
    service = ProductService(db)
    return service.get_product(user_id, product_id)


@router.patch(
    "/{product_id}",
    response_model=ProductOut,
    status_code=status.HTTP_200_OK,
    summary="Update Product",
    description="Update product details for a specific user.",
)
def update_product(
    user_id: int,
    product_id: int,
    payload: ProductUpdate,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> ProductOut:
    service = ProductService(db)
    return service.update_product(user_id, product_id, payload)


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Product",
    description="Delete a product for a specific user.",
)
def delete_product(
    user_id: int,
    product_id: int,
    _: object = Depends(require_user_access),
    db: Session = Depends(get_db),
) -> Response:
    service = ProductService(db)
    service.delete_product(user_id, product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
