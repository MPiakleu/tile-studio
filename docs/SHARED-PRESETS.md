# Organization-wide design presets (optional)

Tile Studio remains usable without any list. For centrally curated appearance presets, create a SharePoint list named **Tile Studio Presets** in a governed communications or IT site, with:

- **Title:** standard list Title field, single line, friendly preset name.
- **PresetJson:** multi-line plain text column, internal name exactly `PresetJson`; holds the exported JSON object `{ "design": {...}, "responsive": {...} }`.

Use SharePoint list permissions to allow page editors to **read** presets and allow only the designated design administrators to **edit** list entries. Disable ad hoc permissions where appropriate. Treat preset contents as general site styling, not sensitive data.

1. Open Tile Studio in Edit mode → **Presets**.
2. Choose **Export design for shared library**. Downloaded JSON contains only `design` and `responsive`.
3. As a list editor, create an item with its name in Title and paste the JSON into PresetJson. Keep under 20,000 characters per item.
4. On the receiving Tile Studio instance, enable **Use shared preset library**, enter site URL (blank=current site), the target list GUID and select **Load shared designs**.
5. Apply a shared preset. It updates the current instance's appearance, not its tile content or list connection. Save the SharePoint page to retain.

**Important:** This is a read-only picker, **not** automatic live synchronization of saved pages. Updating a shared preset affects future applies only. This prevents one central edit from unexpectedly altering already published pages. Source data is loaded via SharePoint's own delegated list endpoint; no added Graph API scope or automation identity is required. A 403 is shown as an editor error.
