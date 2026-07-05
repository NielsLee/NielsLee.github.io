import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const publicDir = path.join(root, 'public');
const resumeHtmlPath = path.join(publicDir, 'resume', 'index.html');
const outputPath = path.join(root, 'static', 'resume', 'resume.pdf');
const chromeBin = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sourceWidth = Number(process.env.RESUME_SOURCE_WIDTH || 1080);
const rasterScale = Number(process.env.RESUME_RASTER_SCALE || 2);
const rasterFormat = process.env.RESUME_RASTER_FORMAT || 'jpeg';
const rasterQuality = Number(process.env.RESUME_RASTER_QUALITY || 90);
const a4WidthPx = Math.round(210 * 96 / 25.4);
const a4HeightPx = Math.round(297 * 96 / 25.4);
const captureWidthPx = sourceWidth;
const captureHeightPx = Math.round(sourceWidth * 297 / 210);

class CdpClient {
    static connect(url) {
        return new Promise((resolve, reject) => {
            const socket = new WebSocket(url);
            const client = new CdpClient(socket);

            socket.addEventListener('open', () => resolve(client), { once: true });
            socket.addEventListener('error', (event) => {
                reject(event.error || new Error('Chrome DevTools WebSocket failed.'));
            }, { once: true });
        });
    }

    constructor(socket) {
        this.socket = socket;
        this.nextId = 1;
        this.pending = new Map();
        this.eventWaiters = new Map();

        socket.addEventListener('message', (event) => this.handleMessage(event));
    }

    send(method, params = {}) {
        const id = this.nextId;
        this.nextId += 1;

        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.socket.send(JSON.stringify({ id, method, params }));
        });
    }

    waitFor(method) {
        return new Promise((resolve) => {
            const waiters = this.eventWaiters.get(method) || [];
            waiters.push(resolve);
            this.eventWaiters.set(method, waiters);
        });
    }

    close() {
        this.socket.close();
    }

    handleMessage(event) {
        const message = JSON.parse(event.data);

        if (message.id) {
            const pending = this.pending.get(message.id);
            if (!pending) return;

            this.pending.delete(message.id);
            if (message.error) {
                pending.reject(new Error(message.error.message));
            } else {
                pending.resolve(message.result || {});
            }
            return;
        }

        if (!message.method) return;

        const waiters = this.eventWaiters.get(message.method);
        if (!waiters?.length) return;

        this.eventWaiters.delete(message.method);
        for (const resolve of waiters) {
            resolve(message.params || {});
        }
    }
}

if (!fs.existsSync(resumeHtmlPath)) {
    throw new Error(`Resume HTML not found: ${resumeHtmlPath}. Run ./scripts/hugo.sh first.`);
}

if (!fs.existsSync(chromeBin)) {
    throw new Error(`Chrome not found: ${chromeBin}. Set CHROME_BIN=/path/to/chrome and retry.`);
}

const html = fs.readFileSync(resumeHtmlPath, 'utf8');
const head = html.match(/<head>[\s\S]*?<\/head>/i)?.[0] || '';
const sourceStart = findTagStartByAttribute(html, 'div', 'id', 'resume-pdf-area');
const sourceEnd = sourceStart >= 0 ? findElementEnd(html, sourceStart, 'div') : -1;

if (sourceStart < 0 || sourceEnd < 0) {
    const hasResumePage = /resume-page-wrap|个人简历|resume-document/i.test(html);
    const hasRawShortcode = /rawhtml/i.test(html);
    throw new Error([
        'Unable to locate resume printable source in public/resume/index.html.',
        `Found resume page markers: ${hasResumePage}.`,
        `Found raw shortcode text: ${hasRawShortcode}.`,
        'Expected a <div id="resume-pdf-area"> wrapper in the rendered resume page.',
    ].join(' '));
}

const source = rewriteRootRelativeUrls(html.slice(sourceStart, sourceEnd).trim());
const printableStyles = Array.from(head.matchAll(/<link\b[^>]*>|<style[\s\S]*?<\/style>/gi))
    .map(([tag]) => {
        if (!/^<link/i.test(tag)) return tag;

        const rel = readAttribute(tag, 'rel');
        if (!rel || !rel.split(/\s+/).includes('stylesheet')) return '';

        const href = readAttribute(tag, 'href');
        if (!href) return '';

        return tag.replace(href, resolvePublicUrl(href));
    })
    .filter(Boolean)
    .join('\n');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-pdf-'));
const tempHtmlPath = path.join(tempDir, 'resume-source.html');
fs.writeFileSync(tempHtmlPath, buildRasterSourceHtml(source, printableStyles), 'utf8');

try {
    const pageImages = await captureRasterPages(tempHtmlPath, tempDir);
    const rasterHtmlPath = path.join(tempDir, 'resume-raster.html');
    fs.writeFileSync(rasterHtmlPath, buildRasterPdfHtml(pageImages), 'utf8');

    const chromeArgs = [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--no-pdf-header-footer',
        '--run-all-compositor-stages-before-draw',
        '--virtual-time-budget=3000',
        `--print-to-pdf=${outputPath}`,
        pathToFileURL(rasterHtmlPath).href,
    ];

    const result = spawnSync(chromeBin, chromeArgs, { stdio: 'inherit' });

    if (result.status !== 0) {
        throw new Error(`Chrome PDF generation failed with exit code ${result.status}.`);
    }

    console.log(`Resume PDF written: ${outputPath}`);
    console.log(`Resume source width: ${sourceWidth}px`);
    console.log(`Resume raster pages: ${pageImages.length}`);
    console.log(`Resume raster scale: ${rasterScale}x`);
} finally {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

async function captureRasterPages(tempHtmlPath, tempDir) {
    const chromeProfileDir = path.join(tempDir, 'chrome-profile');
    const chrome = spawn(chromeBin, [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--remote-debugging-port=0',
        `--user-data-dir=${chromeProfileDir}`,
        'about:blank',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let cdp;
    try {
        const devtoolsUrl = await waitForDevtoolsUrl(chrome);
        const httpOrigin = devtoolsUrl.replace(/^ws:/, 'http:').replace(/\/devtools\/browser\/.*$/, '');
        const pageUrl = pathToFileURL(tempHtmlPath).href;
        const targetResponse = await fetch(`${httpOrigin}/json/new?${encodeURIComponent(pageUrl)}`, { method: 'PUT' });

        if (!targetResponse.ok) {
            throw new Error(`Chrome target creation failed: ${targetResponse.status} ${targetResponse.statusText}`);
        }

        const target = await targetResponse.json();
        cdp = await CdpClient.connect(target.webSocketDebuggerUrl);

        const loaded = cdp.waitFor('Page.loadEventFired');
        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');
        await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: captureWidthPx,
            height: captureHeightPx,
            deviceScaleFactor: rasterScale,
            mobile: false,
            screenWidth: captureWidthPx,
            screenHeight: captureHeightPx,
        });
        await cdp.send('Page.navigate', { url: pageUrl });
        await loaded;
        await cdp.send('Runtime.evaluate', {
            expression: 'document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true',
            awaitPromise: true,
        });
        await cdp.send('Runtime.evaluate', {
            expression: 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
            awaitPromise: true,
        });

        const heightResult = await cdp.send('Runtime.evaluate', {
            expression: 'Math.ceil(Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0))',
            returnByValue: true,
        });
        const documentHeight = Number(heightResult.result.value || captureHeightPx);
        const pageCount = Math.max(1, Math.ceil(documentHeight / captureHeightPx));
        const images = [];

        for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
            const screenshot = await cdp.send('Page.captureScreenshot', {
                format: rasterFormat,
                quality: rasterFormat === 'jpeg' ? rasterQuality : undefined,
                captureBeyondViewport: true,
                fromSurface: true,
                clip: {
                    x: 0,
                    y: pageIndex * captureHeightPx,
                    width: captureWidthPx,
                    height: captureHeightPx,
                    scale: 1,
                },
            });
            const imageExtension = rasterFormat === 'jpeg' ? 'jpg' : 'png';
            const imagePath = path.join(tempDir, `resume-page-${pageIndex + 1}.${imageExtension}`);
            fs.writeFileSync(imagePath, Buffer.from(screenshot.data, 'base64'));
            images.push(pathToFileURL(imagePath).href);
        }

        return images;
    } finally {
        cdp?.close();
        chrome.kill('SIGTERM');
        await waitForProcessExit(chrome);
    }
}

function waitForDevtoolsUrl(chrome) {
    return new Promise((resolve, reject) => {
        let output = '';
        const timeout = setTimeout(() => {
            reject(new Error('Timed out waiting for Chrome DevTools endpoint.'));
        }, 10000);

        const handleData = (chunk) => {
            output += chunk.toString();
            const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
            if (!match) return;

            clearTimeout(timeout);
            resolve(match[1]);
        };

        chrome.stdout.on('data', handleData);
        chrome.stderr.on('data', handleData);
        chrome.once('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
        chrome.once('exit', (code) => {
            if (code === 0) return;
            clearTimeout(timeout);
            reject(new Error(`Chrome exited before DevTools became available: ${code}`));
        });
    });
}

function waitForProcessExit(process) {
    if (process.exitCode !== null) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const timeout = setTimeout(resolve, 2000);
        process.once('exit', () => {
            clearTimeout(timeout);
            resolve();
        });
    });
}

function resolvePublicUrl(value) {
    if (/^(?:https?:|data:|file:)/i.test(value)) return value;

    if (value.startsWith('/')) {
        return pathToFileURL(path.join(publicDir, value.slice(1))).href;
    }

    return pathToFileURL(path.join(publicDir, 'resume', value)).href;
}

function rewriteRootRelativeUrls(markup) {
    return markup.replace(/\b(src|href)\s*=\s*(?:"\/([^"]*)"|'\/([^']*)'|\/([^\s>]+))/g, (_, attr, doubleQuoted, singleQuoted, unquoted) => {
        const value = doubleQuoted ?? singleQuoted ?? unquoted ?? '';
        return `${attr}="${pathToFileURL(path.join(publicDir, value)).href}"`;
    });
}

function readAttribute(tag, attrName) {
    const attrPattern = new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
    const match = tag.match(attrPattern);
    return match ? (match[1] ?? match[2] ?? match[3] ?? '') : '';
}

function findTagStartByAttribute(markup, tagName, attrName, attrValue) {
    const tagPattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
    const attrPattern = new RegExp(`\\b${attrName}\\s*=\\s*(?:"${escapeRegExp(attrValue)}"|'${escapeRegExp(attrValue)}'|${escapeRegExp(attrValue)})(?:\\s|>|/)`, 'i');
    let match;

    while ((match = tagPattern.exec(markup))) {
        if (attrPattern.test(match[0])) return match.index;
    }

    return -1;
}

function findElementEnd(markup, start, tagName) {
    const tagPattern = new RegExp(`</?${tagName}\\b[^>]*>`, 'gi');
    tagPattern.lastIndex = start;

    let depth = 0;
    let match;
    while ((match = tagPattern.exec(markup))) {
        const tag = match[0];
        if (tag.startsWith('</')) {
            depth -= 1;
            if (depth === 0) return tagPattern.lastIndex;
        } else if (!tag.endsWith('/>')) {
            depth += 1;
        }
    }

    return -1;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRasterPdfHtml(pageImages) {
    const pages = pageImages.map((imageUrl, index) => {
        return `<img class="resume-raster-page" src="${imageUrl}" alt="个人简历第 ${index + 1} 页">`;
    }).join('\n');

    return `<!doctype html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <style>
        @page {
            size: A4;
            margin: 0;
        }

        html,
        body {
            width: 210mm;
            margin: 0;
            padding: 0;
            background: #ffffff;
        }

        .resume-raster-page {
            display: block;
            width: 210mm;
            height: 297mm;
            margin: 0;
            object-fit: cover;
            break-after: page;
            page-break-after: always;
        }

        .resume-raster-page:last-child {
            break-after: auto;
            page-break-after: auto;
        }
    </style>
</head>
<body>
${pages}
</body>
</html>`;
}

function buildRasterSourceHtml(resumeSource, styles) {
    return `<!doctype html>
<html lang="zh-CN" data-scheme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${styles}
    <style>
        html,
        body.resume-export-document {
            width: ${sourceWidth}px !important;
            min-width: ${sourceWidth}px !important;
            max-width: ${sourceWidth}px !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background:
                linear-gradient(90deg, rgba(22, 106, 104, 0.09), transparent 22%),
                repeating-linear-gradient(0deg, transparent 0, transparent 31px, rgba(32, 34, 37, 0.018) 32px),
                #fffdf8 !important;
        }

        body.resume-export-document .resume-page-wrap {
            display: block !important;
            width: ${sourceWidth}px !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        body.resume-export-document .resume-pdf-area,
        body.resume-export-document .resume-document {
            width: ${sourceWidth}px !important;
            max-width: none !important;
            margin: 0 !important;
        }

        body.resume-export-document .resume-document {
            box-shadow: none !important;
            background: transparent !important;
        }

        body.resume-export-document .resume-section-title {
            position: static !important;
        }
    </style>
</head>
<body class="resume-export-document">
    <section class="resume-page-wrap" aria-label="个人简历">
        ${resumeSource}
    </section>
</body>
</html>`;
}
