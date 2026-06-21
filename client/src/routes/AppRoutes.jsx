import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminRoute from "./AdminRoute";
import ProtectedRoute from "./ProtectedRoute";
import AuthLayout from "../layouts/AuthLayout";
import MainLayout from "../layouts/MainLayout";
import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import Users from "../pages/users/Users";
import Devices from "../pages/devices/Devices";
import DeviceGroups from "../pages/deviceGroups/DeviceGroups";
import DeviceTypes from "../pages/deviceTypes/DeviceTypes";
import Brands from "../pages/brands/Brands";
import DeviceModels from "../pages/deviceModels/DeviceModels";
import Zones from "../pages/zones/Zones";
import PMPolicies from "../pages/pmPolicies/PMPolicies";
import PMPlans from "../pages/pmPlans/PMPlans";
import PMRecords from "../pages/pmRecords/PMRecords";
import Reports from "../pages/reports/Reports";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pm-plans" element={<PMPlans />} />
            <Route path="/pm-records" element={<PMRecords />} />
            <Route path="/reports" element={<Reports />} />

            <Route element={<AdminRoute />}>
              <Route path="/users" element={<Users />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/device-groups" element={<DeviceGroups />} />
              <Route path="/device-types" element={<DeviceTypes />} />
              <Route path="/brands" element={<Brands />} />
              <Route path="/device-models" element={<DeviceModels />} />
              <Route path="/zones" element={<Zones />} />
              <Route path="/pm-policies" element={<PMPolicies />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
