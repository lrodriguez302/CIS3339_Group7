const express = require('express');
const router = express.Router();

const authMiddleWare = require('../auth/authMiddleWare');
const { requireRole } = require('../auth/authMiddleWare');
const withOrg = require('../utils/withOrg');

const { services, events } = require('../models/models');

// GET all services for the authenticated organization
router.get('/', authMiddleWare, async (req, res, next) => {
  try {
    const data = await services.find(withOrg({}, req)).sort({ updatedAt: -1 });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET a single service by ID
router.get('/id/:id', authMiddleWare, async (req, res, next) => {
  try {
    const data = await services.findOne(withOrg({ _id: req.params.id }, req));

    if (!data) {
      return res.status(404).send('Service not found');
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET services matching a search query
router.get('/search', authMiddleWare, async (req, res, next) => {
  try {
    const dbQuery = {};

    switch (req.query.searchBy) {
      case 'name':
        dbQuery.name = {
          $regex: String(req.query.name || ''),
          $options: 'i'
        };
        break;

      case 'description':
        dbQuery.description = {
          $regex: String(req.query.description || ''),
          $options: 'i'
        };
        break;

      default:
        return res.status(400).send('invalid searchBy');
    }

    const data = await services.find(withOrg(dbQuery, req));

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST create a new service - editor only
router.post(
  '/',
  authMiddleWare,
  requireRole('editor'),
  async (req, res, next) => {
    try {
      const newService = {
        ...req.body,
        org: req.user.orgId
      };

      await services.create(newService);

      res.status(200).send('New service created successfully');
    } catch (error) {
      next(error);
    }
  }
);

// PUT update a service - editor only
router.put(
  '/update/:id',
  authMiddleWare,
  requireRole('editor'),
  async (req, res, next) => {
    try {
      const { org, _id, ...updates } = req.body;

      // Prevent changes to protected fields
      for (const key of Object.keys(updates)) {
        if (
          key.startsWith('$') ||
          key.startsWith('org.') ||
          key === 'orgs' ||
          key.startsWith('orgs.') ||
          key === '__proto__' ||
          key === 'constructor' ||
          key === 'prototype'
        ) {
          return res.status(400).json({
            message: 'Invalid update field'
          });
        }
      }

      const data = await services.findOneAndUpdate(
        withOrg({ _id: req.params.id }, req),
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!data) {
        return res.status(404).send('Service not found');
      }

      res.status(200).send('Service updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// DELETE a service - editor only
router.delete(
  '/:id',
  authMiddleWare,
  requireRole('editor'),
  async (req, res, next) => {
    try {
      const service = await services.findOne(
        withOrg({ _id: req.params.id }, req)
      );

      if (!service) {
        return res.status(404).send('Service not found');
      }

      // Do not delete a service used by events
      const serviceEvents = await events.find(
        withOrg({ services: service._id }, req)
      );

      if (serviceEvents.length > 0) {
        return res
          .status(400)
          .send('Service can not be deleted since it is being used by events.');
      }

      const deleted = await services.findOneAndDelete(
        withOrg({ _id: service._id }, req)
      );

      if (!deleted) {
        return res.status(404).send('Service not found');
      }

      res.status(200).send('Service deleted successfully');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
