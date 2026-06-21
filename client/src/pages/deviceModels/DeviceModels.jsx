import { useEffect, useMemo, useState } from "react";
import { brandApi } from "../../api/brandApi";
import { deviceModelApi } from "../../api/deviceModelApi";
import CrudPage from "../../components/common/CrudPage";

function DeviceModels() {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    brandApi.getAll().then(setBrands).catch(() => setBrands([]));
  }, []);

  const fields = useMemo(
    () => [
      {
        name: "brandId",
        label: "Brand",
        type: "select",
        required: true,
        options: brands.map((brand) => ({
          label: brand.name,
          value: String(brand.id),
        })),
      },
      { name: "name", label: "Name", required: true },
    ],
    [brands]
  );

  return (
    <CrudPage
      api={deviceModelApi}
      buildPayload={(form) => ({
        brandId: Number(form.brandId),
        name: form.name,
      })}
      columns={[
        { key: "name", label: "Name" },
        { key: "brand", label: "Brand", path: "brand.name" },
      ]}
      fields={fields}
      mapRowToForm={(row) => ({
        brandId: String(row.brandId),
        name: row.name,
      })}
      searchKeys={["name", "brand.name"]}
      searchPlaceholder="Search model / brand"
      title="Device Models"
    />
  );
}

export default DeviceModels;
