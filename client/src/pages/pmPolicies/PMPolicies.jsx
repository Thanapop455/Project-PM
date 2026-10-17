import { useEffect, useMemo, useState } from "react";
import { deviceGroupApi } from "../../api/deviceGroupApi";
import { pmPolicyApi } from "../../api/pmPolicyApi";
import CrudPage from "../../components/common/CrudPage";

function PMPolicies() {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    deviceGroupApi.getAll().then(setGroups).catch(() => setGroups([]));
  }, []);

  const fields = useMemo(
    () => [
      {
        name: "deviceGroupId",
        label: "Device Group",
        type: "select",
        required: true,
        options: groups.map((group) => ({
          label: group.name,
          value: String(group.id),
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
    [groups]
  );

  return (
    <CrudPage
      api={pmPolicyApi}
      buildPayload={(form) => ({
        target: "GROUP",
        deviceGroupId: Number(form.deviceGroupId),
        intervalMonths: Number(form.intervalMonths),
        defaultCost: Number(form.defaultCost),
        isActive: form.isActive,
      })}
      columns={[
        {
          key: "deviceGroup",
          label: "Device Group",
          render: (row) => row.deviceGroup?.name || "-",
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
      getSuccessMessage={(result, { editing }) => {
        const sync = result?.planSync;

        if (!sync) {
          return editing ? "PM Policy saved." : "PM Policy added.";
        }

        if (editing && !result.scheduleChanged) {
          return "PM Policy saved. The cost was updated; PM plan dates were unchanged.";
        }

        const years = (sync.affectedYears || []).join(", ") || "-";
        return `PM Policy saved. Pending plans updated for ${years}: deleted ${
          sync.deletedCount || 0
        }, created ${sync.createdCount || 0}, restored ${
          sync.restoredCount || 0
        }, skipped ${sync.skippedCount || 0}.`;
      }}
      mapRowToForm={(row) => ({
        deviceGroupId: row.deviceGroupId ? String(row.deviceGroupId) : "",
        intervalMonths: String(row.intervalMonths),
        defaultCost: String(row.defaultCost),
        isActive: row.isActive,
      })}
      searchKeys={[
        "deviceGroup.name",
        "intervalMonths",
        "defaultCost",
        "isActive",
      ]}
      searchPlaceholder="Search group / interval / cost / active"
      title="PM Policies"
    />
  );
}

export default PMPolicies;
