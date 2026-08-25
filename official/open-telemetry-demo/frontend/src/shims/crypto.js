export const randomUUID =
  globalThis.crypto?.randomUUID?.bind(globalThis.crypto) ??
  (() => {
    throw new Error("crypto.randomUUID is not available");
  });

export default { randomUUID };
