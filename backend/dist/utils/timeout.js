export const withTimeout = async (promise, ms, fallback) => {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error("TIMEOUT"));
        }, ms);
    });
    try {
        return await Promise.race([promise, timeoutPromise]);
    }
    catch (err) {
        if (err instanceof Error && err.message === "TIMEOUT") {
            if (fallback !== undefined) {
                return fallback;
            }
        }
        throw err;
    }
};
//# sourceMappingURL=timeout.js.map