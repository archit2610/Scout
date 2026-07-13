export const withTimeout = async <T>(
    promise: Promise<T>,
    ms: number,
    fallback?: T
): Promise<T> => {
    const timeoutPromise = new Promise<T>((_, reject) => {
        setTimeout(() => {
            reject(new Error("TIMEOUT"));
        }, ms);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } catch (err) {
        if (err instanceof Error && err.message === "TIMEOUT") {
            if (fallback !== undefined) {
                return fallback;
            }
        }

        throw err;
    }
};