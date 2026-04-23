"""
Applies all pending schema migrations directly to dev.db.
Run from the project root:  python scripts/migrate.py
"""
import sqlite3, os, sys

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dev.db")

if not os.path.exists(DB_PATH):
    print(f"ERROR: dev.db not found at {DB_PATH}")
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)
cur  = conn.cursor()

def columns(table: str):
    cur.execute(f'PRAGMA table_info("{table}")')
    return {row[1] for row in cur.fetchall()}

MIGRATIONS = [
    # (table, column, ALTER TABLE sql)
    ("Conversation", "metadata",
     'ALTER TABLE "Conversation" ADD COLUMN "metadata" TEXT'),

    ("User", "profileComplete",
     'ALTER TABLE "User" ADD COLUMN "profileComplete" INTEGER NOT NULL DEFAULT 0'),

    ("User", "proteinMultiplier",
     'ALTER TABLE "User" ADD COLUMN "proteinMultiplier" REAL NOT NULL DEFAULT 2.0'),

    ("User", "trainingDaysPerWeek",
     'ALTER TABLE "User" ADD COLUMN "trainingDaysPerWeek" INTEGER'),

    ("User", "trainingHoursPerDay",
     'ALTER TABLE "User" ADD COLUMN "trainingHoursPerDay" REAL'),
]

applied = 0
for table, col, sql in MIGRATIONS:
    if col in columns(table):
        print(f"  skip  {table}.{col}")
    else:
        cur.execute(sql)
        print(f"  added {table}.{col}")
        applied += 1

conn.commit()
conn.close()
print(f"\nDone — {applied} column(s) added.")
