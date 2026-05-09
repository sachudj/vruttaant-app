const deterministicLlmResponses = {
  validJson: {
    choices: [
      {
        message: {
          content: JSON.stringify({
            summary: 'Public transit expansion moves forward with budget controls and staged delivery milestones.',
            category: 'business'
          })
        }
      }
    ]
  },
  plainText: {
    choices: [
      {
        message: {
          content: 'This is plain text from the model and not valid JSON.'
        }
      }
    ]
  }
};

function createFetchOkJson(payload) {
  return {
    ok: true,
    json: async () => payload
  };
}

function createFetchError(status = 500) {
  return {
    ok: false,
    status,
    json: async () => ({})
  };
}

module.exports = {
  deterministicLlmResponses,
  createFetchOkJson,
  createFetchError
};
