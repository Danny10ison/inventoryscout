from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.core.config import get_settings
from app.core.database import Base
from app.core.database import engine
from app.core.schema_sync import sync_sqlite_schema
from app.models import (
    Competitor,
    CompetitorAnalysis,
    CompetitorMonitoringRun,
    Product,
    ProductAnalysis,
    User,
)

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="""
## InventoryScout AI — Product Intelligence API

InventoryScout AI provides powerful endpoints to analyze, compare, and monitor products across global markets.



### Core Capabilities

-  **Product Analysis**  
  Evaluate products using AI-driven scoring based on demand, competition, and trends.

-  **Product Comparison**  
  Compare multiple products to determine the best opportunity.

-  **Market Opportunities**  
  Discover trending and high-potential products.

-  **Competitor Monitoring**  
  Track competitor activity, pricing changes, and new product launches.



###  Target Users

- Importers (China → Global trade)
- Wholesalers & Distributors
- E-commerce businesses
- Manufacturers launching new products



###  How It Works

1. Submit a product name or URL  
2. InventoryScout scans multiple data signals  
3. AI processes demand, sentiment, and competition  
4. Returns a structured **Product Score + Insights**



###  Vision

> InventoryScout aims to become a daily decision tool for product sourcing teams.

###  Useful Links

- Swagger UI: `/docs`
- ReDoc: `/redoc`

""",
    version=settings.app_version,
    contact={
        "name": "InventoryScout Team",
        "email": "pagesngod@gmail.com",
    },
    license_info={
        "name": "MIT License",
    },
    docs_url="/docs",
    redoc_url="/redoc",
)

Base.metadata.create_all(bind=engine)
sync_sqlite_schema(engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred.",
        },
    )

app.include_router(api_router)

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to InventoryScout AI API 🚀",
        "docs": "/docs",
        "health": "/health",
        "version": settings.app_version,
    }
