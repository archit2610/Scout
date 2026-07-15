
export const UserRolesEnum = {
    ADMIN: "admin",
    PROJECT_ADMIN: "project_admin",
    MEMBER: "member",
};

export const AvailableUserRoles = Object.values(UserRolesEnum);

export const TaskStatusEnum = {
    TODO: "todo",
    IN_PROGRESS: "in_progress",
    DONE: "done",
};

export const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
};

export const AvailableTaskStatuses = Object.values(TaskStatusEnum);