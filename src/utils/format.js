export const formValidationError = (errors) => {
    if (!errors || !errors.iss) return "validation error";
    if (Array.isArray(errors.iss)) return errors.iss.map((i) => i.message).join(", ");
    return JSON.stringify(errors.iss);
}