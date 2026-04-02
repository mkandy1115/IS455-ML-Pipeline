"""
scoring-service/main.py
-----------------------
FastAPI wrapper around model1.sav (XGBoost fraud detection pipeline).

Endpoint: POST /score
  - Fetches all orders from Supabase that have not yet been scored (risk_score == 0)
  - Reconstructs the exact feature schema the model was trained on
  - Runs predict_proba and writes scores back to orders.risk_score
  - Returns the top-50 highest-risk orders

Deploy on Render:
  1. Add this folder as a new Web Service pointing at scoring-service/
  2. Start command: uvicorn main:app --host 0.0.0.0 --port $PORT
  3. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars on Render
"""

import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Fraud Scoring Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once at startup
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "model1.sav")
model = joblib.load(MODEL_PATH)
print(f"Model loaded: {type(model).__name__}")

# Supabase client
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# Exact feature columns the model was trained on (order matters for ColumnTransformer)
FEATURE_COLS = [
    "billing_zip", "shipping_zip", "shipping_state", "payment_method",
    "device_type", "ip_country", "promo_used", "promo_code",
    "order_subtotal", "shipping_fee", "tax_amount", "order_total",
    "gender", "city", "customer_state", "customer_segment", "loyalty_tier",
    "customer_is_active", "distinct_items", "total_units", "avg_item_price",
    "max_item_price", "carrier", "shipping_method", "distance_band",
    "promised_days", "actual_days", "late_delivery",
    "order_hour", "order_dayofweek", "order_month",
    "customer_tenure_days", "customer_age_years",
]


def fetch_orders_dataframe() -> pd.DataFrame:
    """Pull all orders with joined customer, shipment, and order_item aggregates."""

    # Fetch orders
    orders_res = supabase.table("orders").select(
        "order_id, customer_id, order_datetime, billing_zip, shipping_zip, "
        "shipping_state, payment_method, device_type, ip_country, promo_used, "
        "promo_code, order_subtotal, shipping_fee, tax_amount, order_total"
    ).execute()
    orders_df = pd.DataFrame(orders_res.data)

    # Fetch customers
    customers_res = supabase.table("customers").select(
        "customer_id, gender, city, state, customer_segment, loyalty_tier, "
        "is_active, birthdate, created_at"
    ).execute()
    customers_df = pd.DataFrame(customers_res.data).rename(columns={
        "state": "customer_state",
        "is_active": "customer_is_active",
        "created_at": "customer_created_at",
    })

    # Fetch shipments
    shipments_res = supabase.table("shipments").select(
        "order_id, carrier, shipping_method, distance_band, "
        "promised_days, actual_days, late_delivery"
    ).execute()
    shipments_df = pd.DataFrame(shipments_res.data)

    # Aggregate order_items
    items_res = supabase.table("order_items").select(
        "order_id, quantity, unit_price"
    ).execute()
    items_df = pd.DataFrame(items_res.data)
    items_agg = items_df.groupby("order_id").agg(
        distinct_items=("unit_price", "count"),
        total_units=("quantity", "sum"),
        avg_item_price=("unit_price", "mean"),
        max_item_price=("unit_price", "max"),
    ).reset_index()

    # Join everything
    df = (
        orders_df
        .merge(customers_df, on="customer_id", how="left")
        .merge(shipments_df, on="order_id", how="left")
        .merge(items_agg, on="order_id", how="left")
    )

    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Recreate the exact feature engineering from the training notebook."""
    df = df.copy()

    df["order_datetime"] = pd.to_datetime(df["order_datetime"], errors="coerce")
    df["birthdate"] = pd.to_datetime(df["birthdate"], errors="coerce")
    df["customer_created_at"] = pd.to_datetime(df["customer_created_at"], errors="coerce")

    df["order_hour"] = df["order_datetime"].dt.hour
    df["order_dayofweek"] = df["order_datetime"].dt.dayofweek
    df["order_month"] = df["order_datetime"].dt.month

    df["customer_tenure_days"] = (
        df["order_datetime"] - df["customer_created_at"]
    ).dt.days

    df["customer_age_years"] = (
        (df["order_datetime"] - df["birthdate"]).dt.days / 365.25
    )

    return df


@app.get("/health")
def health():
    return {"status": "ok", "model": type(model).__name__}


@app.post("/score")
def score_orders():
    """
    Score all orders for fraud probability, write scores to Supabase,
    and return top-50 highest-risk orders.
    """
    raw_df = fetch_orders_dataframe()
    engineered_df = engineer_features(raw_df)

    # Build feature matrix — only the columns the model expects
    missing = [c for c in FEATURE_COLS if c not in engineered_df.columns]
    if missing:
        return {"error": f"Missing feature columns: {missing}"}

    X = engineered_df[FEATURE_COLS].copy()

    # Predict fraud probability
    proba = model.predict_proba(X)[:, 1]

    engineered_df = engineered_df.copy()
    engineered_df["fraud_score"] = np.round(proba, 6)
    engineered_df["predicted_fraud"] = (proba >= 0.5).astype(int)

    # Write scores back to Supabase orders table
    scored_at = datetime.now(timezone.utc).isoformat()
    for _, row in engineered_df.iterrows():
        supabase.table("orders").update({
            "risk_score": float(row["fraud_score"]),
            "predicted_fraud": int(row["predicted_fraud"]),
        }).eq("order_id", int(row["order_id"])).execute()

    # Return top 50 highest-risk orders
    top50 = (
        engineered_df[["order_id", "customer_id", "fraud_score",
                        "order_total", "payment_method", "device_type"]]
        .sort_values("fraud_score", ascending=False)
        .head(50)
        .to_dict(orient="records")
    )

    return {
        "scored_at": scored_at,
        "total_scored": len(engineered_df),
        "top_50": top50,
    }
