const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(projectRoot, 'android', 'build', 'generated', 'autolinking');
const outFile = path.join(outDir, 'autolinking.json');

fs.mkdirSync(outDir, { recursive: true });

execFile('npx', ['@react-native-community/cli', 'config'], { cwd: projectRoot }, (err, stdout) => {
  if (err) {
    console.error('[DEBUG_LOG] Failed to run RN CLI config:', err.message);
    process.exit(1);
  }
  try {
    const parsed = JSON.parse(stdout);
    // Quick sanity check
    if (!parsed.project || !parsed.project.android || !parsed.project.android.packageName) {
      console.error('[DEBUG_LOG] RN CLI output missing project.android.packageName');
      process.exit(1);
    }
  } catch (e) {
    console.error('[DEBUG_LOG] Invalid JSON from RN CLI:', e.message);
    console.error(stdout);
    process.exit(1);
  }
  fs.writeFileSync(outFile, stdout);
  console.log('[DEBUG_LOG] autolinking.json updated at', outFile);
});
