-- Mülakat kiti ve kit sorularına göre alınan notlar
ALTER TABLE "Interview" ADD COLUMN "kit" JSONB;
ALTER TABLE "Scorecard" ADD COLUMN "answers" JSONB NOT NULL DEFAULT '{}';
