#!/usr/bin/env node
/**
 * OWASP ZAP JSON 리포트 -> SARIF 2.1.0 변환기
 *
 * 왜 필요한가:
 *   GitHub Security 탭은 CodeQL 전용이 아니라 SARIF 를 말하는 모든 도구에 열려 있습니다.
 *   ZAP 은 SARIF 를 기본 출력하지 않으므로 여기서 변환해 정적(CodeQL)/동적(ZAP) 결과를
 *   같은 화면에 합칩니다.
 *
 * 구조적 한계 (Lab 에서 반드시 짚을 것):
 *   SARIF 는 "소스 파일 + 줄번호" 좌표계를 전제로 설계됐습니다.
 *   그런데 DAST 결과에는 파일도 줄번호도 없습니다. 실행 중인 HTTP 응답이 전부입니다.
 *   그래서 각 알림을 openapi.yaml 의 해당 경로 선언 줄에 매핑합니다.
 *   이건 편의를 위한 근사이지, DAST 결과가 원래 그 줄에서 비롯됐다는 뜻이 아닙니다.
 *
 * 사용법:
 *   node tools/zap-to-sarif.js [zapJson] [openapiSpec] [outSarif]
 */

const fs = require('fs');

const zapJsonPath = process.argv[2] || 'report_json.json';
const specPath = process.argv[3] || 'openapi.yaml';
const outPath = process.argv[4] || 'zap.sarif';

// ZAP riskcode -> SARIF level + GitHub security-severity(0~10)
// GitHub 은 security-severity 로 Critical(>=9)/High(>=7)/Medium(>=4)/Low(>0) 등급을 매깁니다.
const RISK = {
  3: { level: 'error', score: '7.5', label: 'High' },
  2: { level: 'warning', score: '5.5', label: 'Medium' },
  1: { level: 'note', score: '3.0', label: 'Low' },
  0: { level: 'note', score: '1.0', label: 'Informational' },
};

function stripHtml(s) {
  return String(s || '')
    .replace(/<\/(p|br|li)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pathOf(uri) {
  try {
    return new URL(uri).pathname;
  } catch {
    return String(uri || '/');
  }
}

// openapi.yaml 에서 해당 HTTP 경로가 선언된 줄번호를 찾습니다.
const specLines = fs.existsSync(specPath)
  ? fs.readFileSync(specPath, 'utf8').split('\n')
  : [];

const specPaths = [];
specLines.forEach((line, i) => {
  const m = line.match(/^ {2}(\/\S*):\s*$/);
  if (!m) return;
  const template = m[1];
  const regex = new RegExp(
    '^' +
      template
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\{[^}]*\\\}/g, '[^/]+') +
      '$'
  );
  specPaths.push({ template, regex, line: i + 1 });
});

function lineForUri(uri) {
  const p = pathOf(uri);
  const hit = specPaths.find((sp) => sp.regex.test(p));
  return hit ? hit.line : 1;
}

if (!fs.existsSync(zapJsonPath)) {
  console.error(`ZAP 리포트를 찾을 수 없습니다: ${zapJsonPath}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(zapJsonPath, 'utf8'));
const sites = Array.isArray(report.site) ? report.site : [report.site].filter(Boolean);

const rules = new Map();
const results = [];
const tally = { High: 0, Medium: 0, Low: 0, Informational: 0 };

for (const site of sites) {
  for (const alert of site.alerts || []) {
    const risk = RISK[Number(alert.riskcode)] || RISK[0];
    const title = alert.alert || alert.name || `ZAP ${alert.pluginid}`;
    const ruleId = `ZAP-${alert.pluginid}`;

    if (!rules.has(ruleId)) {
      const cwe = alert.cweid && alert.cweid !== '-1' && alert.cweid !== '0' ? String(alert.cweid) : null;
      rules.set(ruleId, {
        id: ruleId,
        name: title.replace(/[^A-Za-z0-9]/g, ''),
        shortDescription: { text: title },
        fullDescription: { text: stripHtml(alert.desc).slice(0, 900) || title },
        defaultConfiguration: { level: risk.level },
        help: {
          text: [stripHtml(alert.desc), '', '해결 방안:', stripHtml(alert.solution)]
            .join('\n')
            .slice(0, 4000),
          markdown: [
            stripHtml(alert.desc),
            '',
            '**해결 방안**',
            '',
            stripHtml(alert.solution),
            '',
            '**참고**',
            '',
            stripHtml(alert.reference),
          ]
            .join('\n')
            .slice(0, 4000),
        },
        properties: {
          tags: ['security', 'DAST', 'OWASP-ZAP'].concat(cwe ? [`external/cwe/cwe-${cwe}`] : []),
          'security-severity': risk.score,
          precision: 'medium',
          zapRisk: risk.label,
          zapPluginId: String(alert.pluginid),
        },
      });
    }

    const instances =
      Array.isArray(alert.instances) && alert.instances.length
        ? alert.instances
        : [{ uri: site['@name'], method: 'GET' }];

    for (const inst of instances) {
      tally[risk.label] += 1;
      const detail = [
        inst.param ? `파라미터: ${inst.param}` : null,
        inst.attack ? `공격: ${inst.attack}` : null,
        inst.evidence ? `증거: ${inst.evidence}` : null,
      ]
        .filter(Boolean)
        .join(' / ');

      results.push({
        ruleId,
        level: risk.level,
        message: {
          text:
            `[${risk.label}] ${title} — ${inst.method || 'GET'} ${inst.uri}` +
            (detail ? `\n${detail}` : '') +
            `\n(동적 분석 결과입니다. 위치는 openapi.yaml 의 해당 엔드포인트 선언으로 매핑했습니다.)`,
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: specPath },
              region: { startLine: lineForUri(inst.uri) },
            },
          },
        ],
        partialFingerprints: {
          zapAlert: `${alert.pluginid}:${inst.method || 'GET'}:${pathOf(inst.uri)}:${inst.param || ''}`,
        },
      });
    }
  }
}

const sarif = {
  $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
  version: '2.1.0',
  runs: [
    {
      tool: {
        driver: {
          name: 'OWASP ZAP',
          version: String(report['@version'] || 'unknown'),
          informationUri: 'https://www.zaproxy.org/',
          rules: Array.from(rules.values()),
        },
      },
      results,
    },
  ],
};

fs.writeFileSync(outPath, JSON.stringify(sarif, null, 2));

console.log(`SARIF 생성: ${outPath}`);
console.log(`  규칙 ${rules.size}개 / 결과 ${results.length}건`);
console.log(
  `  High ${tally.High} / Medium ${tally.Medium} / Low ${tally.Low} / Info ${tally.Informational}`
);

// 워크플로 요약에 쓸 수 있도록 집계를 출력합니다.
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `rules=${rules.size}`,
      `results=${results.length}`,
      `high=${tally.High}`,
      `medium=${tally.Medium}`,
      `low=${tally.Low}`,
      `info=${tally.Informational}`,
    ].join('\n') + '\n'
  );
}
