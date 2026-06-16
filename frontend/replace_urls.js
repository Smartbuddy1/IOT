const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(srcDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace 'http://localhost:5005/api/...' -> `${import.meta.env.VITE_API_BASE_URL}/...`
  content = content.replace(/'http:\/\/localhost:5005\/api([^']*)'/g, '`${import.meta.env.VITE_API_BASE_URL}$1`');
  
  // Replace "http://localhost:5005/api/..." -> `${import.meta.env.VITE_API_BASE_URL}/...`
  content = content.replace(/"http:\/\/localhost:5005\/api([^"]*)"/g, '`${import.meta.env.VITE_API_BASE_URL}$1`');

  // Replace `http://localhost:5005/api/...` -> `${import.meta.env.VITE_API_BASE_URL}/...`
  content = content.replace(/`http:\/\/localhost:5005\/api([^`]*)`/g, '`${import.meta.env.VITE_API_BASE_URL}$1`');

  // Replace 'http://localhost:5005/uploads...' -> `${import.meta.env.VITE_SERVER_URL}/uploads...`
  content = content.replace(/'http:\/\/localhost:5005\/uploads([^']*)'/g, '`${import.meta.env.VITE_SERVER_URL}/uploads$1`');
  
  // Replace "http://localhost:5005/uploads..." -> `${import.meta.env.VITE_SERVER_URL}/uploads...`
  content = content.replace(/"http:\/\/localhost:5005\/uploads([^"]*)"/g, '`${import.meta.env.VITE_SERVER_URL}/uploads$1`');
  
  // Replace `http://localhost:5005/uploads...` -> `${import.meta.env.VITE_SERVER_URL}/uploads...`
  content = content.replace(/`http:\/\/localhost:5005\/uploads([^`]*)`/g, '`${import.meta.env.VITE_SERVER_URL}/uploads$1`');

  // Replace `http://localhost:5005${user.logo}` -> `${import.meta.env.VITE_SERVER_URL}${user.logo}`
  content = content.replace(/`http:\/\/localhost:5005(\$\{[^}]+\})`/g, '`${import.meta.env.VITE_SERVER_URL}$1`');

  // Any remaining naked http://localhost:5005 without backticks in JSX src
  content = content.replace(/'http:\/\/localhost:5005([^']*)'/g, '`${import.meta.env.VITE_SERVER_URL}$1`');
  content = content.replace(/"http:\/\/localhost:5005([^"]*)"/g, '`${import.meta.env.VITE_SERVER_URL}$1`');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
  }
});
