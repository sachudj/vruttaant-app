const autocannon = require('autocannon');

const DEFAULT_BASE_URL = process.env.LOADTEST_BASE_URL || 'http://127.0.0.1:5001';
const DEFAULT_DURATION_SECONDS = Number(process.env.LOADTEST_DURATION_SECONDS || 20);
const DEFAULT_CONNECTIONS = Number(process.env.LOADTEST_CONNECTIONS || 4);
const DEFAULT_OVERALL_RATE = Number(process.env.LOADTEST_OVERALL_RATE || 3);
const STRICT_SLO = String(process.env.LOADTEST_STRICT_SLO || 'false').toLowerCase() === 'true';
const ACCESS_TOKEN = process.env.LOADTEST_ACCESS_TOKEN || '';

const SLO_TARGETS = {
  cardsReadP95Ms: Number(process.env.SLO_CARDS_READ_P95_MS || 350),
  translateP95Ms: Number(process.env.SLO_TRANSLATE_P95_MS || 1200),
  authReadP95Ms: Number(process.env.SLO_AUTH_READ_P95_MS || 500),
  maxErrorRatePercent: Number(process.env.SLO_MAX_ERROR_RATE_PERCENT || 1),
  cardsReadMinRps: Number(process.env.SLO_CARDS_READ_MIN_RPS || 2),
  translateMinRps: Number(process.env.SLO_TRANSLATE_MIN_RPS || 2),
  authReadMinRps: Number(process.env.SLO_AUTH_READ_MIN_RPS || 2)
};

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return value.toFixed(digits);
}

function printHeader(title) {
  console.log('\n============================================================');
  console.log(title);
  console.log('============================================================');
}

function evaluateSlo(result, scenarioName, p95Target, minRpsTarget) {
  const requests = result.requests?.average || 0;
  const totalRequests = Math.max(result.requests?.total || 0, 1);
  const unsuccessful = (result.non2xx || 0) + (result.errors || 0) + (result.timeouts || 0);
  const errorRate = (unsuccessful / totalRequests) * 100;
  const p95 = result.latency?.p95 || 0;

  const checks = [
    {
      label: `${scenarioName} p95 latency <= ${p95Target}ms`,
      passed: p95 <= p95Target,
      actual: `${formatNumber(p95, 0)}ms`
    },
    {
      label: `${scenarioName} avg throughput >= ${minRpsTarget} rps`,
      passed: requests >= minRpsTarget,
      actual: `${formatNumber(requests)} rps`
    },
    {
      label: `${scenarioName} error rate <= ${SLO_TARGETS.maxErrorRatePercent}%`,
      passed: errorRate <= SLO_TARGETS.maxErrorRatePercent,
      actual: `${formatNumber(errorRate)}% (${unsuccessful} non-2xx/errors/timeouts)`
    }
  ];

  return {
    checks,
    summary: {
      requestsPerSecond: requests,
      latencyP95Ms: p95,
      errorRatePercent: errorRate
    }
  };
}

function runAutocannonScenario(options) {
  return new Promise((resolve, reject) => {
    autocannon(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });
  });
}

async function ensureReadiness(baseUrl) {
  const response = await fetch(`${baseUrl}/ready`);
  if (response.status !== 200) {
    const body = await response.text();
    throw new Error(`/ready returned ${response.status}. Body: ${body}`);
  }
}

async function main() {
  printHeader('Vruttaant Backend Load-Test Baseline');
  console.log(`Base URL: ${DEFAULT_BASE_URL}`);
  console.log(`Duration (seconds): ${DEFAULT_DURATION_SECONDS}`);
  console.log(`Connections: ${DEFAULT_CONNECTIONS}`);
  console.log(`Overall request rate cap: ${DEFAULT_OVERALL_RATE} req/s`);
  console.log(`Strict SLO mode: ${STRICT_SLO}`);

  console.log('\nChecking readiness...');
  await ensureReadiness(DEFAULT_BASE_URL);
  console.log('Readiness OK.');

  const scenarioConfigs = [
    {
      key: 'cards_read',
      label: 'Cards Read API',
      request: {
        url: `${DEFAULT_BASE_URL}/api/v1/news/cards?language=en&page=1&limit=20&sort=latest`,
        method: 'GET'
      },
      p95Target: SLO_TARGETS.cardsReadP95Ms,
      minRpsTarget: SLO_TARGETS.cardsReadMinRps
    },
    {
      key: 'translate',
      label: 'Translate API',
      request: {
        url: `${DEFAULT_BASE_URL}/api/v1/news/translate`,
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Global markets rally on renewed growth outlook',
          summary: 'Equity markets moved higher as investors reacted to fresh economic data and corporate earnings signals.',
          source: 'Load Test Fixture',
          url: 'https://example.com/loadtest-story',
          sourceLanguage: 'en',
          targetLanguage: 'hi'
        })
      },
      p95Target: SLO_TARGETS.translateP95Ms,
      minRpsTarget: SLO_TARGETS.translateMinRps
    }
  ];

  if (ACCESS_TOKEN.trim()) {
    scenarioConfigs.push({
      key: 'bookmarks_auth_read',
      label: 'Bookmarks Auth Read API',
      request: {
        url: `${DEFAULT_BASE_URL}/api/v1/user/bookmarks?language=en&page=1&limit=20`,
        method: 'GET',
        headers: {
          authorization: `Bearer ${ACCESS_TOKEN.trim()}`
        }
      },
      p95Target: SLO_TARGETS.authReadP95Ms,
      minRpsTarget: SLO_TARGETS.authReadMinRps
    });
  } else {
    console.log('\nSkipping authenticated scenario (LOADTEST_ACCESS_TOKEN not set).');
  }

  const allChecks = [];

  for (const scenario of scenarioConfigs) {
    printHeader(`Scenario: ${scenario.label}`);
    const result = await runAutocannonScenario({
      ...scenario.request,
      connections: DEFAULT_CONNECTIONS,
      duration: DEFAULT_DURATION_SECONDS,
      overallRate: DEFAULT_OVERALL_RATE,
      pipelining: 1
    });

    const evaluated = evaluateSlo(
      result,
      scenario.label,
      scenario.p95Target,
      scenario.minRpsTarget
    );

    console.log('\nSLO Check Results:');
    for (const check of evaluated.checks) {
      const status = check.passed ? 'PASS' : 'FAIL';
      console.log(`- [${status}] ${check.label} (actual: ${check.actual})`);
      allChecks.push(check);
    }
  }

  const failedChecks = allChecks.filter((check) => !check.passed);

  printHeader('Baseline Summary');
  console.log(`Total checks: ${allChecks.length}`);
  console.log(`Passed: ${allChecks.length - failedChecks.length}`);
  console.log(`Failed: ${failedChecks.length}`);

  if (failedChecks.length) {
    console.log('\nFailed checks:');
    for (const check of failedChecks) {
      console.log(`- ${check.label} (actual: ${check.actual})`);
    }
  }

  if (STRICT_SLO && failedChecks.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('\nLoad-test baseline failed to run.');
  console.error(error.message || error);
  process.exitCode = 1;
});
