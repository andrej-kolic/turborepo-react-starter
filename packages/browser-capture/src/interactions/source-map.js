import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';

export async function resolveSourceLocation(scriptUrl, line, col) {
  try {
    if (!scriptUrl.startsWith('http://') && !scriptUrl.startsWith('https://')) {
      return null;
    }

    const scriptRes = await fetch(scriptUrl);
    if (!scriptRes.ok) return null;
    const scriptText = await scriptRes.text();

    const scriptLines = scriptText.split('\n');
    let sourceMapRef = null;
    for (
      let i = scriptLines.length - 1;
      i >= Math.max(0, scriptLines.length - 10);
      i--
    ) {
      const t = scriptLines[i].trim();
      const m =
        t.match(/\/\/[#@]\s*sourceMappingURL=(.+)/) ||
        t.match(/\/\*[#@]\s*sourceMappingURL=(.+?)\s*\*\//);
      if (m) {
        sourceMapRef = m[1].trim();
        break;
      }
    }
    if (!sourceMapRef) return null;

    let rawMap;
    if (sourceMapRef.startsWith('data:')) {
      const comma = sourceMapRef.indexOf(',');
      if (comma === -1) return null;
      const payload = sourceMapRef.slice(comma + 1);
      const header = sourceMapRef.slice(5, comma).toLowerCase();
      rawMap = header.includes('base64')
        ? Buffer.from(payload, 'base64').toString('utf8')
        : decodeURIComponent(payload);
    } else {
      const mapUrl = new URL(sourceMapRef, scriptRes.url).href;
      const mapRes = await fetch(mapUrl);
      if (!mapRes.ok) return null;
      rawMap = await mapRes.text();
    }

    const tracer = new TraceMap(JSON.parse(rawMap));
    const pos = originalPositionFor(tracer, { line, column: col });
    if (!pos.source || pos.line == null) return null;

    return { source: pos.source, line: pos.line, column: pos.column ?? 0 };
  } catch {
    return null;
  }
}
