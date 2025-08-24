
ALTER TABLE users
ADD COLUMN google_calendar_access_token TEXT,
ADD COLUMN google_calendar_refresh_token TEXT,
ADD COLUMN google_calendar_token_expires_at TIMESTAMPTZ,
ADD COLUMN apple_calendar_access_token TEXT,
ADD COLUMN apple_calendar_refresh_token TEXT,
ADD COLUMN apple_calendar_token_expires_at TIMESTAMPTZ;
