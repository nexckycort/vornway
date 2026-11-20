const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_SOURCE_SKIPS, SourceSkips } = require('expo/fingerprint');

// Expo ignores `version`, so an OTA from main would reach every older store
// binary. Hashing the major keeps each major's OTAs on its own binaries.
const appConfig = fs.readFileSync(
  path.join(__dirname, 'app.config.ts'),
  'utf8',
);
const majorVersion = appConfig.match(/^ {2}version: '(\d+)\.\d+\.\d+',$/m)?.[1];
if (!majorVersion) {
  throw new Error(
    'fingerprint.config.js could not read the version from app.config.ts',
  );
}

/** @type {import('expo/fingerprint').Config} */
module.exports = {
  // Replaces the preset's skips, so keep the defaults. `extra` carries
  // per-environment values that ship with each OTA.
  sourceSkips: DEFAULT_SOURCE_SKIPS | SourceSkips.ExpoConfigExtraSection,
  extraSources: [
    { type: 'contents', id: 'appMajorVersion', contents: majorVersion },
  ],
};
