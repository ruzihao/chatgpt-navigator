# Privacy Policy — zNavi

**Last updated: February 24, 2026**

## Overview

zNavi is a browser extension that adds a navigation sidebar to ChatGPT. It is designed with privacy in mind — **no user data is collected, stored, or transmitted** to any external server.

## Data Collection

zNavi does **not** collect any of the following:

- Personally identifiable information
- Conversation content
- Browsing history
- Usage analytics or telemetry
- Cookies or tracking data

## How It Works

- zNavi runs **entirely locally** in your browser.
- It reads the structure of your ChatGPT conversation **on your device only** to build a navigation index.
- User preferences (e.g., sidebar position, toggle state) are saved using Chrome's local `storage` API and never leave your device.

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Save user preferences locally |
| `activeTab` | Inject the sidebar into the active ChatGPT tab |
| Host access to `chatgpt.com` / `chat.openai.com` | Parse conversation structure to build navigation index |

## Third-Party Services

zNavi does not use any third-party services, APIs, or analytics tools.

## Changes

If this policy changes, updates will be posted on this page with a revised date.

## Contact

If you have questions, open an issue at [github.com/ruzihao/chatgpt-navigator](https://github.com/ruzihao/chatgpt-navigator).
