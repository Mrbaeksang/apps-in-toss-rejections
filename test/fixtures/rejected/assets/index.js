const sdkUrl = 'https://cdn.portone.io/v2/browser-sdk.js';
function share(code) { return `intoss-private://my-app?invite=${code}`; }
function embed() { const frame = document.createElement('iframe'); frame.src = 'https://example.com'; document.body.append(frame); }
function leave() { window.location.replace('https://my-own-site.example/home'); }
const install = 'https://play.google.com/store/apps/details?id=com.example';
const run = text => eval(text);
