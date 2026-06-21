import { brandApi } from "../../api/brandApi";
import CrudPage from "../../components/common/CrudPage";

function Brands() {
  return (
    <CrudPage
      api={brandApi}
      columns={[{ key: "name", label: "Name" }]}
      fields={[{ name: "name", label: "Name", required: true }]}
      searchKeys={["name"]}
      searchPlaceholder="Search brand"
      title="Brands"
    />
  );
}

export default Brands;
