// Metro config — extend Expo defaults to bundle the pdf.js builds (shipped as .txt assets under
// assets/pdfjs/) so the on-device PDF text extractor (WebView + pdf.js) works offline, no CDN.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts = [...config.resolver.assetExts, 'txt'];

module.exports = config;
