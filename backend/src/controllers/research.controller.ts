import Anthropic from '@anthropic-ai/sdk'
import { asyncHandler } from '../utils/async-handler.js'
import { Request, Response } from 'express'
import {
    getReportById,
    updateReport
} from '../services/report.js'
import { ApiError } from '../utils/api-error.js'
import { ApiResponse } from '../utils/api-response.js'

const claude = new Anthropic()

export const runReport = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const report = await getReportById(token as string)
    if (!report || report.userId !== req.user!.id) throw new ApiError(404, 'Report not found')

    const reportId = report.id as string
    await updateReport(reportId, { status: 'running' })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const send = (data: object) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    try {
        send({ type: 'stage', label: 'Generating answer...' })

        let fullText = ''

        const stream = claude.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: 'You are a research assistant. Write a thorough, well-structured answer in markdown.',
            messages: [{ role: 'user', content: report.question }],
        })

        for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                fullText += chunk.delta.text
                send({ type: 'token', data: chunk.delta.text })
            }
        }

        const finalMsg = await stream.finalMessage()
        const usage = finalMsg.usage
        const cost = (usage.input_tokens * 0.000003) + (usage.output_tokens * 0.000015)

        await updateReport(reportId, {
            reportMd: fullText,
            status: 'done',
            tokensUsed: usage.input_tokens + usage.output_tokens,
            costUsd: cost,
        })

        send({ type: 'done' })
        res.end()

    } catch (err) {
        await updateReport(reportId, { status: 'error' })
        send({ type: 'error', message: "Failed to generate report" })
        res.end()
        console.error(err)
    }
})