const config = { backendUrl: (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '') };
export { config as urlConfig };
