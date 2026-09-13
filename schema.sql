CREATE TABLE IF NOT EXISTS fan_signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  city TEXT,
  consent INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS business_inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  project_date TEXT,
  location TEXT,
  inquiry_type TEXT NOT NULL,
  budget TEXT,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fan_email ON fan_signups(email);
CREATE INDEX IF NOT EXISTS idx_inquiry_created ON business_inquiries(created_at);
