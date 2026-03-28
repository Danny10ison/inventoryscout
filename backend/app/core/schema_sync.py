from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def sync_sqlite_schema(engine: Engine) -> None:
    if engine.dialect.name != "sqlite":
        return

    column_statements = {
        "product_analyses": {
            "value_proposition": "ALTER TABLE product_analyses ADD COLUMN value_proposition TEXT",
            "key_features": "ALTER TABLE product_analyses ADD COLUMN key_features JSON NOT NULL DEFAULT '[]'",
            "demand_signals": "ALTER TABLE product_analyses ADD COLUMN demand_signals JSON NOT NULL DEFAULT '[]'",
            "trend_signals": "ALTER TABLE product_analyses ADD COLUMN trend_signals JSON NOT NULL DEFAULT '[]'",
            "competitive_signals": "ALTER TABLE product_analyses ADD COLUMN competitive_signals JSON NOT NULL DEFAULT '[]'",
            "demand_score": "ALTER TABLE product_analyses ADD COLUMN demand_score INTEGER NOT NULL DEFAULT 0",
            "competition_score": "ALTER TABLE product_analyses ADD COLUMN competition_score INTEGER NOT NULL DEFAULT 0",
            "trend_score": "ALTER TABLE product_analyses ADD COLUMN trend_score INTEGER NOT NULL DEFAULT 0",
            "opportunity_score": "ALTER TABLE product_analyses ADD COLUMN opportunity_score INTEGER NOT NULL DEFAULT 0",
            "overall_score": "ALTER TABLE product_analyses ADD COLUMN overall_score INTEGER NOT NULL DEFAULT 0",
            "confidence_score": "ALTER TABLE product_analyses ADD COLUMN confidence_score INTEGER NOT NULL DEFAULT 0",
            "confidence_level": "ALTER TABLE product_analyses ADD COLUMN confidence_level VARCHAR NOT NULL DEFAULT 'Low'",
            "data_freshness": "ALTER TABLE product_analyses ADD COLUMN data_freshness VARCHAR NOT NULL DEFAULT 'stale'",
            "sources_used": "ALTER TABLE product_analyses ADD COLUMN sources_used JSON NOT NULL DEFAULT '[]'",
            "sources_failed": "ALTER TABLE product_analyses ADD COLUMN sources_failed JSON NOT NULL DEFAULT '[]'",
            "evidence": "ALTER TABLE product_analyses ADD COLUMN evidence JSON NOT NULL DEFAULT '[]'",
            "scoring_version": "ALTER TABLE product_analyses ADD COLUMN scoring_version VARCHAR NOT NULL DEFAULT 'v2-live'",
        },
        "competitor_analyses": {
            "positioning": "ALTER TABLE competitor_analyses ADD COLUMN positioning TEXT",
            "pricing_signal": "ALTER TABLE competitor_analyses ADD COLUMN pricing_signal TEXT",
            "differentiators": "ALTER TABLE competitor_analyses ADD COLUMN differentiators JSON NOT NULL DEFAULT '[]'",
            "market_signals": "ALTER TABLE competitor_analyses ADD COLUMN market_signals JSON NOT NULL DEFAULT '[]'",
            "trend_signals": "ALTER TABLE competitor_analyses ADD COLUMN trend_signals JSON NOT NULL DEFAULT '[]'",
            "competition_score": "ALTER TABLE competitor_analyses ADD COLUMN competition_score INTEGER NOT NULL DEFAULT 0",
            "positioning_score": "ALTER TABLE competitor_analyses ADD COLUMN positioning_score INTEGER NOT NULL DEFAULT 0",
            "pricing_pressure_score": "ALTER TABLE competitor_analyses ADD COLUMN pricing_pressure_score INTEGER NOT NULL DEFAULT 0",
            "trend_score": "ALTER TABLE competitor_analyses ADD COLUMN trend_score INTEGER NOT NULL DEFAULT 0",
            "overall_score": "ALTER TABLE competitor_analyses ADD COLUMN overall_score INTEGER NOT NULL DEFAULT 0",
            "confidence_score": "ALTER TABLE competitor_analyses ADD COLUMN confidence_score INTEGER NOT NULL DEFAULT 0",
            "confidence_level": "ALTER TABLE competitor_analyses ADD COLUMN confidence_level VARCHAR NOT NULL DEFAULT 'Low'",
            "data_freshness": "ALTER TABLE competitor_analyses ADD COLUMN data_freshness VARCHAR NOT NULL DEFAULT 'stale'",
            "sources_used": "ALTER TABLE competitor_analyses ADD COLUMN sources_used JSON NOT NULL DEFAULT '[]'",
            "sources_failed": "ALTER TABLE competitor_analyses ADD COLUMN sources_failed JSON NOT NULL DEFAULT '[]'",
            "evidence": "ALTER TABLE competitor_analyses ADD COLUMN evidence JSON NOT NULL DEFAULT '[]'",
            "scoring_version": "ALTER TABLE competitor_analyses ADD COLUMN scoring_version VARCHAR NOT NULL DEFAULT 'v2-live'",
        },
        "competitor_monitoring_runs": {
            "confidence_score": "ALTER TABLE competitor_monitoring_runs ADD COLUMN confidence_score INTEGER NOT NULL DEFAULT 0",
            "confidence_level": "ALTER TABLE competitor_monitoring_runs ADD COLUMN confidence_level VARCHAR NOT NULL DEFAULT 'Low'",
            "data_freshness": "ALTER TABLE competitor_monitoring_runs ADD COLUMN data_freshness VARCHAR NOT NULL DEFAULT 'stale'",
            "sources_used": "ALTER TABLE competitor_monitoring_runs ADD COLUMN sources_used JSON NOT NULL DEFAULT '[]'",
            "sources_failed": "ALTER TABLE competitor_monitoring_runs ADD COLUMN sources_failed JSON NOT NULL DEFAULT '[]'",
            "evidence": "ALTER TABLE competitor_monitoring_runs ADD COLUMN evidence JSON NOT NULL DEFAULT '[]'",
            "scoring_version": "ALTER TABLE competitor_monitoring_runs ADD COLUMN scoring_version VARCHAR NOT NULL DEFAULT 'v2-live'",
        },
    }

    inspector = inspect(engine)

    with engine.begin() as connection:
        for table_name, statements in column_statements.items():
            if not inspector.has_table(table_name):
                continue

            existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, statement in statements.items():
                if column_name not in existing_columns:
                    connection.execute(text(statement))
