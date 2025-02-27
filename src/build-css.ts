import { mkdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

async function buildCSS() {
  try {
    // Ensure dist directory exists
    const distDir = join(import.meta.dir, '..', 'dist');
    if (!existsSync(distDir)) {
      await mkdir(distDir, { recursive: true });
    }

    // Copy HTML file
    await copyFile(
      join(import.meta.dir, 'index.html'),
      join(distDir, 'index.html')
    );
    
    // Copy CSS file directly
    await copyFile(
      join(import.meta.dir, 'styles.css'),
      join(distDir, 'styles.css')
    );
    
    console.log('CSS and HTML files copied successfully');
  } catch (error) {
    console.error('Error building CSS:', error);
  }
}

buildCSS();
