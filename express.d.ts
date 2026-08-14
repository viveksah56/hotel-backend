import type { ParsedQs } from 'qs';

declare global {
    namespace Express {
        interface Request {
            validatedQuery?: ParsedQs;
        }
    }
}

export {};