/**
 * Host half of the Design Studio bundle.
 *
 * The feature is rendered entirely by the Client module (`client.js`): one
 * entry in the left sidebar (`sidebar.panellist`) whose id addresses the
 * central panel registered in the keyed `main` slot. Nothing is exposed to the
 * Agent, so the Host half only needs to exist for the bundle row.
 */
export function apply() {}
