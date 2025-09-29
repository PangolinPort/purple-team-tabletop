const express = require('express');
const mongoose = require('mongoose');
const Scenario = require('../models/scenario');
const { authenticate, authorize } = require('../middleware/auth');
const { validateScenario } = require('../middleware/validate');
const { useRateLimit } = require('../middleware/rateLimiterRedis');

const router = express.Router();
const { appendAudit } = require('../utils/audit');

// Create
router.post('/', authenticate, useRateLimit(120, 60 * 60), validateScenario, async (req, res) => {
  try {
    const { title, description, steps, retentionDays } = req.body;
    const scenario = await Scenario.create({
      owner: req.user.id,
      title, description, steps, retentionDays
    });
    await appendAudit({ userId: req.user.id, action: 'scenario_create', target: scenario._id.toString(), details: { title } });
    return res.status(201).json({ scenario });
  } catch (err) {
    console.error('create scenario error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// List (own scenarios unless admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { owner: req.user.id };
    const scenarios = await Scenario.find(filter).sort({ updatedAt: -1 }).limit(200);
    return res.json({ scenarios });
  } catch (err) {
    console.error('list scenarios error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    const scenario = await Scenario.findById(id);
    if (!scenario) return res.status(404).json({ error: 'Not found' });
    if (scenario.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.json({ scenario });
  } catch (err) {
    console.error('get scenario error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
