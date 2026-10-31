// This file stores all the API endpoints for making calls to the "clients" collection in the MongoDB database

// Import functionalities
const express = require('express');
const router = express.Router();
const { Types } = require('mongoose');
// Middleware for authorization. For API calls that require authorization, this middleware checks if the header of API calls have a valid security token. If no security token or invalid security token, then the API call is not made.
const authMiddleWare = require('../auth/authMiddleWare');
const { requireRole } = require('../auth/authMiddleWare');
const withOrg = require('../utils/withOrg');
// importing data model schemas
const { clients, events } = require('../models/models');
// API Endpoint to Get all clients
router.get('/', authMiddleWare, async (req, res, next) => {
  try {
    const cli = await clients.find(withOrg({}, req, 'orgs'));
    res.json(cli);
  } catch (err) {
    next(err);
  }
});

router.get('/id/:id', authMiddleWare, async (req, res, next) => {
  try {
    const data = await clients.findOne(
      withOrg({ _id: req.params.id }, req, 'orgs')
    );

    if (!data) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// API endpoint to GET entries based on search query
// Ex: '...?firstName=Bob&lastName=&searchBy=name'
router.get('/search', authMiddleWare, async (req, res, next) => {
  let queryArray = [];
  let regexOptions = 'i';

  switch (req.query.searchBy) {
    case 'name':
      if (req.query.firstName) {
        const firstNameRegex = new RegExp(
          `.*${req.query.firstName}.*`,
          regexOptions
        );
        queryArray.push({ firstName: { $regex: firstNameRegex } });
      }
      if (req.query.lastName) {
        const lastNameRegex = new RegExp(
          `.*${req.query.lastName}.*`,
          regexOptions
        );
        queryArray.push({ lastName: { $regex: lastNameRegex } });
      }
      break;
    case 'number':
      if (req.query.phoneNumber) {
        const phoneNumberRegex = new RegExp(
          `.*${req.query.phoneNumber}.*`,
          regexOptions
        );
        queryArray.push({
          'phoneNumber.primary': { $regex: phoneNumberRegex }
        });
      }
      break;
    default:
      return res.status(400).send('invalid searchBy');
  }

  try {
    const searchFilter = queryArray.length > 0 ? { $and: queryArray } : {};

    const data = await clients.find(withOrg(searchFilter, req, 'orgs'));

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST create new client
router.post(
  '/',
  authMiddleWare,
  requireRole('editor'),
  async (req, res, next) => {
    try {
      const newClient = {
        ...req.body,
        orgs: [req.user.orgId]
      };

      await clients.create(newClient);

      res.status(200).send('New client created successfully');
    } catch (error) {
      next(error);
    }
  }
);

// API endpoint to PUT update client

router.put(
  '/update/:id',
  authMiddleWare,
  requireRole('editor'),
  async (req, res, next) => {
    try {
      const { orgs, _id, ...updates } = req.body;

      // Prevent changes to protected fields
      for (const key of Object.keys(updates)) {
        if (
          key.startsWith('$') ||
          key === 'org' ||
          key.startsWith('org.') ||
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

      const data = await clients.findOneAndUpdate(
        withOrg({ _id: req.params.id }, req, 'orgs'),
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!data) {
        return res.status(404).json({ message: 'Client not found' });
      }

      res.status(200).send('Client updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// API endpoint to hard delete client by ID
router.delete(
  '/:id',
  authMiddleWare,
  requireRole('editor'),
  async (req, res, next) => {
    try {
      const client = await clients.findOne(
        withOrg({ _id: req.params.id }, req, 'orgs')
      );

      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }

      const registeredEvents = await events.find(
        withOrg({ attendees: client._id }, req)
      );

      if (registeredEvents.length > 0) {
        return res
          .status(406)
          .send("Client is signed up for events and can't be deleted.");
      }

      const deletedClient = await clients.findOneAndDelete(
        withOrg({ _id: client._id }, req, 'orgs')
      );

      if (!deletedClient) {
        return res.status(404).json({ message: 'Client not found' });
      }

      res.status(200).send('Client deleted successfully');
    } catch (error) {
      next(error);
    }
  }
);

// GET clients by zip code for dashboard
router.get('/byzip', authMiddleWare, async (req, res, next) => {
  try {
    const data = await clients.aggregate([
      {
        $match: withOrg(
          { 'address.zip': { $exists: true, $ne: '' } },
          { user: { orgId: new Types.ObjectId(req.user.orgId) } },
          'orgs'
        )
      },
      {
        $group: {
          _id: '$address.zip',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
