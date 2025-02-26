import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Ensure the dist directory exists
if (!fs.existsSync('./dist')) {
  fs.mkdirSync('./dist', { recursive: true });
}

// Copy the HTML file to dist
fs.copyFileSync('./src/index.html', './dist/index.html');

// Run the tailwind CLI to compile CSS
exec('npx tailwindcss -i ./src/styles.css -o ./dist/styles.css', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error building CSS: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`CSS build stderr: ${stderr}`);
    return;
  }
  console.log(`CSS build stdout: ${stdout}`);
});
