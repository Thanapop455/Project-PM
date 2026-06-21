import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

export const confirmAction = async ({
  title,
  text,
  icon = "question",
  confirmButtonText = "Confirm",
  cancelButtonText = "Cancel",
  danger = false,
}) => {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor: danger ? "#dc4545" : "#247fb4",
    cancelButtonColor: "#64748b",
    reverseButtons: true,
    focusCancel: true,
    allowOutsideClick: false,
  });

  return result.isConfirmed;
};

export const promptRequiredText = async ({
  title,
  label,
  placeholder,
  confirmButtonText = "Confirm",
}) => {
  const result = await Swal.fire({
    title,
    input: "textarea",
    inputLabel: label,
    inputPlaceholder: placeholder,
    inputAttributes: {
      maxlength: "200",
      "aria-label": label,
    },
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: "Cancel",
    confirmButtonColor: "#dc4545",
    cancelButtonColor: "#64748b",
    reverseButtons: true,
    focusCancel: true,
    allowOutsideClick: false,
    inputValidator: (value) =>
      String(value || "").trim() ? undefined : "Please enter a reason",
  });

  return result.isConfirmed ? String(result.value).trim() : null;
};
