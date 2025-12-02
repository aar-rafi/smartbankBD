-- Create database and user
CREATE DATABASE chequemate;
CREATE USER chequemate_user WITH PASSWORD 'chequemate_pass';
GRANT ALL PRIVILEGES ON DATABASE chequemate TO chequemate_user;
