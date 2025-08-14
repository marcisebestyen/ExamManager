-- PostgreSQL initialization script for the ExamManager database

-- Begin a transaction for safe data manipulation.
BEGIN;

-- Drop foreign keys temporarily to avoid constraint violations during deletion.
-- This is a more robust approach than just deleting in a specific order.
ALTER TABLE "Exams" DROP CONSTRAINT IF EXISTS "FK_Exams_Institutions_InstitutionId";
ALTER TABLE "Exams" DROP CONSTRAINT IF EXISTS "FK_Exams_ExamTypes_ExamTypeId";
ALTER TABLE "Exams" DROP CONSTRAINT IF EXISTS "FK_Exams_Professions_ProfessionId";
ALTER TABLE "Exams" DROP CONSTRAINT IF EXISTS "FK_Exams_Operators_OperatorId";
ALTER TABLE "Exams" DROP CONSTRAINT IF EXISTS "FK_Exams_Operators_DeletedById";
ALTER TABLE "ExamBoards" DROP CONSTRAINT IF EXISTS "FK_ExamBoards_Exams_ExamId";
ALTER TABLE "ExamBoards" DROP CONSTRAINT IF EXISTS "FK_ExamBoards_Examiners_ExaminerId";
ALTER TABLE "ExamBoards" DROP CONSTRAINT IF EXISTS "FK_ExamBoards_Operators_DeletedById";
ALTER TABLE "Examiners" DROP CONSTRAINT IF EXISTS "FK_Examiners_Operators_DeletedById";
ALTER TABLE "BackupHistory" DROP CONSTRAINT IF EXISTS "FK_BackupHistory_Operators_OperatorId";
ALTER TABLE "PasswordResets" DROP CONSTRAINT IF EXISTS "FK_PasswordResets_Operators_OperatorId";

-- Delete all data from the tables in a safe order (or just clear all of them).
-- The order is less critical here since we dropped the FKs.
TRUNCATE TABLE "Exams" CASCADE;
TRUNCATE TABLE "ExamBoards" CASCADE;
TRUNCATE TABLE "Institutions" CASCADE;
TRUNCATE TABLE "Examiners" CASCADE;
TRUNCATE TABLE "ExamTypes" CASCADE;
TRUNCATE TABLE "Professions" CASCADE;
TRUNCATE TABLE "BackupHistory" CASCADE;
TRUNCATE TABLE "PasswordResets" CASCADE;
TRUNCATE TABLE "Operators" CASCADE;

-- Reset the identity sequences for each table's primary key.
-- This ensures that the IDs start from 1 again.
ALTER SEQUENCE "Exams_Id_seq" RESTART WITH 1;
ALTER SEQUENCE "ExamBoards_ExamId_seq" RESTART WITH 1;
ALTER SEQUENCE "ExamBoards_ExaminerId_seq" RESTART WITH 1;
ALTER SEQUENCE "Institutions_Id_seq" RESTART WITH 1;
ALTER SEQUENCE "Examiners_Id_seq" RESTART WITH 1;
ALTER SEQUENCE "ExamTypes_Id_seq" RESTART WITH 1;
ALTER SEQUENCE "Professions_Id_seq" RESTART WITH 1;
ALTER SEQUENCE "BackupHistory_Id_seq" RESTART WITH 1;
ALTER SEQUENCE "PasswordResets_Id_seq" RESTART WITH 1;
ALTER SEQUENCE "Operators_Id_seq" RESTART WITH 1;

-- Operators table
-- Roles: Operator = 0, Admin = 1
-- The password hashes here are for demonstration purposes.
-- They should be generated securely in a real application.
-- Password 'Password123'
INSERT INTO "Operators" ("UserName", "Password", "FirstName", "LastName", "Role", "IsDeleted")
VALUES
('operator1', '$2a$10$wB5W6l.iH0Jt9.z9J2g6L.p.C.t.X.S8T.m9.U5E4o/D.i.g2zO', 'John', 'Doe', 0, false),
('operator2', '$2a$10$wB5W6l.iH0Jt9.z9J2g6L.p.C.t.X.S8T.m9.U5E4o/D.i.g2zO', 'Jane', 'Smith', 0, false);

-- Institutions table
-- Note: 'EducationalId' is now unique.
INSERT INTO "Institutions" ("EducationalId", "Name", "ZipCode", "Town", "Street", "Number", "Floor", "Door")
VALUES
('INST-001', 'Test University', 12345, 'Cityville', 'Main St', '101', NULL, NULL),
('INST-002', 'Test High School', 67890, 'Townsville', 'Central Ave', '5', '2', '203'),
('INST-003', 'Vocational Training Center', 54321, 'Villagetown', 'Oak Rd', '15', NULL, 'A');

-- Examiners table
INSERT INTO "Examiners" ("FirstName", "LastName", "DateOfBirth", "Email", "Phone", "IdentityCardNumber", "IsDeleted")
VALUES
('Michael', 'Brown', '1980-01-15', 'michael.brown@example.com', '+1234567890', 'ID123456', false),
('Emily', 'Jones', '1975-05-20', 'emily.jones@example.com', '+1987654321', 'ID987654', false),
('David', 'Garcia', '1988-11-10', 'david.garcia@example.com', '+1122334455', 'ID112233', false);

-- ExamTypes table
INSERT INTO "ExamTypes" ("TypeName", "Description")
VALUES
('Written Exam', 'A traditional written test.'),
('Oral Exam', 'An examination conducted orally.'),
('Practical Exam', 'An exam involving hands-on tasks.');

-- Professions table
INSERT INTO "Professions" ("KeorId", "ProfessionName")
VALUES
('KEOR-101', 'Software Development'),
('KEOR-202', 'Data Science'),
('KEOR-303', 'Cloud Engineering');

-- Exams table
-- Status: Planned = 0, Active = 1, Postponed = 2, Completed = 3
INSERT INTO "Exams" ("ExamName", "ExamCode", "ExamDate", "Status", "ProfessionId", "InstitutionId", "ExamTypeId", "OperatorId", "IsDeleted")
VALUES
('Final Programming Exam', 'P-FINAL-2025', '2025-09-10 09:00:00', 0, 1, 1, 1, 2, false),
('Database Practical', 'DB-PRAC-2025', '2025-09-15 14:00:00', 0, 2, 2, 3, 2, false),
('Cloud Infrastructure Design', 'CI-ORAL-2025', '2025-09-20 10:00:00', 0, 3, 3, 2, 3, false);

-- ExamBoards table
-- Linking examiners to exams.
INSERT INTO "ExamBoards" ("ExamId", "ExaminerId", "Role")
VALUES
(1, 1, 'Main Examiner'),
(1, 2, 'Observer'),
(2, 2, 'Main Examiner'),
(3, 1, 'Main Examiner'),
(3, 3, 'Observer');

-- Re-add foreign keys.
ALTER TABLE "Exams" ADD CONSTRAINT "FK_Exams_Institutions_InstitutionId" FOREIGN KEY ("InstitutionId") REFERENCES "Institutions" ("Id") ON DELETE RESTRICT;
ALTER TABLE "Exams" ADD CONSTRAINT "FK_Exams_ExamTypes_ExamTypeId" FOREIGN KEY ("ExamTypeId") REFERENCES "ExamTypes" ("Id") ON DELETE RESTRICT;
ALTER TABLE "Exams" ADD CONSTRAINT "FK_Exams_Professions_ProfessionId" FOREIGN KEY ("ProfessionId") REFERENCES "Professions" ("Id") ON DELETE RESTRICT;
ALTER TABLE "Exams" ADD CONSTRAINT "FK_Exams_Operators_OperatorId" FOREIGN KEY ("OperatorId") REFERENCES "Operators" ("Id") ON DELETE RESTRICT;
ALTER TABLE "Exams" ADD CONSTRAINT "FK_Exams_Operators_DeletedById" FOREIGN KEY ("DeletedById") REFERENCES "Operators" ("Id") ON DELETE RESTRICT;
ALTER TABLE "ExamBoards" ADD CONSTRAINT "FK_ExamBoards_Exams_ExamId" FOREIGN KEY ("ExamId") REFERENCES "Exams" ("Id") ON DELETE CASCADE;
ALTER TABLE "ExamBoards" ADD CONSTRAINT "FK_ExamBoards_Examiners_ExaminerId" FOREIGN KEY ("ExaminerId") REFERENCES "Examiners" ("Id") ON DELETE CASCADE;
ALTER TABLE "ExamBoards" ADD CONSTRAINT "FK_ExamBoards_Operators_DeletedById" FOREIGN KEY ("DeletedById") REFERENCES "Operators" ("Id") ON DELETE RESTRICT;
ALTER TABLE "Examiners" ADD CONSTRAINT "FK_Examiners_Operators_DeletedById" FOREIGN KEY ("DeletedById") REFERENCES "Operators" ("Id") ON DELETE RESTRICT;
ALTER TABLE "BackupHistory" ADD CONSTRAINT "FK_BackupHistory_Operators_OperatorId" FOREIGN KEY ("OperatorId") REFERENCES "Operators" ("Id") ON DELETE RESTRICT;
ALTER TABLE "PasswordResets" ADD CONSTRAINT "FK_PasswordResets_Operators_OperatorId" FOREIGN KEY ("OperatorId") REFERENCES "Operators" ("Id") ON DELETE RESTRICT;

-- Commit the transaction if all commands were successful.
COMMIT;