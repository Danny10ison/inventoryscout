from fastapi import APIRouter

from app.api.routes import (
    auth,
    competitor,
    competitor_analysis,
    competitor_monitoring,
    health,
    product,
    product_analysis,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(competitor.router)
api_router.include_router(product.router)
api_router.include_router(competitor_analysis.router)
api_router.include_router(competitor_monitoring.router)
api_router.include_router(product_analysis.router)
