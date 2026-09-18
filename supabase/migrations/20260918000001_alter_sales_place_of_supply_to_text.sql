-- Alter place_of_supply on sales to TEXT to match purchases and prevent character(2) length errors
ALTER TABLE sales ALTER COLUMN place_of_supply TYPE text;
