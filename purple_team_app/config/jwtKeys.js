const fs = require('fs');

/**
 * Load HS256 keys from env JSON mapping: JWT_KEYS_JSON='{"kid1":"secret1","kid2":"secret2"}'
 * Active kid in ACTIVE_JWT_KID. Falls back to JWT_SECRET if provided (kid 'default').
 */
function loadKeys() {
  const map = {};
  if (process.env.JWT_KEYS_JSON) {
    try {
      const obj = JSON.parse(process.env.JWT_KEYS_JSON);
      Object.entries(obj).forEach(([kid, secret]) => { map[kid] = secret; });
    } catch (e) {
      console.error('Invalid JWT_KEYS_JSON', e.message);
    }
  }
  if (process.env.JWT_SECRET) {
    map['default'] = process.env.JWT_SECRET;
    if (!process.env.ACTIVE_JWT_KID) process.env.ACTIVE_JWT_KID = 'default';
  }
  return map;
}

function getActiveKid() {
  return process.env.ACTIVE_JWT_KID || 'default';
}

function getSecretByKid(kid) {
  const keys = loadKeys();
  return keys[kid];
}

module.exports = { loadKeys, getActiveKid, getSecretByKid };
