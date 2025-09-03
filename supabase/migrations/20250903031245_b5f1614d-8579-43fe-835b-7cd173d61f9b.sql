-- Add tracking field for day-of tournament reminders
ALTER TABLE tournaments ADD COLUMN day_of_reminder_sent boolean DEFAULT false;