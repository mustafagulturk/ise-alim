-- Yetenek havuzu: adayın diğer pozisyonlar için değerlendirilme onayı
ALTER TABLE "Candidate" ADD COLUMN "poolConsent" BOOLEAN NOT NULL DEFAULT false;
