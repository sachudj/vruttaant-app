const LoadTestRun = require('../models/LoadTestRun');
const { isDatabaseConnected } = require('../health/readiness');
const { AppError } = require('../middleware/errorHandler');

function getRangeStart(rangeDays) {
  const now = Date.now();
  return new Date(now - rangeDays * 24 * 60 * 60 * 1000);
}

function normalizeEnvironment(value) {
  return String(value || 'local').trim().toLowerCase();
}

async function createLoadTestRun(req, res, next) {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        error: { message: 'Service temporarily unavailable.' },
        statusCode: 503
      });
    }

    const payload = req.body || {};

    if (!payload.baseUrl || !payload.summary || !Array.isArray(payload.scenarios)) {
      throw new AppError(400, 'Invalid load-test payload. baseUrl, summary, and scenarios are required.');
    }

    const run = await LoadTestRun.create({
      environment: normalizeEnvironment(payload.environment),
      source: payload.source || 'manual',
      appVersion: payload.appVersion || '',
      baseUrl: payload.baseUrl,
      durationSeconds: Number(payload.durationSeconds || 0),
      connections: Number(payload.connections || 0),
      overallRate: Number(payload.overallRate || 0),
      strictSlo: Boolean(payload.strictSlo),
      sloTargets: payload.sloTargets || {},
      scenarios: payload.scenarios,
      summary: payload.summary,
      capturedAt: payload.capturedAt ? new Date(payload.capturedAt) : new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Load-test run stored successfully.',
      data: {
        runId: run._id,
        environment: run.environment,
        capturedAt: run.capturedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getLoadTestHistory(req, res, next) {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        error: { message: 'Service temporarily unavailable.' },
        statusCode: 503
      });
    }

    const environment = req.query.environment ? normalizeEnvironment(req.query.environment) : undefined;
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const rangeDays = Math.min(Math.max(Number(req.query.rangeDays || 30), 1), 180);

    const query = {
      capturedAt: { $gte: getRangeStart(rangeDays) }
    };

    if (environment) {
      query.environment = environment;
    }

    const runs = await LoadTestRun.find(query)
      .sort({ capturedAt: -1 })
      .limit(limit)
      .select('environment source appVersion baseUrl summary capturedAt scenarios.key scenarios.latencyP95Ms scenarios.requestsPerSecond scenarios.errorRatePercent')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        environment: environment || 'all',
        rangeDays,
        count: runs.length,
        runs
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getLoadTestTrends(req, res, next) {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        error: { message: 'Service temporarily unavailable.' },
        statusCode: 503
      });
    }

    const environment = req.query.environment ? normalizeEnvironment(req.query.environment) : undefined;
    const rangeDays = Math.min(Math.max(Number(req.query.rangeDays || 30), 1), 180);

    const match = {
      capturedAt: { $gte: getRangeStart(rangeDays) }
    };

    if (environment) {
      match.environment = environment;
    }

    const runs = await LoadTestRun.find(match)
      .sort({ capturedAt: 1 })
      .select('environment summary scenarios capturedAt')
      .lean();

    const totalRuns = runs.length;
    const passingRuns = runs.filter((run) => Number(run.summary?.failedChecks || 0) === 0).length;
    const passRatePercent = totalRuns > 0 ? (passingRuns / totalRuns) * 100 : 0;

    const scenarioMap = new Map();
    for (const run of runs) {
      for (const scenario of run.scenarios || []) {
        const key = scenario.key || 'unknown';
        const current = scenarioMap.get(key) || {
          key,
          samples: 0,
          avgLatencyP95Ms: 0,
          avgRequestsPerSecond: 0,
          avgErrorRatePercent: 0
        };

        current.samples += 1;
        current.avgLatencyP95Ms += Number(scenario.latencyP95Ms || 0);
        current.avgRequestsPerSecond += Number(scenario.requestsPerSecond || 0);
        current.avgErrorRatePercent += Number(scenario.errorRatePercent || 0);
        scenarioMap.set(key, current);
      }
    }

    const scenarioTrends = Array.from(scenarioMap.values()).map((entry) => ({
      key: entry.key,
      samples: entry.samples,
      avgLatencyP95Ms: entry.samples > 0 ? Number((entry.avgLatencyP95Ms / entry.samples).toFixed(2)) : 0,
      avgRequestsPerSecond: entry.samples > 0 ? Number((entry.avgRequestsPerSecond / entry.samples).toFixed(2)) : 0,
      avgErrorRatePercent: entry.samples > 0 ? Number((entry.avgErrorRatePercent / entry.samples).toFixed(2)) : 0
    }));

    const latestRun = runs[totalRuns - 1] || null;

    res.status(200).json({
      success: true,
      data: {
        environment: environment || 'all',
        rangeDays,
        overview: {
          totalRuns,
          passingRuns,
          passRatePercent: Number(passRatePercent.toFixed(2))
        },
        latestRun: latestRun
          ? {
            capturedAt: latestRun.capturedAt,
            environment: latestRun.environment,
            failedChecks: latestRun.summary?.failedChecks || 0
          }
          : null,
        scenarioTrends
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createLoadTestRun,
  getLoadTestHistory,
  getLoadTestTrends
};