/**
 * Manual migration helper — applies any missing schema changes directly to dev.db.
 * Run from the project root: node scripts/migrate.cjs
 */
const path  = require("path");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "..", "dev.db");

let db;
try {
  db = new Database(DB_PATH);
} catch (e) {
  // better-sqlite3 may not be available — fall back to the built-in sqlite3 via child_process
  console.log("better-sqlite3 not available, falling back to Python sqlite3...");
  runViaPython();
  process.exit(0);
}

const migrations = [
  // Session 8 — conversation metadata + profileComplete
  {
    col: "metadata", table: "Conversation",
    sql: 'ALTER TABLE "Conversation" ADD COLUMN "metadata" TEXT',
  },
  {
    col: "profileComplete", table: "User",
    sql: 'ALTER TABLE "User" ADD COLUMN "profileComplete" INTEGER NOT NULL DEFAULT 0',
  },
  // Session 10 — proteinMultiplier
  {
    col: "proteinMultiplier", table: "User",
    sql: 'ALTER TABLE "User" ADD COLUMN "proteinMultiplier" REAL NOT NULL DEFAULT 2.0',
  },
  // Session 11 — training schedule
  {
    col: "trainingDaysPerWeek", table: "User",
    sql: 'ALTER TABLE "User" ADD COLUMN "trainingDaysPerWeek" INTEGER',
  },
  {
    col: "trainingHoursPerDay", table: "User",
    sql: 'ALTER TABLE "User" ADD COLUMN "trainingHoursPerDay" REAL',
  },
];

function getColumns(table) {
  return db.prepare(`PRAGMA table_info("${table}")`).all().map(r => r.name);
}

let applied = 0;
for (const m of migrations) {
  const cols = getColumns(m.table);
  if (cols.includes(m.col)) {
    console.log(`  skip  ${m.table}.${m.col} (already exists)`);
  } else {
    db.prepare(m.sql).run();
    console.log(`  added ${m.table}.${m.col}`);
    applied++;
  }
}

db.close();
console.log(`\nDone — ${applied} column(s) added.`);

// ── Python fallback ────────────────────────────────────────────────────────────
function runViaPython() {
  const { execSync } = require("child_process");
  const script = `
import sqlite3, os
db_path = os.path.join(os.path.dirname(os.path.abspath('${DB_PATH}')), 'dev.db')
conn = sqlite3.connect(r'${DB_PATH}')
cur = conn.cursor()

def cols(table):
    cur.execute(f'PRAGMA table_info("{table}")')
    return [r[1] for r in cur.fetchall()]

migrations = [
    ('Conversation', 'metadata',           'ALTER TABLE "Conversation" ADD COLUMN "metadata" TEXT'),
    ('User', 'profileComplete',            'ALTER TABLE "User" ADD COLUMN "profileComplete" INTEGER NOT NULL DEFAULT 0'),
    ('User', 'proteinMultiplier',          'ALTER TABLE "User" ADD COLUMN "proteinMultiplier" REAL NOT NULL DEFAULT 2.0'),
    ('User', 'trainingDaysPerWeek',        'ALTER TABLE "User" ADD COLUMN "trainingDaysPerWeek" INTEGER'),
    ('User', 'trainingHoursPerDay',        'ALTER TABLE "User" ADD COLUMN "trainingHoursPerDay" REAL'),
]

applied = 0
for table, col, sql in migrations:
    if col in cols(table):
        print(f'  skip  {table}.{col}')
    else:
        cur.execute(sql)
        print(f'  added {table}.{col}')
        applied += 1

conn.commit()
conn.close()
print(f'Done — {applied} column(s) added.')
`;
  execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, { stdio: "inherit" });
}
