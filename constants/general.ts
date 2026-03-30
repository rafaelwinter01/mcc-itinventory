const ENTITY_NAME_MAP: Record<string, string> = {
    "make-model": "Make/Model",
    device: "Device",
    location: "Location",
    user: "User",
    status: "Status",
    "device_type": "Device Type",
    "user_license": "User License",
    license: "License",
}

export default ENTITY_NAME_MAP;

export const HISTORY_ENTITY_NAME_MAP: Record<string, string> = {
    DEVICE: "device",
    LIFECYCLE: "device_lifecycle",
    DEVICE_TYPE: "device_type",
    LOCATION: "location",
    STATUS: "status",
    MAKE_MODEL: "make_model",
    DEPARTMENT: "department",
    USER: "user",
    SYSTEM_USER: "system_user",
    LICENSE: "license",
    WORKSTATION: "workstation",
}