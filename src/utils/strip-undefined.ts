export function stripUndefined<T extends object>(
    data: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
            result[key] = value;
        }
    }
    return result as { [K in keyof T]?: Exclude<T[K], undefined> };
}