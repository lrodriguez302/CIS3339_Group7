const mongoose = require('mongoose');

function withOrg(filter, req, field = 'org') {
  if (!req.user || !req.user.orgId) {
    throw new Error('Authenticated organization is required');
  }
  let orgId;
  try {
    orgId = new mongoose.Types.ObjectId(req.user.orgId);
  } catch (error) {
    throw new Error('Authenticated organization is invalid');
  }
  return {
    ...filter,
    [field]: orgId
  };
}
module.exports = withOrg;
