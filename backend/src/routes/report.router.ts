import { Router } from "express";
import {
    createResearch,
    getAllReports,
    getReport,
    updateReportById,
    deleteReport
} from "../controllers/reports.controller.js";
import {
    runReport,
    anonymousrun
} from '../controllers/research.controller.js'
import { guestSessionMiddleware } from "../middlewares/guest.middleware.js";

const router = Router();

router.route('/create').post(guestSessionMiddleware, createResearch)
router.route('/get-allReports').get(guestSessionMiddleware, getAllReports)
router.route('/report/:token').get(guestSessionMiddleware, getReport)
router.route('/update-report/:token').post(guestSessionMiddleware, updateReportById)
router.route('/delete-Report/:token').get(guestSessionMiddleware, deleteReport)
router.route('/report/:token/run').get(guestSessionMiddleware, runReport)
router.route('/research').post(guestSessionMiddleware, anonymousrun)

export default router;