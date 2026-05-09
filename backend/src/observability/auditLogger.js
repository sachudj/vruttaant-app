function logAuditEvent(event, context = {}) {
  try {
    console.log(
      JSON.stringify({
        level: 'audit',
        event,
        ...context,
        timestamp: new Date().toISOString()
      })
    );
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  logAuditEvent
};
