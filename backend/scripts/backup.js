const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { exec } = require('child_process');

const backupDir = path.join(__dirname, '../backups');
const uploadsDir = path.join(__dirname, '../uploads');
const exportsDir = path.join(uploadsDir, 'exports');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `backup-${timestamp}.zip`);

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

const output = fs.createWriteStream(backupFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Backup created: ${backupFile} (${archive.pointer()} total bytes)`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.directory(uploadsDir, 'uploads');
// TODO: Add database dump to archive (e.g., pg_dump for PostgreSQL)
// Example: exec('pg_dump ...', ...)
archive.finalize(); 