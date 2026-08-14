export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;
export const DEFAULT_SORT_BY = 'createdAt';
export const DEFAULT_SORT_ORDER: SortOrder = 'desc';

export type SortOrder = 'asc' | 'desc';

export interface PaginationParams {
    page?: number | string | undefined;
    limit?: number | string | undefined;
    sortBy?: string | undefined;
    sortOrder?: SortOrder | string | undefined;
}

export interface NormalizedPaginationParams {
    page: number;
    limit: number;
    skip: number;
    take: number;
    sortBy: string;
    sortOrder: SortOrder;
}

export interface PaginationMeta {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
    data: T[];
    meta: PaginationMeta;
}

export function normalizePagination(
    params: PaginationParams = {},
    allowedSortFields: readonly string[] = [],
): NormalizedPaginationParams {
    const rawPage = Number(params.page);
    const rawLimit = Number(params.limit);

    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : DEFAULT_PAGE;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
        : DEFAULT_LIMIT;

    const sortOrder: SortOrder = params.sortOrder === 'asc' ? 'asc' : DEFAULT_SORT_ORDER;

    const sortBy = params.sortBy && allowedSortFields.includes(params.sortBy)
        ? params.sortBy
        : DEFAULT_SORT_BY;

    return {
        page,
        limit,
        skip: (page - 1) * limit,
        take: limit,
        sortBy,
        sortOrder,
    };
}

export function buildPaginationMeta(
    totalItems: number,
    itemCount: number,
    currentPage: number,
    itemsPerPage: number,
): PaginationMeta {
    const totalPages = Math.max(Math.ceil(totalItems / itemsPerPage), 1);

    return {
        totalItems,
        itemCount,
        itemsPerPage,
        totalPages,
        currentPage,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
    };
}

export function buildPaginatedResult<T>(
    data: T[],
    totalItems: number,
    pagination: NormalizedPaginationParams,
): PaginatedResult<T> {
    return {
        data,
        meta: buildPaginationMeta(totalItems, data.length, pagination.page, pagination.limit),
    };
}

export function paginateArray<T>(
    items: T[],
    params: PaginationParams = {},
): PaginatedResult<T> {
    const { page, limit, skip, take } = normalizePagination(params);
    const data = items.slice(skip, skip + take);
    return buildPaginatedResult(data, items.length, { page, limit, skip, take, sortBy: DEFAULT_SORT_BY, sortOrder: DEFAULT_SORT_ORDER });
}

export async function paginateQuery<T>(
    params: PaginationParams,
    allowedSortFields: readonly string[],
    fetchData: (args: { skip: number; take: number; orderBy: Record<string, SortOrder> }) => Promise<T[]>,
    countData: () => Promise<number>,
): Promise<PaginatedResult<T>> {
    const normalized = normalizePagination(params, allowedSortFields);

    const [data, totalItems] = await Promise.all([
        fetchData({
            skip: normalized.skip,
            take: normalized.take,
            orderBy: { [normalized.sortBy]: normalized.sortOrder },
        }),
        countData(),
    ]);

    return buildPaginatedResult(data, totalItems, normalized);
}