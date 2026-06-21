import { userApi } from "../../api/userApi";
import CrudPage from "../../components/common/CrudPage";

function Users() {
  return (
    <CrudPage
      api={userApi}
      buildPayload={(form, editingId) => {
        const payload = {
          username: form.username,
          fullName: form.fullName,
          role: form.role,
          isActive: form.isActive,
        };

        if (!editingId || form.password) {
          payload.password = form.password;
        }

        return payload;
      }}
      columns={[
        { key: "username", label: "Username" },
        { key: "fullName", label: "Full Name" },
        { key: "role", label: "Role" },
        {
          key: "isActive",
          label: "Active",
          render: (row) => (row.isActive ? "Yes" : "No"),
        },
      ]}
      fields={[
        { name: "username", label: "Username", required: true },
        { name: "password", label: "Password", type: "password" },
        { name: "fullName", label: "Full Name", required: true },
        {
          name: "role",
          label: "Role",
          type: "select",
          defaultValue: "STAFF",
          required: true,
          options: [
            { label: "ADMIN", value: "ADMIN" },
            { label: "STAFF", value: "STAFF" },
          ],
        },
        {
          name: "isActive",
          label: "Active",
          type: "checkbox",
          defaultValue: true,
        },
      ]}
      mapRowToForm={(row) => ({
        username: row.username,
        password: "",
        fullName: row.fullName,
        role: row.role,
        isActive: row.isActive,
      })}
      searchKeys={["username", "fullName", "role", "isActive"]}
      searchPlaceholder="Search username / full name / role / active"
      title="Users"
    />
  );
}

export default Users;
