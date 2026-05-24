#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    inputDir: 'backend/loadtest-results',
    outputFile: 'backend/loadtest-results/summary.md',
    maxRunsPerEnv: 20
  };

  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--input' && argv[i + 1]) {
      args.inputDir = argv[i + 1];
      i += 1;
      continue;
    }

    if (current === '--output' && argv[i + 1]) {
      args.outputFile = argv[i + 1];
      i += 1;
      continue;
    }

    if (current === '--max-runs' && argv[i + 1]) {
      args.maxRunsPerEnv = Math.max(1, Number(argv[i + 1]) || 20);
      i += 1;
      continue;
    }
  }

  return args;
}

function walkJsonFiles(rootDir) {
  const collected = [];

  if (!fs.existsSync(rootDir)) {
    return collected;
  }

  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        collected.push(fullPath);
      }
    }
  }

  return collected;
}

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function summarize(runsByEnv, maxRunsPerEnv) {
  const overviewRows = [];
  const scenarioRows = [];

  const envNames = Object.keys(runsByEnv).sort();
  for (const env of envNames) {
    const runs = runsByEnv[env]
      .sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt))
      .slice(0, maxRunsPerEnv);

    const totalRuns = runs.length;
    const passingRuns = runs.filter((run) => toNumber(run.summary?.failedChecks) === 0).length;
    const passRatePercent = totalRuns > 0 ? round((passingRuns / totalRuns) * 100, 2) : 0;

    overviewRows.push({
      environment: env,
      totalRuns,
      passingRuns,
      passRatePercent,
      latestCapturedAt: runs[0]?.capturedAt || 'n/a'
    });

    const scenarioAccumulator = new Map();

    for (const run of runs) {
      const scenarios = Array.isArray(run.scenarios) ? run.scenarios : [];
      for (const scenario of scenarios) {
        const key = String(scenario.key || 'unknown');
        const existing = scenarioAccumulator.get(key) || {
          key,
          samples: 0,
          latencyP95Sum: 0,
          rpsSum: 0,
          errorRateSum: 0
        };

        existing.samples += 1;
        existing.latencyP95Sum += toNumber(scenario.latencyP95Ms);
        existing.rpsSum += toNumber(scenario.requestsPerSecond);
        existing.errorRateSum += toNumber(scenario.errorRatePercent);
        scenarioAccumulator.set(key, existing);
      }
    }

    for (const item of scenarioAccumulator.values()) {
      scenarioRows.push({
        environment: env,
        scenario: item.key,
        samples: item.samples,
        avgLatencyP95Ms: item.samples > 0 ? round(item.latencyP95Sum / item.samples, 2) : 0,
        avgRps: item.samples > 0 ? round(item.rpsSum / item.samples, 2) : 0,
        avgErrorRatePercent: item.samples > 0 ? round(item.errorRateSum / item.samples, 2) : 0
      });
    }
  }

  scenarioRows.sort((a, b) => {
    if (a.environment === b.environment) {
      return a.scenario.localeCompare(b.scenario);
    }
    return a.environment.localeCompare(b.environment);
  });

  return { overviewRows, scenarioRows };
}

function buildMarkdown(summary) {
  const lines = [];

  lines.push('# Load-Test Trend Summary');
  lines.push('');
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push('');

  lines.push('## Environment Overview');
  lines.push('');
  lines.push('| Environment | Runs | Passing Runs | Pass Rate | Latest Run |');
  lines.push('| --- | ---: | ---: | ---: | --- |');

  if (summary.overviewRows.length === 0) {
    lines.push('| n/a | 0 | 0 | 0% | n/a |');
  } else {
    for (const row of summary.overviewRows) {
      lines.push(`| ${row.environment} | ${row.totalRuns} | ${row.passingRuns} | ${row.passRatePercent}% | ${row.latestCapturedAt} |`);
    }
  }

  lines.push('');
  lines.push('## Scenario Averages');
  lines.push('');
  lines.push('| Environment | Scenario | Samples | Avg p95 Latency (ms) | Avg Throughput (rps) | Avg Error Rate (%) |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: |');

  if (summary.scenarioRows.length === 0) {
    lines.push('| n/a | n/a | 0 | 0 | 0 | 0 |');
  } else {
    for (const row of summary.scenarioRows) {
      lines.push(`| ${row.environment} | ${row.scenario} | ${row.samples} | ${row.avgLatencyP95Ms} | ${row.avgRps} | ${row.avgErrorRatePercent} |`);
    }
  }

  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('1. This summary is generated from JSON files in the load-test results directory.');
  lines.push('2. Averages are computed per environment using the most recent runs included by --max-runs.');

  return `${lines.join('\n')}\n`;
}

function main() {
  const args = parseArgs(process.argv);
  const inputDir = path.resolve(process.cwd(), args.inputDir);
  const outputFile = path.resolve(process.cwd(), args.outputFile);

  const jsonFiles = walkJsonFiles(inputDir);
  const runsByEnv = {};

  for (const filePath of jsonFiles) {
    const data = safeReadJson(filePath);
    if (!data || typeof data !== 'object') {
      continue;
    }

    const environment = String(data.environment || 'unknown').toLowerCase();
    if (!runsByEnv[environment]) {
      runsByEnv[environment] = [];
    }

    runsByEnv[environment].push(data);
  }

  const summary = summarize(runsByEnv, args.maxRunsPerEnv);
  const markdown = buildMarkdown(summary);

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, markdown, 'utf8');

  console.log(`Load-test summary generated: ${outputFile}`);
  console.log(`JSON files processed: ${jsonFiles.length}`);
}

main();
