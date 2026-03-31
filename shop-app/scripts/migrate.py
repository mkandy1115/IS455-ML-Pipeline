"""
migrate.py — One-time script to migrate shop.db (SQLite) → Supabase (PostgreSQL)

Usage:
  pip install psycopg2-binary
  python scripts/migrate.py

Set SUPABASE_DB_URL before running:
  export SUPABASE_DB_URL="postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres"

Find your connection string in:
  Supabase dashboard → Project Settings → Database → Connection string → URI
"""

import sqlite3
import psycopg2
import os
import sys

SQLITE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "shop.db")
PG_URL = os.environ.get("SUPABASE_DB_URL")

if not PG_URL:
    print("ERROR: Set SUPABASE_DB_URL environment variable first.")
    sys.exit(1)

sqlite_conn = sqlite3.connect(SQLITE_PATH)
sqlite_conn.row_factory = sqlite3.Row
pg_conn = psycopg2.connect(PG_URL)
pg_cur = pg_conn.cursor()

print("Creating tables in Supabase...")

pg_cur.execute("""
CREATE TABLE IF NOT EXISTS customers (
  customer_id      SERIAL PRIMARY KEY,
  full_name        TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  gender           TEXT NOT NULL,
  birthdate        TEXT NOT NULL,
  created_at       TEXT NOT NULL,
  city             TEXT,
  state            TEXT,
  zip_code         TEXT,
  customer_segment TEXT,
  loyalty_tier     TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1
);
""")

pg_cur.execute("""
CREATE TABLE IF NOT EXISTS products (
  product_id   SERIAL PRIMARY KEY,
  sku          TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  category     TEXT NOT NULL,
  price        NUMERIC NOT NULL,
  cost         NUMERIC NOT NULL,
  is_active    INTEGER NOT NULL DEFAULT 1
);
""")

pg_cur.execute("""
CREATE TABLE IF NOT EXISTS orders (
  order_id           SERIAL PRIMARY KEY,
  customer_id        INTEGER NOT NULL REFERENCES customers(customer_id),
  order_datetime     TEXT NOT NULL,
  billing_zip        TEXT,
  shipping_zip       TEXT,
  shipping_state     TEXT,
  payment_method     TEXT NOT NULL,
  device_type        TEXT NOT NULL,
  ip_country         TEXT NOT NULL,
  promo_used         INTEGER NOT NULL DEFAULT 0,
  promo_code         TEXT,
  order_subtotal     NUMERIC NOT NULL,
  shipping_fee       NUMERIC NOT NULL,
  tax_amount         NUMERIC NOT NULL,
  order_total        NUMERIC NOT NULL,
  risk_score         NUMERIC NOT NULL,
  is_fraud           INTEGER NOT NULL DEFAULT 0
);
""")

pg_cur.execute("""
CREATE TABLE IF NOT EXISTS order_items (
  order_item_id  SERIAL PRIMARY KEY,
  order_id       INTEGER NOT NULL REFERENCES orders(order_id),
  product_id     INTEGER NOT NULL REFERENCES products(product_id),
  quantity       INTEGER NOT NULL,
  unit_price     NUMERIC NOT NULL,
  line_total     NUMERIC NOT NULL
);
""")

pg_cur.execute("""
CREATE TABLE IF NOT EXISTS shipments (
  shipment_id          SERIAL PRIMARY KEY,
  order_id             INTEGER NOT NULL UNIQUE REFERENCES orders(order_id),
  ship_datetime        TEXT NOT NULL,
  carrier              TEXT NOT NULL,
  shipping_method      TEXT NOT NULL,
  distance_band        TEXT NOT NULL,
  promised_days        INTEGER NOT NULL,
  actual_days          INTEGER NOT NULL,
  late_delivery        INTEGER NOT NULL DEFAULT 0,
  late_delivery_score  NUMERIC DEFAULT NULL,
  scored_at            TEXT DEFAULT NULL
);
""")

pg_cur.execute("""
CREATE TABLE IF NOT EXISTS product_reviews (
  review_id    SERIAL PRIMARY KEY,
  product_id   INTEGER NOT NULL REFERENCES products(product_id),
  customer_id  INTEGER NOT NULL REFERENCES customers(customer_id),
  rating       INTEGER NOT NULL,
  review_text  TEXT,
  review_date  TEXT NOT NULL
);
""")

pg_conn.commit()
print("Tables created.")


def migrate_table(table, columns, insert_sql):
    rows = sqlite_conn.execute(f"SELECT {', '.join(columns)} FROM {table}").fetchall()
    if not rows:
        print(f"  {table}: 0 rows (skipping)")
        return
    pg_cur.executemany(insert_sql, [tuple(r) for r in rows])
    pg_conn.commit()
    print(f"  {table}: {len(rows)} rows migrated")


print("Migrating data...")

migrate_table(
    "customers",
    ["customer_id","full_name","email","gender","birthdate","created_at","city","state","zip_code","customer_segment","loyalty_tier","is_active"],
    "INSERT INTO customers VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING"
)

migrate_table(
    "products",
    ["product_id","sku","product_name","category","price","cost","is_active"],
    "INSERT INTO products VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING"
)

migrate_table(
    "orders",
    ["order_id","customer_id","order_datetime","billing_zip","shipping_zip","shipping_state","payment_method","device_type","ip_country","promo_used","promo_code","order_subtotal","shipping_fee","tax_amount","order_total","risk_score","is_fraud"],
    "INSERT INTO orders VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING"
)

migrate_table(
    "order_items",
    ["order_item_id","order_id","product_id","quantity","unit_price","line_total"],
    "INSERT INTO order_items VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING"
)

migrate_table(
    "shipments",
    ["shipment_id","order_id","ship_datetime","carrier","shipping_method","distance_band","promised_days","actual_days","late_delivery"],
    "INSERT INTO shipments (shipment_id,order_id,ship_datetime,carrier,shipping_method,distance_band,promised_days,actual_days,late_delivery) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING"
)

# Migrate product_reviews if the table exists
try:
    migrate_table(
        "product_reviews",
        ["review_id","product_id","customer_id","rating","review_text","review_date"],
        "INSERT INTO product_reviews VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING"
    )
except Exception as e:
    print(f"  product_reviews: skipped ({e})")

# Reset sequences so new inserts get correct IDs
for table, col in [("customers","customer_id"),("products","product_id"),("orders","order_id"),("order_items","order_item_id"),("shipments","shipment_id")]:
    pg_cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', '{col}'), MAX({col})) FROM {table};")
pg_conn.commit()

sqlite_conn.close()
pg_conn.close()
print("\nMigration complete!")
