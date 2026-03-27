from sqlalchemy.orm import Session

from app.models.product import Product


class ProductRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_user_and_id(self, user_id: int, product_id: int) -> Product | None:
        return (
            self.db.query(Product)
            .filter(Product.user_id == user_id, Product.id == product_id)
            .first()
        )

    def list_by_user_id(self, user_id: int) -> list[Product]:
        return (
            self.db.query(Product)
            .filter(Product.user_id == user_id)
            .order_by(Product.created_at.desc())
            .all()
        )

    def get_by_user_and_name(self, user_id: int, name: str) -> Product | None:
        return (
            self.db.query(Product)
            .filter(Product.user_id == user_id, Product.name == name)
            .first()
        )

    def get_by_user_and_url(self, user_id: int, url: str) -> Product | None:
        return (
            self.db.query(Product)
            .filter(Product.user_id == user_id, Product.url == url)
            .first()
        )

    def create(
        self,
        *,
        user_id: int,
        name: str,
        url: str | None,
        category: str | None,
        description: str | None,
    ) -> Product:
        product = Product(
            user_id=user_id,
            name=name,
            url=url,
            category=category,
            description=description,
        )
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return product

    def update(self, product: Product, **fields) -> Product:
        for key, value in fields.items():
            setattr(product, key, value)

        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return product

    def delete(self, product: Product) -> None:
        self.db.delete(product)
        self.db.commit()
