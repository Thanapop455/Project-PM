import { useEffect, useMemo, useState } from "react";

function DataTable({
  columns,
  data,
  actions,
  emptyText = "No data",
  pageSize = 10,
  pageSizeOptions = [10, 20, 50],
  pagination,
  onPageChange,
  onPageSizeChange,
}) {
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(pageSize);
  const isServerPaginated = Boolean(pagination);
  const currentPage = isServerPaginated ? pagination.page : localPage;
  const rowsPerPage = isServerPaginated ? pagination.pageSize : localPageSize;
  const totalRows = isServerPaginated ? pagination.total : data.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const showPagination = totalRows > 0;

  useEffect(() => {
    if (!isServerPaginated) {
      setLocalPage(1);
    }
  }, [data.length, isServerPaginated, localPageSize]);

  const visibleData = useMemo(() => {
    if (isServerPaginated || totalRows <= rowsPerPage) {
      return data;
    }

    const start = (currentPage - 1) * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [currentPage, data, isServerPaginated, rowsPerPage, totalRows]);

  const firstRow = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const lastRow = Math.min(currentPage * rowsPerPage, totalRows);

  const changePage = (nextPage) => {
    const safePage = Math.max(1, Math.min(totalPages, nextPage));

    if (isServerPaginated) {
      onPageChange?.(safePage);
    } else {
      setLocalPage(safePage);
    }
  };

  const changePageSize = (nextPageSize) => {
    if (isServerPaginated) {
      onPageSizeChange?.(nextPageSize);
    } else {
      setLocalPageSize(nextPageSize);
      setLocalPage(1);
    }
  };

  return (
    <>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              {actions && <th className="text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {totalRows === 0 ? (
              <tr>
                <td className="empty-cell" colSpan={columns.length + (actions ? 1 : 0)}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              visibleData.map((row) => (
                <tr key={row.id || row.no || JSON.stringify(row)}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render ? column.render(row) : row[column.key] ?? "-"}
                    </td>
                  ))}
                  {actions && <td className="text-right">{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="table-pagination">
          <span>
            Showing {firstRow}-{lastRow} of {totalRows}
          </span>
          <div className="table-pagination-controls">
            <label>
              Rows
              <select
                value={rowsPerPage}
                onChange={(event) => changePageSize(Number(event.target.value))}
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={currentPage === 1}
              type="button"
              onClick={() => changePage(currentPage - 1)}
            >
              Previous
            </button>
            <strong>
              {currentPage} / {totalPages}
            </strong>
            <button
              disabled={currentPage === totalPages}
              type="button"
              onClick={() => changePage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default DataTable;
