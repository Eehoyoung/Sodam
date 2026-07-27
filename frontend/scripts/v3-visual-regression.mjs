import {mkdir, readdir, readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {basename, dirname, extname, join, relative, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import pngjs from 'pngjs';

const {PNG} = pngjs;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDir, '..');
const repositoryRoot = resolve(frontendRoot, '..');
const artifactSourceDirectory = resolve(repositoryRoot, 'docs', '260720', 'artifacts');
const defaultOutputDirectory = resolve(repositoryRoot, 'artifacts', 'v3-visual');
const expectedArtifactCardCount = 154;

function option(name, fallback = undefined) {
    const index = process.argv.indexOf(name);
    if (index === -1) {
        return fallback;
    }
    const value = process.argv[index + 1];
    if (!value || value.startsWith('--')) {
        throw new Error(`${name} requires a value.`);
    }
    return value;
}

function normalizedPath(path) {
    return path.replaceAll('\\', '/');
}

function relativeOutputPath(outputDirectory, path) {
    return normalizedPath(relative(outputDirectory, path));
}

function parseCrop(value) {
    const values = value.split(',').map((part) => Number.parseInt(part, 10));
    if (values.length !== 4 || values.some((part) => !Number.isInteger(part) || part < 0)) {
        throw new Error('--crop must be x,y,width,height using non-negative integers.');
    }
    return {x: values[0], y: values[1], width: values[2], height: values[3]};
}

async function readPng(path) {
    return PNG.sync.read(await readFile(path));
}

async function writePng(path, png) {
    await mkdir(dirname(path), {recursive: true});
    await writeFile(path, PNG.sync.write(png));
}

function cropPng(source, crop) {
    if (crop.x + crop.width > source.width || crop.y + crop.height > source.height) {
        throw new Error(`Crop ${crop.x},${crop.y},${crop.width},${crop.height} exceeds ${source.width}x${source.height}.`);
    }

    const cropped = new PNG({width: crop.width, height: crop.height});
    for (let row = 0; row < crop.height; row += 1) {
        const sourceStart = ((crop.y + row) * source.width + crop.x) * 4;
        const targetStart = row * crop.width * 4;
        source.data.copy(cropped.data, targetStart, sourceStart, sourceStart + crop.width * 4);
    }
    return cropped;
}

function screenIdentifier(artifactName, label, cardIndex) {
    const rawIdentifier = label.match(/^\s*([A-Za-z]+\d+|\d{1,3})\b/)?.[1];
    if (!rawIdentifier) {
        throw new Error(`Cannot determine the screen identifier for ${artifactName} card ${cardIndex}: ${label}`);
    }
    const normalizedIdentifier = /^\d+$/.test(rawIdentifier)
        ? rawIdentifier.padStart(3, '0')
        : rawIdentifier.toUpperCase();
    return `${artifactName}--${normalizedIdentifier}`;
}

async function listArtifactFiles() {
    const files = await readdir(artifactSourceDirectory);
    return files
        .filter((file) => /^sodam-v3-\d{2}-.+\.html$/i.test(file))
        .sort((left, right) => left.localeCompare(right, 'en'));
}

async function createReferences(outputDirectory) {
    const referenceDirectory = join(outputDirectory, 'reference');
    const browserExecutable = option('--browser', 'C:/Program Files/Google/Chrome/Application/chrome.exe');
    const browser = await chromium.launch({executablePath: browserExecutable, headless: true});
    const page = await browser.newPage({viewport: {width: 1600, height: 1000}, deviceScaleFactor: 2});
    const screens = [];
    const identifiers = new Set();

    try {
        for (const artifactFile of await listArtifactFiles()) {
            const artifactPath = join(artifactSourceDirectory, artifactFile);
            const artifactName = basename(artifactFile, extname(artifactFile));
            await page.goto(pathToFileURL(artifactPath).href, {waitUntil: 'load'});
            // HTML 시안의 rounded device frame은 프레젠테이션 장식이다. 앱은 화면 전체를
            // 렌더하므로, 픽셀 비교용 기준 이미지는 콘텐츠 사각형만 사용한다.
            await page.addStyleTag({content: '.device__screen { border-radius: 0 !important; }'});
            const cards = page.locator('.card');
            const cardCount = await cards.count();

            for (let cardIndex = 0; cardIndex < cardCount; cardIndex += 1) {
                const card = cards.nth(cardIndex);
                const label = (await card.locator('.card__tab').innerText()).replace(/\s+/g, ' ').trim();
                const id = screenIdentifier(artifactName, label, cardIndex);
                if (identifiers.has(id)) {
                    throw new Error(`Duplicate visual screen identifier: ${id}`);
                }
                identifiers.add(id);

                const referencePath = join(referenceDirectory, `${id}.png`);
                await card.locator('.device__screen').screenshot({path: referencePath, animations: 'disabled'});
                const image = await readPng(referencePath);
                screens.push({
                    id,
                    label,
                    artifact: normalizedPath(relative(repositoryRoot, artifactPath)),
                    reference: relativeOutputPath(outputDirectory, referencePath),
                    width: image.width,
                    height: image.height,
                });
            }
        }
    } finally {
        await browser.close();
    }

    const manifest = {
        formatVersion: 1,
        artifactCardCount: screens.length,
        comparison: {
            channelThreshold: 0,
            pixelBudget: 0,
            note: 'Any non-identical RGBA pixel fails by default. Use non-zero options only for an explicitly approved exception.',
        },
        screens,
    };
    const manifestPath = join(outputDirectory, 'manifest.json');
    await mkdir(outputDirectory, {recursive: true});
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Rendered ${screens.length} reference screens to ${referenceDirectory}`);
    console.log(`Manifest: ${manifestPath}`);

    if (screens.length !== expectedArtifactCardCount) {
        throw new Error(`Expected ${expectedArtifactCardCount} cards in the current artifact source but rendered ${screens.length}.`);
    }

    const requestedScreenCount = option('--expected-screen-count');
    if (requestedScreenCount !== undefined && Number.parseInt(requestedScreenCount, 10) !== screens.length) {
        throw new Error(
            `Requested ${requestedScreenCount} screens but the current artifact source contains ${screens.length} cards. ` +
            'Resolve the scope catalog before certifying a strict screen count.',
        );
    }
}

function buildDiff(reference, actual, channelThreshold) {
    const diff = new PNG({width: reference.width, height: reference.height});
    let differingPixels = 0;
    let maximumChannelDelta = 0;

    for (let index = 0; index < reference.data.length; index += 4) {
        const redDelta = Math.abs(reference.data[index] - actual.data[index]);
        const greenDelta = Math.abs(reference.data[index + 1] - actual.data[index + 1]);
        const blueDelta = Math.abs(reference.data[index + 2] - actual.data[index + 2]);
        const alphaDelta = Math.abs(reference.data[index + 3] - actual.data[index + 3]);
        const greatestDelta = Math.max(redDelta, greenDelta, blueDelta, alphaDelta);
        maximumChannelDelta = Math.max(maximumChannelDelta, greatestDelta);

        if (greatestDelta > channelThreshold) {
            differingPixels += 1;
            diff.data[index] = 255;
            diff.data[index + 1] = 0;
            diff.data[index + 2] = 0;
            diff.data[index + 3] = 255;
        } else {
            diff.data[index] = Math.floor(reference.data[index] * 0.25);
            diff.data[index + 1] = Math.floor(reference.data[index + 1] * 0.25);
            diff.data[index + 2] = Math.floor(reference.data[index + 2] * 0.25);
            diff.data[index + 3] = 255;
        }
    }

    return {diff, differingPixels, maximumChannelDelta};
}

async function compareScreens(outputDirectory) {
    const manifestPath = join(outputDirectory, 'manifest.json');
    if (!existsSync(manifestPath)) {
        throw new Error(`Reference manifest not found: ${manifestPath}. Run \`npm run visual:v3:reference\` first.`);
    }

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (manifest.artifactCardCount !== expectedArtifactCardCount || manifest.screens.length !== expectedArtifactCardCount) {
        throw new Error(`Manifest must contain exactly ${expectedArtifactCardCount} cards from the current artifact source.`);
    }

    const actualDirectory = resolve(option('--actual', join(outputDirectory, 'actual')));
    const referenceDirectory = resolve(option('--reference-dir', join(outputDirectory, 'reference')));
    const diffDirectory = resolve(option('--diff-dir', join(outputDirectory, 'diff')));
    const channelThreshold = Number.parseInt(option('--channel-threshold', '0'), 10);
    const pixelBudget = Number.parseInt(option('--pixel-budget', '0'), 10);
    if (!Number.isInteger(channelThreshold) || channelThreshold < 0 || channelThreshold > 255) {
        throw new Error('--channel-threshold must be an integer from 0 to 255.');
    }
    if (!Number.isInteger(pixelBudget) || pixelBudget < 0) {
        throw new Error('--pixel-budget must be a non-negative integer.');
    }

    const only = option('--screen-ids');
    const selectedIds = only ? new Set(only.split(',').map((id) => id.trim()).filter(Boolean)) : null;
    if (selectedIds) {
        const knownIds = new Set(manifest.screens.map((screen) => screen.id));
        const unknownIds = [...selectedIds].filter((id) => !knownIds.has(id));
        if (unknownIds.length > 0) {
            throw new Error(`Unknown visual screen ids: ${unknownIds.join(', ')}`);
        }
    }
    const selectedScreens = selectedIds
        ? manifest.screens.filter((screen) => selectedIds.has(screen.id))
        : manifest.screens;

    const results = [];
    for (const screen of selectedScreens) {
        const referencePath = join(referenceDirectory, `${screen.id}.png`);
        const actualPath = join(actualDirectory, `${screen.id}.png`);
        if (!existsSync(referencePath)) {
            results.push({id: screen.id, status: 'missing-reference'});
            continue;
        }
        if (!existsSync(actualPath)) {
            results.push({id: screen.id, status: 'missing-actual'});
            continue;
        }

        const reference = await readPng(referencePath);
        const actual = await readPng(actualPath);
        if (reference.width !== actual.width || reference.height !== actual.height) {
            results.push({
                id: screen.id,
                status: 'dimension-mismatch',
                reference: `${reference.width}x${reference.height}`,
                actual: `${actual.width}x${actual.height}`,
            });
            continue;
        }

        const comparison = buildDiff(reference, actual, channelThreshold);
        const status = comparison.differingPixels <= pixelBudget ? 'passed' : 'pixel-mismatch';
        if (status !== 'passed') {
            await writePng(join(diffDirectory, `${screen.id}.png`), comparison.diff);
        }
        results.push({
            id: screen.id,
            status,
            differingPixels: comparison.differingPixels,
            maximumChannelDelta: comparison.maximumChannelDelta,
        });
    }

    const failures = results.filter((result) => result.status !== 'passed');
    const report = {
        generatedAt: new Date().toISOString(),
        artifactCardCount: manifest.artifactCardCount,
        comparedScreenCount: selectedScreens.length,
        referenceDirectory: relativeOutputPath(outputDirectory, referenceDirectory),
        actualDirectory: relativeOutputPath(outputDirectory, actualDirectory),
        channelThreshold,
        pixelBudget,
        summary: {
            passed: results.length - failures.length,
            failed: failures.length,
            missingReference: results.filter((result) => result.status === 'missing-reference').length,
            missingActual: results.filter((result) => result.status === 'missing-actual').length,
            dimensionMismatch: results.filter((result) => result.status === 'dimension-mismatch').length,
            pixelMismatch: results.filter((result) => result.status === 'pixel-mismatch').length,
        },
        results,
    };
    const reportPath = resolve(option('--report-file', join(outputDirectory, 'report.json')));
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report.summary));
    console.log(`Report: ${reportPath}`);
    if (failures.length > 0) {
        process.exitCode = 1;
    }
}

async function normalizeAndroidCapture() {
    const inputPath = resolve(option('--input'));
    const outputPath = resolve(option('--output'));
    const referencePath = resolve(option('--reference'));
    const crop = parseCrop(option('--crop'));
    const source = await readPng(inputPath);
    const reference = await readPng(referencePath);
    const cropped = cropPng(source, crop);

    if (cropped.width !== reference.width || cropped.height !== reference.height) {
        throw new Error(
            `Canonical viewport mismatch: capture crop is ${cropped.width}x${cropped.height}, reference is ${reference.width}x${reference.height}. ` +
            'Do not rescale: use the canonical AVD viewport before capturing.',
        );
    }
    await writePng(outputPath, cropped);
    console.log(`Normalized Android capture: ${outputPath}`);
}

async function main() {
    const mode = process.argv[2];
    const outputDirectory = resolve(option('--out', defaultOutputDirectory));
    if (mode === 'reference') {
        await createReferences(outputDirectory);
        return;
    }
    if (mode === 'compare') {
        await compareScreens(outputDirectory);
        return;
    }
    if (mode === 'normalize') {
        await normalizeAndroidCapture();
        return;
    }
    throw new Error('Usage: v3-visual-regression.mjs <reference|compare|normalize> [options]');
}

main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
});
