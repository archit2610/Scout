import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import {
    createReport,
    getReportById,
    getReportsByUser,
    updateReport,
    deletereport
} from "../services/report.js";

export const createResearch = asyncHandler(async (req, res) => {
    const { question } = req.body

    if (!question) throw new ApiError(400, "please enter question")

    const report = await createReport(req.user!.id, question.trim())
    if (!report) throw new ApiError(400, "please enter question")

    res.status(200).json(new ApiResponse(200, { report }, "question stored"))

})

export const getAllReports = asyncHandler(async (req, res) => {
    const reports = await getReportsByUser(req.user!.id)
    if (!reports) throw new ApiError(400, "Unable to fetch")

    res.status(200).json(new ApiResponse(200, { reports }, "question fetched"))

})

export const getReport = asyncHandler(async (req, res) => {
    const { token } = req.params
    const report = await getReportById(token as string)
    if (!report) throw new ApiError(400, "Unable to fetch")

    res.status(200).json(new ApiResponse(200, { report }, "question fetched"))

})

export const updateReportById = asyncHandler(async (req, res) => {
    const { question } = req.body
    const { token } = req.params
    if (!question) throw new ApiError(400, "please enter question")

    const report = await updateReport(token as string, { question })

    if (!report) throw new ApiError(400, "Unable to fetch")

    res.status(200).json(new ApiResponse(200, { report }, "question updated"))
})

export const deleteReport = asyncHandler(async (req, res) => {
    const { token } = req.params
    if (!token) throw new ApiError(400, "error while delteing select the query you want to delete")

    const report = await deletereport(token as string)
    if (!token) throw new ApiError(400, "error while delteing ")

    res.status(200).json(new ApiResponse(200, { report }, "deleted succesfully"))

})