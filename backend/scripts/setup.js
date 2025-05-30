const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create logs directory
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Install dependencies
const dependencies = [
  'express',
  'cors',
  'helmet',
  'compression',
  'morgan',
  'winston',
  'winston-daily-rotate-file',
  'zod',
  '@prisma/client',
  '@types/express',
  '@types/cors',
  '@types/helmet',
  '@types/compression',
  '@types/morgan',
  '@types/node',
  'typescript',
  'ts-node',
  'ts-node-dev',
];

console.log('Installing dependencies...');
execSync(`npm install ${dependencies.join(' ')}`, { stdio: 'inherit' });

// Generate Prisma client
console.log('Generating Prisma client...');
execSync('npx prisma generate', { stdio: 'inherit' });

console.log('Setup completed successfully!'); 