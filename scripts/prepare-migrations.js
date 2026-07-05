import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('docs/supabase/migrations');
const destDir = path.resolve('supabase/migrations');

function getSqlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getSqlFiles(filePath));
    } else if (file.endsWith('.sql')) {
      results.push({
        name: file,
        path: filePath
      });
    }
  });
  return results;
}

async function run() {
  console.log(`Scanning migrations in: ${srcDir}`);
  if (!fs.existsSync(srcDir)) {
    console.error(`Error: Source migrations directory does not exist: ${srcDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`Created destination directory: ${destDir}`);
  }

  const files = getSqlFiles(srcDir);
  console.log(`Found ${files.length} SQL migration files.`);

  // Sort by filename to ensure correct execution order
  files.sort((a, b) => {
    const numA = parseInt(a.name.split('_')[0], 10);
    const numB = parseInt(b.name.split('_')[0], 10);
    if (numA !== numB) {
      return numA - numB;
    }
    return a.name.localeCompare(b.name);
  });

  let copiedCount = 0;
  for (const file of files) {
    const targetPath = path.join(destDir, file.name);
    fs.copyFileSync(file.path, targetPath);
    console.log(`Copied: ${file.name}`);
    copiedCount++;
  }

  console.log(`\n✔ Successfully copied ${copiedCount} migration files to ${destDir}`);
}

run().catch(err => {
  console.error('Error during migrations preparation:', err);
  process.exit(1);
});
