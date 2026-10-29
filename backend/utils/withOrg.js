function withOrg(filter, req, field = 'org') {
  if (!req.user || !req.user.orgId) {
    throw new Error('Authenticated organization is required');
  }
  return {
    $and: [{ [field]: req.user.orgId }, filter]
  };
}
module.exports = withOrg;
