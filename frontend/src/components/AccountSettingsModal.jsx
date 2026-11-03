import React from "react";
import UserManagementModal from "./UserManagementModal";

/**
 * Unified AccountSettingsModal proxy pointing to enterprise UserManagementModal.
 */
export default function AccountSettingsModal(props) {
  return <UserManagementModal {...props} />;
}
