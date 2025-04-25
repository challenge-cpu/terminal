const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public')); // Serve static files (e.g., index.html)

// Simulated file system
const fileSystem = {
  '/home': { dirs: ['logs', 'user'], files: { 'readme.txt': 'System status: Vulnerable. Check logs or user directories for admin traces.' } },
  '/home/logs': { dirs: [], files: { 'access.log': '2025-04-25 14:30:01 admin login from 192.168.1.10\n2025-04-25 14:31:22 admin created key in /home/user', 'flag.txt': 'PeshwasCTF{y0u_g0t_e@t}' } },
  '/home/user': { dirs: ['docs'], files: { 'note.txt': 'Reminder: Key is "unlock123". Sensitive data moved to docs/' } },
  '/home/user/docs': { dirs: [], files: { 'decoy.txt': 'Dead end. No flags here.', 'secret.txt': 'Access restricted. Authentication required.' } }
};

const realFlag = 'PeshwasCTF{t3rmin@l_F1l3s_4r3_Fun}';
let sessions = {}; // Store session state (current path, key status)

// Simplified ls output
function listDir(dir) {
  const dirs = dir.dirs.length ? `Directories: ${dir.dirs.join(', ')}` : '';
  const files = Object.keys(dir.files).length ? `Files: ${Object.keys(dir.files).join(', ')}` : '';
  return [dirs, files].filter(Boolean).join('\n') || 'Nothing here';
}

// API endpoint for commands
app.post('/api/command', (req, res) => {
  const { sessionId, command } = req.body;
  
  // Initialize session if new
  if (!sessions[sessionId]) {
    sessions[sessionId] = { currentPath: '/home', keyUsed: false };
  }
  const session = sessions[sessionId];
  const currentDir = fileSystem[session.currentPath];
  const [cmd, ...args] = command.trim().split(' ');
  let output = [];

  if (cmd === 'ls') {
    output.push(listDir(currentDir));
  } else if (cmd === 'cd' && args[0]) {
    const newPath = args[0] === '..' ? session.currentPath.split('/').slice(0, -1).join('/') || '/home' : `${session.currentPath}/${args[0]}`;
    if (fileSystem[newPath]) {
      session.currentPath = newPath;
    } else {
      output.push(`bash: cd: ${args[0]}: No such directory`);
    }
  } else if (cmd === 'cat' && args[0]) {
    const file = currentDir.files[args[0]];
    if (file) {
      if (args[0] === 'secret.txt' && !session.keyUsed) {
        output.push('cat: secret.txt: Permission denied (key required)');
      } else if (args[0] === 'secret.txt' && session.keyUsed) {
        output.push(realFlag);
      } else {
        output.push(file);
      }
    } else {
      output.push(`cat: ${args[0]}: No such file`);
    }
  } else if (cmd === 'pwd') {
    output.push(session.currentPath);
  } else if (cmd === 'help') {
    output.push('Commands: ls, cd <dir>, cat <file>, pwd');
    output.push('Note: This server is compromised. Look for admin clues.');
  } else if (cmd === 'unlock123' && session.currentPath === '/home/user/docs') {
    if (!session.keyUsed) {
      output.push('Key accepted. Access granted to secret.txt');
      session.keyUsed = true;
    } else {
      output.push('Key already used.');
    }
  } else if (cmd) {
    output.push(`bash: ${cmd}: command not found`);
  }

  res.json({ currentPath: session.currentPath, output });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});