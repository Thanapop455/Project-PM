import { useEffect, useMemo, useState } from "react";
import { deviceApi } from "../../api/deviceApi";
import { deviceModelApi } from "../../api/deviceModelApi";
import { deviceTypeApi } from "../../api/deviceTypeApi";
import { zoneApi } from "../../api/zoneApi";
import CrudPage from "../../components/common/CrudPage";
import { toDateInput, todayInput } from "../../utils/date";
import { confirmAction } from "../../utils/sweetAlert";

function Devices() {
  const [types, setTypes] = useState([]);
  const [models, setModels] = useState([]);
  const [zones, setZones] = useState([]);

  useEffect(() => {
    Promise.all([
      deviceTypeApi.getAll().catch(() => []),
      deviceModelApi.getAll().catch(() => []),
      zoneApi.getAll().catch(() => []),
    ]).then(([typeList, modelList, zoneList]) => {
      setTypes(typeList);
      setModels(modelList);
      setZones(zoneList);
    });
  }, []);

  const fields = useMemo(
    () => [
      {
        name: "deviceTypeId",
        label: "Device Type",
        type: "select",
        required: true,
        options: types.map((type) => ({
          label: `${type.group?.name || "-"} / ${type.name}`,
          value: String(type.id),
        })),
      },
      {
        name: "modelId",
        label: "Model",
        type: "select",
        required: true,
        options: models.map((model) => ({
          label: `${model.brand?.name || "-"} / ${model.name}`,
          value: String(model.id),
        })),
      },
      {
        name: "zoneId",
        label: "Zone",
        type: "select",
        required: true,
        options: zones.map((zone) => ({
          label: zone.name ? `${zone.code} - ${zone.name}` : zone.code,
          value: String(zone.id),
        })),
      },
      { name: "serialNumber", label: "Serial Number", required: true },
      { name: "deviceName", label: "Device Name", required: true },
      {
        name: "pmStartDate",
        label: "PM Start Date",
        type: "date",
        required: true,
        defaultValue: todayInput(),
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        defaultValue: "ACTIVE",
        required: true,
        options: [
          { label: "ACTIVE", value: "ACTIVE" },
          { label: "INACTIVE", value: "INACTIVE" },
        ],
      },
    ],
    [models, types, zones]
  );

  return (
    <CrudPage
      api={deviceApi}
      buildPayload={async (form, editingId, editingRow) => {
        const pmStartDateChanged =
          Boolean(editingId) &&
          toDateInput(editingRow?.pmStartDate) !== form.pmStartDate;
        const regeneratePMPlans =
          pmStartDateChanged &&
          (await confirmAction({
            title: "PM Start Date changed",
            text: "ต้องการลบ PM Plan เดิมที่ยัง PENDING และไม่ตรงรอบ แล้วสร้างแผนใหม่จากวันที่นี้หรือไม่? แผน DONE และ PM Record จะไม่ถูกลบ เลือก Save Only เพื่อบันทึก Device โดยไม่ปรับแผน PM",
            icon: "warning",
            confirmButtonText: "Save & Regenerate",
            cancelButtonText: "Save Only",
          }));

        return {
          deviceTypeId: Number(form.deviceTypeId),
          modelId: Number(form.modelId),
          zoneId: Number(form.zoneId),
          serialNumber: form.serialNumber,
          deviceName: form.deviceName,
          pmStartDate: form.pmStartDate,
          regeneratePMPlans,
          status: form.status,
        };
      }}
      columns={[
        { key: "group", label: "Group", path: "type.group.name" },
        { key: "type", label: "Type", path: "type.name" },
        { key: "serialNumber", label: "SN" },
        { key: "brand", label: "Brand", path: "model.brand.name" },
        { key: "model", label: "Model", path: "model.name" },
        { key: "deviceName", label: "Device Name" },
        { key: "zone", label: "Zone", path: "zone.code" },
        { key: "status", label: "Status" },
      ]}
      fields={fields}
      getSuccessMessage={getDeviceSuccessMessage}
      mapRowToForm={(row) => ({
        deviceTypeId: String(row.deviceTypeId),
        modelId: String(row.modelId),
        zoneId: String(row.zoneId),
        serialNumber: row.serialNumber,
        deviceName: row.deviceName,
        pmStartDate: toDateInput(row.pmStartDate),
        status: row.status,
      })}
      searchKeys={[
        "type.group.name",
        "type.name",
        "serialNumber",
        "model.brand.name",
        "model.name",
        "deviceName",
        "zone.code",
        "status",
      ]}
      searchPlaceholder="Search group / type / SN / brand / model / device / zone"
      title="Devices"
    />
  );
}

const getDeviceSuccessMessage = (result) => {
  const inactiveCleanup = result?.inactivePlanCleanup;

  if (inactiveCleanup) {
    return `Device saved as INACTIVE. Pending PM plans cancelled ${
      inactiveCleanup.cancelledPendingPlanCount || 0
    }.`;
  }

  const autoGenerate = result?.autoGeneratePMPlans;

  if (autoGenerate) {
    return `Device saved. PM plans created ${autoGenerate.createdCount || 0}, skipped ${
      autoGenerate.skippedCount || 0
    }.`;
  }

  const reschedule = result?.reschedulePMPlans;

  if (!reschedule) {
    return "Device saved.";
  }

  const years = (reschedule.affectedYears || []).join(", ") || "-";

  return `Device saved. PM plans updated for ${years}: deleted ${
    reschedule.deletedCount || 0
  }, created ${reschedule.createdCount || 0}, restored ${
    reschedule.restoredCount || 0
  }, skipped ${reschedule.skippedCount || 0}.`;
};

export default Devices;
