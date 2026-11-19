// Forwards errors from async controllers to the central error handler in app.js.
export const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        next(error);
    }
};
