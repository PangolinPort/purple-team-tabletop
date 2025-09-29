const Audit = require('../models/audit');

function redact(details) {
  try {
    const json = JSON.parse(JSON.stringify(details || {}));
    const walk = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (typeof v === 'string') {
          if (/bearer\s+[a-z0-9\-\._]+/i.test(v)) obj[k] = '[REDACTED_TOKEN]';
          if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
            const [u, d] = v.split('@'); obj[k] = u[0] + '***@' + d;
          }
        } else if (typeof v === 'object') walk(v);
      }
    };
    walk(json);
    let s = JSON.stringify(json);
    if (s.length > 4000) s = s.slice(0, 4000) + '...';
    return JSON.parse(s);
  } catch { return {}; }
}

async function appendAudit({ userId, action, target, details }) {
  const payload = {
    userId: userId || null,
    action, target, details: redact(details)
  };
  let prev = await Audit.findOne().sort({ ts: -1 }).lean();
  const entry = new Audit({ ...payload, prevHash: prev ? prev.hash : null });
  try {
    await entry.save();
  } catch (e) {
    console.error('audit save failed', e.message);
  }
}

module.exports = { appendAudit };
