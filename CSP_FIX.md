# CSP and Remote Code Notes

ScrollHandsFree should remain fully inspectable from the submitted extension package.

## Current policy direction

- Do not load remote scripts.
- Do not load extension logic from a CDN.
- Do not use `eval`, `new Function`, or string-based script execution.
- Keep JavaScript in packaged files such as `background.js`, `content.js`, `popup.js`, and `options.js`.
- Keep test/demo pages local.

## Current remote references

The extension may open normal links such as the GitHub issue page, but it should not fetch executable code from those links.

The packaged manifest currently relies on local scripts only:

- `background.js`
- `content.js`
- `popup.js`
- `options.js`
- `welcome.js`

## Review checklist

Before submitting a new version:

1. Search for remote script usage:

   ```bash
   rg -n "https?://|cdn|importScripts|eval\\(|new Function|script src" .
   ```

2. Confirm any `https://` references are ordinary links, not executable code.
3. Confirm `manifest.json` does not request broader permissions than the current feature set needs.
4. Run:

   ```bash
   node --check background.js content.js popup.js options.js
   python3 -m json.tool manifest.json >/dev/null
   git diff --check
   ```
