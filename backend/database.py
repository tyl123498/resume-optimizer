import sqlite3
import os
import threading

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(DB_DIR, "orders.db")

_local = threading.local()


def get_conn() -> sqlite3.Connection:
    if not hasattr(_local, "conn") or _local.conn is None:
        os.makedirs(DB_DIR, exist_ok=True)
        conn = sqlite3.connect(DB_PATH, timeout=30)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=30000")
        _local.conn = conn
    return _local.conn


def init_db():
    conn = get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS payment_orders (
            id TEXT PRIMARY KEY,
            hupijiao_order_id TEXT,
            access_token TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            amount INTEGER DEFAULT 990,
            resume_text TEXT,
            jd_text TEXT,
            analysis_result TEXT,
            generate_result TEXT,
            is_test INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            paid_at TEXT,
            expired_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_order_status_created ON payment_orders(status, created_at);
        CREATE INDEX IF NOT EXISTS idx_order_hupijiao_id ON payment_orders(hupijiao_order_id);
    """)
    conn.commit()


def _checkpoint():
    try:
        get_conn().execute("PRAGMA wal_checkpoint(TRUNCATE)")
    except Exception:
        pass


def create_order(order_id: str, access_token: str, resume_text: str, jd_text: str, is_test: int = 0):
    conn = get_conn()
    conn.execute(
        "INSERT INTO payment_orders (id, access_token, resume_text, jd_text, is_test, expired_at) "
        "VALUES (?, ?, ?, ?, ?, datetime('now', '+60 minutes'))",
        (order_id, access_token, resume_text, jd_text, is_test),
    )
    conn.commit()


def get_order(order_id: str):
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM payment_orders WHERE id = ?", (order_id,)
    ).fetchone()
    return dict(row) if row else None


def get_order_by_hupijiao_id(hupijiao_order_id: str):
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM payment_orders WHERE hupijiao_order_id = ?", (hupijiao_order_id,)
    ).fetchone()
    return dict(row) if row else None


def update_order_paid(order_id: str, hupijiao_order_id: str):
    conn = get_conn()
    current = conn.execute(
        "SELECT status FROM payment_orders WHERE id = ?", (order_id,)
    ).fetchone()
    if current and current["status"] == "paid":
        return
    conn.execute(
        "UPDATE payment_orders SET status = 'paid', hupijiao_order_id = ?, paid_at = datetime('now') "
        "WHERE id = ? AND status IN ('pending', 'expired')",
        (hupijiao_order_id, order_id),
    )
    conn.commit()
    _checkpoint()


def mark_order_used(order_id: str):
    conn = get_conn()
    conn.execute(
        "UPDATE payment_orders SET status = 'used' WHERE id = ? AND status = 'paid'",
        (order_id,),
    )
    conn.commit()


def save_results(order_id: str, analysis_json: str, generate_text: str):
    conn = get_conn()
    conn.execute(
        "UPDATE payment_orders SET analysis_result = ?, generate_result = ? WHERE id = ?",
        (analysis_json, generate_text, order_id),
    )
    conn.commit()
    _checkpoint()


def is_order_valid(order_id: str, access_token: str) -> bool:
    conn = get_conn()
    row = conn.execute(
        "SELECT 1 FROM payment_orders "
        "WHERE id = ? AND access_token = ? AND status = 'paid'",
        (order_id, access_token),
    ).fetchone()
    return row is not None


def get_result(order_id: str, access_token: str):
    conn = get_conn()
    row = conn.execute(
        "SELECT analysis_result, generate_result FROM payment_orders "
        "WHERE id = ? AND access_token = ? AND status IN ('paid', 'used')",
        (order_id, access_token),
    ).fetchone()
    return dict(row) if row else None
