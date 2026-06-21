import { useEffect, useMemo, useState } from "react";
import Button from "./Button";
import ErrorMessage from "./ErrorMessage";
import Loading from "./Loading";
import DataTable from "../table/DataTable";
import DateInput from "./DateInput";
import { confirmAction } from "../../utils/sweetAlert";

const getInitialForm = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue ?? "";
    return acc;
  }, {});

const getRowValue = (row, path) =>
  path.split(".").reduce((value, key) => value?.[key], row);

function CrudPage({
  title,
  api,
  columns,
  fields,
  buildPayload,
  mapRowToForm,
  canEdit = true,
  canDelete = true,
  extraActions,
  getSuccessMessage,
  searchPlaceholder = "",
}) {
  const initialForm = useMemo(() => getInitialForm(fields), [fields]);
  const [rows, setRows] = useState([]);
  const [tableSearch, setTableSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = async ({
    page = pagination.page,
    pageSize = pagination.pageSize,
    search = tableSearch,
  } = {}) => {
    setLoading(true);
    setError("");

    try {
      const result = await api.getAll({
        paginate: true,
        page,
        pageSize,
        search: search.trim() || undefined,
      });
      setRows(Array.isArray(result?.data) ? result.data : []);
      setPagination(result?.pagination || {
        page: 1,
        pageSize,
        total: 0,
        totalPages: 1,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadData();
    }, tableSearch ? 250 : 0);

    return () => window.clearTimeout(timeoutId);
  }, [pagination.page, pagination.pageSize, tableSearch]);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setEditingRow(null);
    setForm(initialForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const wasEditing = Boolean(editingId);
      const currentEditingRow = editingRow;
      const payload = buildPayload
        ? await buildPayload(form, editingId, editingRow)
        : form;
      let result;

      if (editingId) {
        result = await api.update(editingId, payload);
      } else {
        result = await api.create(payload);
      }

      resetForm();
      await loadData({ page: wasEditing ? pagination.page : 1 });

      const successMessage = getSuccessMessage?.(result, {
        editing: wasEditing,
        form,
        row: currentEditingRow,
      });

      if (successMessage) {
        setNotice(successMessage);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
    setEditingRow(row);
    setForm(mapRowToForm ? mapRowToForm(row) : row);
  };

  const handleDelete = async (row) => {
    const confirmed = await confirmAction({
      title: `Delete ${title} item?`,
      text: "ระบบจะลบข้อมูล หรือเปลี่ยนเป็น INACTIVE หากมีประวัติอ้างอิงอยู่",
      icon: "warning",
      confirmButtonText: "Delete",
      danger: true,
    });

    if (!confirmed) return;

    setError("");

    try {
      await api.remove(row.id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const renderField = (field) => {
    if (field.hidden?.(form)) return null;

    const value = form[field.name] ?? "";

    if (field.type === "select") {
      return (
        <label className="field" key={field.name}>
          <span>{field.label}</span>
          <select
            disabled={field.disabled}
            required={field.required}
            value={value}
            onChange={(event) => handleChange(field.name, event.target.value)}
          >
            <option value="">{field.placeholder || `Select ${field.label}`}</option>
            {(field.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (field.type === "checkbox") {
      return (
        <label className="checkbox-field" key={field.name}>
          <input
            checked={Boolean(value)}
            type="checkbox"
            onChange={(event) => handleChange(field.name, event.target.checked)}
          />
          <span>{field.label}</span>
        </label>
      );
    }

    if (field.type === "textarea") {
      return (
        <label className="field" key={field.name}>
          <span>{field.label}</span>
          <textarea
            rows={field.rows || 3}
            value={value}
            onChange={(event) => handleChange(field.name, event.target.value)}
          />
        </label>
      );
    }

    if (field.type === "date") {
      return (
        <DateInput
          disabled={field.disabled}
          key={field.name}
          label={field.label}
          required={field.required}
          value={value}
          onChange={(nextValue) => handleChange(field.name, nextValue)}
        />
      );
    }

    return (
      <label className="field" key={field.name}>
        <span>{field.label}</span>
        <input
          min={field.min}
          placeholder={field.placeholder}
          required={field.required}
          step={field.step}
          type={field.type || "text"}
          value={value}
          onChange={(event) => handleChange(field.name, event.target.value)}
        />
      </label>
    );
  };

  const tableColumns = columns.map((column) => ({
    ...column,
    render:
      column.render ||
      (column.path ? (row) => getRowValue(row, column.path) ?? "-" : undefined),
  }));
  return (
    <div className="crud-page">
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          <p>Manage {title.toLowerCase()} data</p>
        </div>
        <Button onClick={loadData} variant="secondary">
          Refresh
        </Button>
      </div>

      <ErrorMessage message={error} />
      {notice && <div className="success-message">{notice}</div>}

      <div className="crud-grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h3>{editingId ? "Edit" : "Add"} Item</h3>
          {fields.map(renderField)}
          <div className="form-actions">
            <Button disabled={submitting} type="submit">
              {submitting ? "Saving..." : editingId ? "Save" : "Add"}
            </Button>
            {editingId && (
              <Button onClick={resetForm} variant="secondary">
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="panel crud-table-panel">
          {searchPlaceholder && (
            <div className="table-toolbar">
              <label className="field table-search-field">
                <span>Search</span>
                <input
                  placeholder={searchPlaceholder}
                  type="search"
                  value={tableSearch}
                  onChange={(event) => setTableSearch(event.target.value)}
                />
              </label>
            </div>
          )}
          {loading ? (
            <Loading />
          ) : (
            <DataTable
              actions={(row) => (
                <div className="table-actions">
                  {extraActions?.(row)}
                  {canEdit && (
                    <Button onClick={() => handleEdit(row)} variant="secondary">
                      Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button onClick={() => handleDelete(row)} variant="danger">
                      Delete
                    </Button>
                  )}
                </div>
              )}
              columns={tableColumns}
              data={rows}
              pagination={pagination}
              onPageChange={(page) =>
                setPagination((current) => ({ ...current, page }))
              }
              onPageSizeChange={(pageSize) =>
                setPagination((current) => ({ ...current, page: 1, pageSize }))
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default CrudPage;
