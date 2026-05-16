export const DEFAULT_LIST_PAGE_SIZE = 50;
export const MAX_LIST_PAGE_SIZE = 100;

export type ListPagination = {
  page: number;
  pageSize: number;
  offset: number;
};

export function readListPagination(
  searchParams: { [key: string]: string | string[] | undefined },
  options: { defaultPageSize?: number } = {}
): ListPagination {
  const read = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value : null;
  };

  const defaultPageSize = options.defaultPageSize ?? DEFAULT_LIST_PAGE_SIZE;
  const rawPage = Number.parseInt(read("page") ?? "1", 10);
  const rawSize = Number.parseInt(read("pageSize") ?? String(defaultPageSize), 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize =
    Number.isFinite(rawSize) && rawSize > 0
      ? Math.min(rawSize, MAX_LIST_PAGE_SIZE)
      : defaultPageSize;

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function buildPageHref(
  basePath: string,
  current: URLSearchParams,
  page: number
): string {
  const params = new URLSearchParams(current);
  if (page <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
