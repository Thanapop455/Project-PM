const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getPagination = (query = {}) => {
  const requested =
    String(query.paginate).toLowerCase() === "true" ||
    query.page !== undefined ||
    query.pageSize !== undefined;

  if (!requested) return null;

  return {
    page: toPositiveInteger(query.page, 1),
    pageSize: Math.min(
      toPositiveInteger(query.pageSize, DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    ),
  };
};

const findManyPaginated = async (model, args, query = {}) => {
  const pagination = getPagination(query);

  if (!pagination) {
    return model.findMany(args);
  }

  const total = await model.count({ where: args.where });
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  const page = Math.min(pagination.page, totalPages);
  const data = await model.findMany({
    ...args,
    skip: (page - 1) * pagination.pageSize,
    take: pagination.pageSize,
  });

  return {
    data,
    pagination: {
      page,
      pageSize: pagination.pageSize,
      total,
      totalPages,
    },
  };
};

const mapPaginated = (result, mapper) => {
  if (Array.isArray(result)) {
    return result.map(mapper);
  }

  return {
    ...result,
    data: result.data.map(mapper),
  };
};

module.exports = {
  findManyPaginated,
  getPagination,
  mapPaginated,
};
