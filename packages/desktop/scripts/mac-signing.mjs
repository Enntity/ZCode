/** Build a custom electron-builder signer that resolves the exact selected certificate. */
export function createMacSigningHook({ shouldSign, loadSignAsync }) {
  return async function signMacApplication(options) {
    if (!shouldSign || !options.identity) return;
    const signAsync = loadSignAsync();
    await signAsync({ ...options, identityValidation: true });
  };
}
