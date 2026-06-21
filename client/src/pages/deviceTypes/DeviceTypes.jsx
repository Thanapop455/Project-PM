import { useEffect, useMemo, useState } from "react";
import { deviceGroupApi } from "../../api/deviceGroupApi";
import { deviceTypeApi } from "../../api/deviceTypeApi";
import CrudPage from "../../components/common/CrudPage";

function DeviceTypes() {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    deviceGroupApi.getAll().then(setGroups).catch(() => setGroups([]));
  }, []);

  const fields = useMemo(
    () => [
      {
        name: "groupId",
        label: "Group",
        type: "select",
        required: true,
        options: groups.map((group) => ({
          label: group.name,
          value: String(group.id),
        })),
      },
      { name: "name", label: "Name", required: true },
    ],
    [groups]
  );

  return (
    <CrudPage
      api={deviceTypeApi}
      buildPayload={(form) => ({
        groupId: Number(form.groupId),
        name: form.name,
      })}
      columns={[
        { key: "name", label: "Name" },
        { key: "group", label: "Group", path: "group.name" },
      ]}
      fields={fields}
      mapRowToForm={(row) => ({
        groupId: String(row.groupId),
        name: row.name,
      })}
      searchKeys={["name", "group.name"]}
      searchPlaceholder="Search type / group"
      title="Device Types"
    />
  );
}

export default DeviceTypes;
