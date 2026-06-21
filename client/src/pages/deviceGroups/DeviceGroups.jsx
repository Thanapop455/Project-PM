import { deviceGroupApi } from "../../api/deviceGroupApi";
import CrudPage from "../../components/common/CrudPage";

function DeviceGroups() {
  return (
    <CrudPage
      api={deviceGroupApi}
      columns={[{ key: "name", label: "Name" }]}
      fields={[{ name: "name", label: "Name", required: true }]}
      searchKeys={["name"]}
      searchPlaceholder="Search device group"
      title="Device Groups"
    />
  );
}

export default DeviceGroups;
