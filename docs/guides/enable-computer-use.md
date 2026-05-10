---
title: Enable Computer Use
description: Optional computer-use toolset.
when_to_read: When implementing opt-in computer use.
---

# Enable Computer Use

Computer use is an opt-in external toolset guarded by confirmation policy.

## Configuration

Set `computerUseConfirmationLevel` through config or the calling adapter policy.
The supported modes are `always`, `system_only`, and `never`; v1 should use a
conservative confirmation posture unless the user explicitly narrows the target
surface.

## Requests

Computer-use calls route through the external tool adapter, not direct UI side
effects. Supported request names include `computer.screenshot`, `computer.click`,
`computer.type`, `computer.scroll`, `computer.list_windows`, and
`computer.focus_window`.

## Safety

`computer.click` and `computer.type` require confirmation for system-level
targets and password fields under the default policy. If the adapter cannot
identify the target clearly, escalate to the user instead of guessing.
