# Crash Fix

## Issue
`TypeError [Error]: Cannot convert undefined or null to object` in `autocannon/lib/printResult.js`.

## Cause
`autocannon.track(instance, { renderProgressBar: true })` was being called inside a Worker thread. The library tries to interact with TTY (terminal) which causes race conditions or context issues when running in this multi-threaded server mode.

## Fix
Changed to:
`autocannon.track(instance, { renderProgressBar: false });`

This disables the pretty ASCII progress bar but prevents the crash. The functionality remains identical.
