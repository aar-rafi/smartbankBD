import psycopg
import os
import shutil

# Configuration
SOURCE_IMAGE_PATH = '../../signatures/sig-2.jpg' # Adjust if needed
DEST_DIR = 'signatures'
ACCOUNT_ID = 4
NEW_FILENAME = f'sig-{ACCOUNT_ID}.jpg'
DB_IMAGE_PATH = f'/{DEST_DIR}/{NEW_FILENAME}'

# Ensure destination directory exists (relative to where script is run, or project root)
# Assuming script is run from project root or we handle paths carefully.
# Let's assume we run this from project root for simplicity in path resolution
if not os.path.exists(DEST_DIR):
    os.makedirs(DEST_DIR)

DEST_PATH = os.path.join(DEST_DIR, NEW_FILENAME)

try:
    # 1. Copy the file
    # If source doesn't exist, we can't proceed. 
    # For this script, let's assume the user has the file at SOURCE_IMAGE_PATH
    # Or we can just write the bytes if we had them. 
    # The user's original script read from '../../signatures/sig-2.jpg'.
    # We will read from there and write to DEST_PATH.
    
    with open(SOURCE_IMAGE_PATH, 'rb') as f_in:
        with open(DEST_PATH, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)
    
    print(f"Saved image to {DEST_PATH}")

    # 2. Connect to DB
    conn = psycopg.connect("host=localhost dbname=chequemate user=chequemate_user password=chequemate_pass")
    cursor = conn.cursor()

    # 3. Insert into Postgres (Path only)
    cursor.execute("""
        INSERT INTO account_signatures (account_id, image_path)
        VALUES (%s, %s)
        RETURNING signature_id
    """, (ACCOUNT_ID, DB_IMAGE_PATH))
    
    sig_id = cursor.fetchone()[0]
    print(f"Inserted signature record id={sig_id} with path={DB_IMAGE_PATH}")

    conn.commit()
    cursor.close()
    conn.close()

except FileNotFoundError:
    print(f"Error: Source file '{SOURCE_IMAGE_PATH}' not found.")
except Exception as e:
    print(f"Error: {e}")

