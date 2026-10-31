const express = require('express');
const router = express.Router();

const authMiddleWare = require('../auth/authMiddleWare');
const { requireRole } = require('../auth/authMiddleWare');
const withOrg = require('../utils/withOrg');

const { events, clients } = require('../models/models');

// GET all events for the authenticated organization
router.get('/', authMiddleWare, async (req, res, next) => {
  try {
    const data = await events.find(withOrg({}, req)).sort({ date: -1 });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET a single event
router.get('/id/:id', authMiddleWare, async (req, res, next) => {
  try {
    const data = await events.findOne(withOrg({ _id: req.params.id }, req));

    if (!data) {
      return res.status(404).send('Event not found');
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET events matching a search query
router.get('/search/', authMiddleWare, async (req, res, next) => {
  try {
    const dbQuery = {};

    switch (req.query.searchBy) {
      case 'name':
        dbQuery.name = {
          $regex: String(req.query.name || ''),
          $options: 'i'
        };
        break;

      case 'date':
        dbQuery.date = req.query.eventDate;
        break;

      default:
        return res.status(400).send('invalid searchBy');
    }

    const data = await events.find(withOrg(dbQuery, req));
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET events a client is registered for
router.get('/client/:id', authMiddleWare, async (req, res, next) => {
  try {
    const client = await clients.findOne(
      withOrg({ _id: req.params.id }, req, 'orgs')
    );

    if (!client) {
      return res.status(404).send('Client not found');
    }

    const data = await events.find(withOrg({ attendees: client._id }, req));

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET events a client is not registered for
router.get(
  '/client/:id/not-registered',
  authMiddleWare,
  async (req, res, next) => {
    try {
      const client = await clients.findOne(
        withOrg({ _id: req.params.id }, req, 'orgs')
      );

      if (!client) {
        return res.status(404).send('Client not found');
      }

      const data = await events.find(
        withOrg({ attendees: { $nin: [client._id] } }, req)
      );

      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

// GET attendee details for an event
router.get('/attendees/:id', authMiddleWare, async (req, res, next) => {
  try {
    const event = await events.findOne(withOrg({ _id: req.params.id }, req));

    if (!event) {
      return res.status(404).send('Event not found');
    }

    const data = await clients.find(
      withOrg({ _id: { $in: event.attendees } }, req, 'orgs')
    );

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET events associated with a service
router.get('/service/:id', authMiddleWare, async (req, res, next) => {
  try {
    const data = await events
      .find(withOrg({ services: { $in: [req.params.id] } }, req))
      .select({
        _id: 1,
        name: 1,
        date: 1,
        'address.line1': 1
      })
      .lean();

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST create an event - editor only
router.post(
  '/',
  authMiddleWare,
  requireRole('editor'),
  async (req, res, next) => {
    try {
      const newEvent = {
        ...req.body,
        org: req.user.orgId
      };

      await events.create(newEvent);

      res.status(200).send('New event created successfully');
    } catch (error) {
      next(error);
    }
  }
);

// PUT update an event - editor only
router.put(
  '/update/:id',
  authMiddleWare,
  requireRole('editor'),
  async (req, res, next) => {
    try {
      const { org, _id, ...updates } = req.body;

      // Reject protected fields and update operators
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

      const data = await events.findOneAndUpdate(
        withOrg({ _id: req.params.id }, req),
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!data) {
        return res.status(404).send('Event not found');
      }

      res.status(200).send('Event updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// PUT register a client for an event - editor only
router.put(
  '/register',
  authMiddleWare,
  requireRole('editor'),
  async (req, res, next) => {
    try {
      const client = await clients.findOne(
        withOrg({ _id: req.query.client }, req, 'orgs')
      );

      if (!client) {
        return res.status(404).send('Client not found');
      }

      const event = await events.findOne(
        withOrg({ _id: req.query.event }, req)
      );

      if (!event) {
        return res.status(404).send('Event not found');
      }

      if (event.attendees.some((id) => id.equals(client._id))) {
        return res.status(200).json({ message: 'Already registered' });
      }

      const updated = await events.findOneAndUpdate(
        withOrg(
          {
            _id: event._id,
            attendees: { $ne: client._id }
          },
          req
        ),
        { $addToSet: { attendees: client._id } },
        { new: true }
      );

      if (!updated) {
        return res.status(200).json({ message: 'Already registered' });
      }

      res.status(200).send('Client added to event');
    } catch (error) {
      next(error);
    }
  }
);

// PUT deregister a client from an event - editor only
router.put(
  '/deregister',
  authMiddleWare,
  requireRole('editor'),
  async (req, res, next) => {
    try {
      const client = await clients.findOne(
        withOrg({ _id: req.query.client }, req, 'orgs')
      );

      if (!client) {
        return res.status(404).send('Client not found');
      }

      const event = await events.findOne(
        withOrg({ _id: req.query.event }, req)
      );

      if (!event) {
        return res.status(404).send('Event not found');
      }

      const isRegistered = event.attendees.some((id) =>
        id.equals(client._id)
      );

      await events.findOneAndUpdate(withOrg({ _id: event._id }, req), {
        $pull: { attendees: client._id }
      });

      await clients.findOneAndUpdate(
        withOrg({ _id: client._id }, req, 'orgs'),
        { $pull: { events: event._id } }
      );

      if (!isRegistered) {
        return res.status(200).json({ message: 'Not registered' });
      }

      res.status(200).send('Client deregistered with event');
    } catch (error) {
      next(error);
    }
  }
);

// DELETE event - editor only
router.delete(
  '/:id',
  authMiddleWare,
  requireRole('editor'),
  async (req, res, next) => {
    try {
      const event = await events.findOne(withOrg({ _id: req.params.id }, req));

      if (!event) {
        return res.status(404).send('Event not found');
      }

      if (event.attendees.length > 0) {
        return res
          .status(400)
          .send("Event has attendees and can't be deleted.");
      }

      const deleted = await events.findOneAndDelete(
        withOrg({ _id: event._id, attendees: { $size: 0 } }, req)
      );

      if (!deleted) {
        return res.status(409).send('Event could not be deleted');
      }

      res.status(200).send('Event deleted successfully');
    } catch (error) {
      next(error);
    }
  }
);

// GET event attendance for the past two months
router.get('/attendance', authMiddleWare, async (req, res, next) => {
  try {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const data = await events
      .find(withOrg({ date: { $gte: twoMonthsAgo } }, req))
      .sort({ date: 1 });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
