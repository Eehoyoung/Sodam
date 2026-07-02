const { readConfigFromDisk } = require('@react-native-community/cli-config/build/readConfigFromDisk');
const path = require('path');

try {
  const androidDir = path.resolve(__dirname, '..', 'android');
  const config = readConfigFromDisk(androidDir);
  console.log(JSON.stringify(config, null, 2));
} catch (e) {
  console.error('[DEBUG_LOG] Failed to read RN config:', e && e.message ? e.message : e);
  process.exit(1);
}
