/**
 * Helper to get the worker URL.
 */
export const getWorkerUrl = () => new URL('./ascii-worker.ts', import.meta.url);
