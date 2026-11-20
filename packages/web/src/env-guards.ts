// Every build must keep the PROD and GUARD_ON logs and drop the GUARD_OFF one; `pnpm check:env-guards` checks the output.
// The log is the effect that stops the minifier from deleting the code even when the switch is on.
/* oxlint-disable no-console */
if (import.meta.env.PROD) console.debug('env-guard:prod');
if (import.meta.env.APP_REACT_GUARD_ON) console.debug('env-guard:on');
if (import.meta.env.APP_REACT_GUARD_OFF) console.debug('env-guard:off');
/* oxlint-enable no-console */
