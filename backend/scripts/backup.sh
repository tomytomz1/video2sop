#!/bin/bash

# Load environment variables
source ../.env

# Set variables
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
FILENAME="backup_${TIMESTAMP}.sql"
ENCRYPTED_FILENAME="${FILENAME}.gpg"
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
echo "Creating database backup..."
PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h db -U $POSTGRES_USER -d $POSTGRES_DB > "${BACKUP_DIR}/${FILENAME}"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup created successfully"
    
    # Encrypt backup
    echo "Encrypting backup..."
    echo "$BACKUP_ENCRYPTION_KEY" | gpg --batch --yes --passphrase-fd 0 --symmetric "${BACKUP_DIR}/${FILENAME}"
    
    # Remove unencrypted backup
    rm "${BACKUP_DIR}/${FILENAME}"
    
    # Keep only last 7 days of backups
    echo "Cleaning up old backups..."
    find $BACKUP_DIR -name "backup_*.sql.gpg" -mtime +$RETENTION_DAYS -delete
    
    echo "Backup process completed successfully"
else
    echo "Backup failed"
    exit 1
fi 