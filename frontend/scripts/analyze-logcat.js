#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { input: null, output: null, appId: 'com.sodam_front_end' };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '-i' || a === '--input') && args[i + 1]) opts.input = args[++i];
    else if ((a === '-o' || a === '--output') && args[i + 1]) opts.output = args[++i];
    else if ((a === '-a' || a === '--app') && args[i + 1]) opts.appId = args[++i];
  }
  if (!opts.input || !opts.output) {
    console.error('Usage: node analyze-logcat.js -i <input.json> -o <output.md> [-a <appId>]');
    process.exit(1);
  }
  return opts;
}

function safeReadJSON(file) {
  const raw = fs.readFileSync(file, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse JSON logcat:', e.message);
    process.exit(2);
  }
}

function analyze(data, appId) {
  const msgs = Array.isArray(data.logcatMessages) ? data.logcatMessages : [];
  const totals = { count: msgs.length };

  const byLevel = {};
  const byApp = {};
  const byTag = {};
  const appEntries = [];

  const keywords = [
    'Hermes', 'ReactNative', 'ReactNativeJS', 'SoLoader', 'TypeError',
    'Invariant Violation', 'ANR', 'Fatal signal', 'JSException',
    'SoLoader', 'TurboModule', 'JSC', 'native crash', 'Unable to', 'Caused by'
  ];
  const keywordHits = {};

  for (const m of msgs) {
    const h = m.header || {};
    const level = h.logLevel || 'UNKNOWN';
    const tag = h.tag || 'UNKNOWN';
    const app = h.applicationId || 'UNKNOWN';
    const message = (m.message || '').toString();

    byLevel[level] = (byLevel[level] || 0) + 1;
    byApp[app] = (byApp[app] || 0) + 1;
    byTag[tag] = (byTag[tag] || 0) + 1;

    for (const kw of keywords) {
      if (message.includes(kw) || tag.includes(kw)) {
        keywordHits[kw] = keywordHits[kw] || [];
        if (keywordHits[kw].length < 50) {
          keywordHits[kw].push({ h, message });
        }
      }
    }

    if (app === appId) {
      appEntries.push(m);
    }
  }

  const appErrors = appEntries.filter(m => (m.header?.logLevel === 'ERROR'));
  const appWarns = appEntries.filter(m => (m.header?.logLevel === 'WARN'));

  // sample extractors
  function sample(list, n = 20) {
    return list.slice(0, n).map(m => ({ header: m.header, message: m.message }));
  }

  return {
    totals,
    byLevel,
    byAppTop: Object.entries(byApp).sort((a,b)=>b[1]-a[1]).slice(0,20),
    byTagTop: Object.entries(byTag).sort((a,b)=>b[1]-a[1]).slice(0,30),
    app: {
      id: appId,
      counts: {
        total: appEntries.length,
        errors: appErrors.length,
        warns: appWarns.length,
        info: appEntries.filter(m => m.header?.logLevel === 'INFO').length,
        debug: appEntries.filter(m => m.header?.logLevel === 'DEBUG').length,
      },
      samples: {
        errors: sample(appErrors, 30),
        warns: sample(appWarns, 30),
        infos: sample(appEntries.filter(m => m.header?.logLevel === 'INFO'), 10),
        debugs: sample(appEntries.filter(m => m.header?.logLevel === 'DEBUG'), 10),
      }
    },
    keywordHits,
  };
}

function toMarkdown(res, inputPath) {
  const lines = [];
  lines.push(`# Logcat JSON Analysis Report`);
  lines.push(`- Source: ${path.basename(inputPath)}`);
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`## Overview`);
  lines.push(`- Total messages: ${res.totals.count}`);
  lines.push(`- By Level:`);
  for (const [k,v] of Object.entries(res.byLevel)) lines.push(`  - ${k}: ${v}`);
  lines.push('');
  lines.push(`## Top Apps`);
  for (const [app,count] of res.byAppTop) lines.push(`- ${app}: ${count}`);
  lines.push('');
  lines.push(`## Top Tags`);
  for (const [tag,count] of res.byTagTop) lines.push(`- ${tag}: ${count}`);
  lines.push('');
  lines.push(`## Focus: ${res.app.id}`);
  lines.push(`- Counts: ${JSON.stringify(res.app.counts)}`);
  lines.push('');
  lines.push(`### Sample ERROR entries`);
  for (const s of res.app.samples.errors) {
    lines.push(`- [${s.header.logLevel}] ${s.header.tag} @ ${s.header.timestamp?.seconds}.${s.header.timestamp?.nanos}: ${s.message}`);
  }
  lines.push('');
  lines.push(`### Sample WARN entries`);
  for (const s of res.app.samples.warns) {
    lines.push(`- [${s.header.logLevel}] ${s.header.tag} @ ${s.header.timestamp?.seconds}.${s.header.timestamp?.nanos}: ${s.message}`);
  }
  lines.push('');
  lines.push(`### Sample INFO entries`);
  for (const s of res.app.samples.infos) {
    lines.push(`- [${s.header.logLevel}] ${s.header.tag} @ ${s.header.timestamp?.seconds}.${s.header.timestamp?.nanos}: ${s.message}`);
  }
  lines.push('');
  lines.push(`### Sample DEBUG entries`);
  for (const s of res.app.samples.debugs) {
    lines.push(`- [${s.header.logLevel}] ${s.header.tag} @ ${s.header.timestamp?.seconds}.${s.header.timestamp?.nanos}: ${s.message}`);
  }
  lines.push('');
  lines.push(`## Keyword Hits`);
  for (const [kw, list] of Object.entries(res.keywordHits)) {
    lines.push(`### ${kw}`);
    lines.push(`- Count(samples up to 50): ${list.length}`);
    for (const s of list) {
      lines.push(`  - [${s.h.logLevel}] ${s.h.applicationId}/${s.h.tag}: ${s.message}`);
    }
  }
  return lines.join('\n');
}

(function main(){
  const opts = parseArgs();
  const data = safeReadJSON(opts.input);
  const result = analyze(data, opts.appId);
  const md = toMarkdown(result, opts.input);
  const outDir = path.dirname(opts.output);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(opts.output, md, 'utf8');
  console.log('Analysis written to', opts.output);
})();
