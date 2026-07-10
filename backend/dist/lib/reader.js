import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { db } from '../db/index.js';
import { toolCalls } from '../db/schema.js';
import { google } from "@ai-sdk/google";
import { generateText } from 'ai';
export const fetchAndExtract = async (url, subQuestion, reportId) => {
    const start = Date.now();
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000), });
        const html = await res.text();
        const doc = new JSDOM(html, { url });
        const article = new Readability(doc.window.document).parse();
        const text = article?.textContent?.slice(0, 4000) ?? '';
        if (!text)
            return null;
        const extraction = await generateText({
            model: google("gemini-2.5-flash"),
            messages: [{
                    role: 'user',
                    content: `Extract only facts relevant to: "${subQuestion}"\n\nSource:\n${text}\n\nReturn bullet points only. If nothing relevant, return "IRRELEVANT".`
                }]
        });
        const usage = await extraction.usage;
        const facts = extraction.text;
        if (facts.trim() === 'IRRELEVANT')
            return null;
        await db.insert(toolCalls).values({
            reportId,
            stage: 'reader',
            toolName: 'fetch_url',
            inputJson: { url, subQuestion },
            outputJson: { facts },
            latencyMs: Date.now() - start,
            inputTokens: usage?.inputTokens ?? 0,
            outputTokens: usage?.outputTokens ?? 0,
        });
        return { url, facts };
    }
    catch (err) {
        await db.insert(toolCalls).values({
            reportId, stage: 'reader', toolName: 'fetch_url',
            inputJson: { url }, error: String(err), latencyMs: Date.now() - start,
        });
        return null;
    }
};
//# sourceMappingURL=reader.js.map