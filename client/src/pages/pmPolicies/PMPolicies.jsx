import { useEffect, useMemo, useState } from "react";
import { deviceGroupApi } from "../../api/deviceGroupApi";
import { deviceTypeApi } from "../../api/deviceTypeApi";
import { pmPolicyApi } from "../../api/pmPolicyApi";
import CrudPage from "../../components/common/CrudPage";

function PMPolicies() {
  const [groups, setGroups] = useState([]);
  const [types, setTypes] = useState([]);

  useEffect(() => {
    Promise.all([
      deviceGroupApi.getAll().catch(() => []),
      deviceTypeApi.getAll().catch(() => []),
    ]).then(([groupList, typeList]) => {
      setGroups(groupList);
      setTypes(typeList);
    });
  }, []);

  const fields = useMemo(
    () => [
      {
        name: "target",
        label: "Target",
        type: "select",
        defaultValue: "GROUP",
        required: true,
        options: [
          { label: "Device Group", value: "GROUP" },
          { label: "Device Type", value: "TYPE" },
        ],
      },
      {
        name: "deviceGroupId",
        label: "Device Group",
        type: "select",
        required: true,
        hidden: (form) => form.target !== "GROUP",
        options: groups.map((group) => ({
          label: group.name,
          value: String(group.id),
        })),
      },
      {
        name: "deviceTypeId",
        label: "Device Type",
        type: "select",
        required: true,
        hidden: (form) => form.target !== "TYPE",
        options: types.map((type) => ({
          label: `${type.group?.name || "-"} / ${type.name}`,
          value: String(type.id),
        })),
      },
      {
        name: "intervalMonths",
        label: "Interval Months",
        type: "number",
        min: "1",
        defaultValue: "3",
        required: true,
      },
      {
        name: "defaultCost",
        label: "Default Cost",
        type: "number",
        min: "0",
        step: "0.01",
        required: true,
      },
      {
        name: "isActive",
        label: "Active",
        type: "checkbox",
        defaultValue: true,
      },
    ],
    [groups, types]
  );

  return (
    <CrudPage
      api={pmPolicyApi}
      buildPayload={(form) => ({
        target: form.target,
        deviceGroupId:
          form.target === "GROUP" ? Number(form.deviceGroupId) : undefined,
        deviceTypeId:
          form.target === "TYPE" ? Number(form.deviceTypeId) : undefined,
        intervalMonths: Number(form.intervalMonths),
        defaultCost: Number(form.defaultCost),
        isActive: form.isActive,
      })}
      columns={[
        { key: "target", label: "Target" },
        {
          key: "applyTo",
          label: "Apply To",
          render: (row) =>
            row.target === "GROUP"
              ? row.deviceGroup?.name
              : `${row.deviceType?.group?.name || "-"} / ${row.deviceType?.name}`,
        },
        { key: "intervalMonths", label: "Interval" },
        { key: "defaultCost", label: "Default Cost" },
        {
          key: "isActive",
          label: "Active",
          render: (row) => (row.isActive ? "Yes" : "No"),
        },
      ]}
      fields={fields}
      mapRowToForm={(row) => ({
        target: row.target,
        deviceGroupId: row.deviceGroupId ? String(row.deviceGroupId) : "",
        deviceTypeId: row.deviceTypeId ? String(row.deviceTypeId) : "",
        intervalMonths: String(row.intervalMonths),
        defaultCost: String(row.defaultCost),
        isActive: row.isActive,
      })}
      searchKeys={[
        "target",
        "deviceGroup.name",
        "deviceType.group.name",
        "deviceType.name",
        "intervalMonths",
        "defaultCost",
        "isActive",
      ]}
      searchPlaceholder="Search target / group / type / interval / cost / active"
      title="PM Policies"
    />
  );
}

export default PMPolicies;
