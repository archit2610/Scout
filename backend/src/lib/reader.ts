import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { google } from "@ai-sdk/google";
import { generateText } from 'ai';

interface SearchResult {
    url: string;
    title: string;
    content: string;
}

export const fetchAndExtract = async (results: SearchResult[], question: string, reportId: string): Promise<string> => {

    const pages = await Promise.all(
        results.map(async (result) => {
            try {
                const res = await fetch(result.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000), })
                const html = await res.text()
                const doc = new JSDOM(html, { url: result.url })
                const article = new Readability(doc.window.document).parse()
                const text = article?.textContent?.slice(0, 4000) ?? ''

                return {
                    url: result.url,
                    title: result.title,
                    text,
                };
            }
            catch (err) {
                console.log(err)
                return null;
            }
        })
    );

    const validPages = pages.filter(
        (page): page is NonNullable<typeof page> => page !== null
    );
    const mergedText = validPages.slice(0, 8)
        .map(
            page => `
                    URL: ${page!.url}

                    TITLE: ${page!.title}

                    CONTENT:
                    ${page!.text}
                    `
        )
        .join("\n\n====================\n\n");

    const extraction = await generateText({
        model: google("gemini-2.5-flash"),
        prompt: `
                Question:
                ${question}

                Sources:

                ${mergedText}

               You are an information extraction system.

                Given multiple webpages, extract ONLY facts relevant to the user's question.

                Requirements:
                - Remove duplicate information.
                - Ignore advertisements and navigation.
                - Preserve the source URL for every fact.
                - Return markdown bullet points.
                - If no relevant information exists, say "NO_RELEVANT_INFORMATION".
                                `
    });

    return extraction.text;
}

