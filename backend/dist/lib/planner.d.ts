import { z } from "zod";
declare const PlannerSchema: z.ZodObject<{
    needsWebSearch: z.ZodBoolean;
    reason: z.ZodString;
    subQuestions: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
type ResearchPlan = z.infer<typeof PlannerSchema>;
export declare const planResearch: (question: string, reportId: string) => Promise<ResearchPlan>;
export {};
//# sourceMappingURL=planner.d.ts.map