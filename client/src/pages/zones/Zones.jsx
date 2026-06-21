import { zoneApi } from "../../api/zoneApi";
import CrudPage from "../../components/common/CrudPage";

function Zones() {
  return (
    <CrudPage
      api={zoneApi}
      buildPayload={(form) => ({
        code: form.code,
      })}
      columns={[
        { key: "code", label: "Zone Code" },
      ]}
      fields={[
        { name: "code", label: "Zone Code", required: true },
      ]}
      mapRowToForm={(row) => ({
        code: row.code,
      })}
      searchKeys={["code"]}
      searchPlaceholder="Search zone"
      title="Zones"
    />
  );
}

export default Zones;
