import {readFile, readdir} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(frontendRoot, '..');
const harnessPath = resolve(frontendRoot, 'src/features/visual/V3VisualHarnessScreen.tsx');
const mappingPath = resolve(repositoryRoot, 'artifacts/v3-visual/mapping.json');
const actualXmlDirectory = resolve(repositoryRoot, 'artifacts/v3-visual/actual/uiautomator');

const source = await readFile(harnessPath, 'utf8');
const objectMatch = source.match(/export const V3_VISUAL_SCREEN_IDS = \{([\s\S]*?)\n\} as const;/);
if (!objectMatch) {
    throw new Error('V3_VISUAL_SCREEN_IDS object was not found.');
}
const harnessIds = new Set(
    [...objectMatch[1].matchAll(/:\s*'([^']+)'/g)].map((match) => match[1]),
);
const mapping = JSON.parse((await readFile(mappingPath, 'utf8')).replace(/^\uFEFF/, ''));
const mappingIds = new Set(mapping.screens.map((screen) => screen.id));
const missingFromHarness = [...mappingIds].filter((id) => !harnessIds.has(id));
const missingFromMapping = [...harnessIds].filter((id) => !mappingIds.has(id));

const xmlFiles = (await readdir(actualXmlDirectory)).filter((name) => name.endsWith('.xml'));
const xmlIds = new Set(xmlFiles.map((name) => name.replace(/\.xml$/, '')));
const missingActualXml = [...mappingIds].filter((id) => !xmlIds.has(id));
let unwiredCount = 0;
for (const xmlFile of xmlFiles) {
    const xml = await readFile(resolve(actualXmlDirectory, xmlFile), 'utf8');
    if (xml.includes('미배선')) {
        unwiredCount += 1;
    }
}

const result = {
    harnessIdCount: harnessIds.size,
    mappingIdCount: mappingIds.size,
    missingFromHarness,
    missingFromMapping,
    actualXmlCount: xmlFiles.length,
    missingActualXml,
    unwiredXmlCount: unwiredCount,
};
console.log(JSON.stringify(result, null, 2));
if (harnessIds.size !== 154 || mappingIds.size !== 154 || missingFromHarness.length > 0 ||
    missingFromMapping.length > 0 || missingActualXml.length > 0 || unwiredCount > 0) {
    process.exitCode = 1;
}
