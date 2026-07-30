-- AES-GCM StringCryptoConverter expands ciphertext.  Existing plaintext remains readable and is
-- converted on its next write; new/updated rows are encrypted whenever the prod PII key is present.
ALTER TABLE personal_workplace
    MODIFY COLUMN name VARCHAR(1024) NOT NULL,
    MODIFY COLUMN address VARCHAR(1024) NULL,
    MODIFY COLUMN hourly_wage VARCHAR(255) NOT NULL;

ALTER TABLE customer_inquiry
    MODIFY COLUMN name VARCHAR(512) NOT NULL,
    MODIFY COLUMN email VARCHAR(768) NOT NULL,
    MODIFY COLUMN content TEXT NOT NULL;
