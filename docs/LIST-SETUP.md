# Connect a SharePoint list

Tile Studio can read a SharePoint list from a site on the **same SharePoint hostname** as the page. Requests run as the signed-in employee through the SharePoint Framework context. The web part reads the list; it does not create, update, or delete rows.

Use a list when several Tile Studio instances should display centrally maintained content. The visual design remains configurable in each web part.

## 1. Create the list

Create a standard blank list, for example **Technology Tiles**, in the intended SharePoint site. Keep the default **Title** column. Add only the optional columns you need.

The names below are suggested internal names. Creating column names without spaces makes mapping easier. Tile Studio lets you select existing fields, so your list does not need to use these exact names.

| Suggested column | SharePoint column type | Tile Studio mapping | Notes |
| --- | --- | --- | --- |
| Title | Single line of text | Title | Required mapping. This is the tile heading. |
| Description | Multiple lines of text, plain text | Description | Rich HTML is not rendered. |
| TileUrl | Hyperlink or single line of text | Link | HTTP/HTTPS, relative paths, `mailto:`, and `tel:` links are supported. |
| IconName | Single line of text or single-select Choice | Icon name | Use an allowed icon name from the list below. |
| ImageUrl | Hyperlink or single line of text | Image | HTTPS URL or root-relative SharePoint path. The modern SharePoint **Image** column is not supported by this adapter. |
| ImageAlt | Single line of text | Image alternative text | Describe meaningful images. Leave blank for decorative images. |
| Eyebrow | Single line of text | Eyebrow | Small label above the title. |
| Badge | Single line of text | Badge | Short label such as “New.” |
| Status | Single-select Choice or single line of text | Status | Allowed values are listed below. |
| Metric | Single line of text or Number | Metric | Displayed in KPI layouts; no calculation is performed. |
| SupportingDetail | Single line of text | Supporting detail | Additional text, such as the responsible team. |
| Category | Single line of text | Category | Supports one exact category filter per instance. Index this column when filtering a large list. |
| Visible | Yes/No | Visible | Set the default to **Yes**. False values hide a tile from this presentation. |
| SortOrder | Number | Sort order | Controls an intentional numeric sequence. Index the sort/filter columns needed for your large-list query. |

Only Title is mapped initially. Unmapped optional fields stay empty. An unmapped visibility field treats rows as visible. Unmapped status does not imply that a service is healthy.

### Allowed values

**Icons:** `tools`, `apps`, `project`, `activity`, `book`, `people`, `shield`, `ticket`, `mail`, `printer`, `cloud`, `laptop`, `arrow`, `sparkles`, `calendar`, `link`, `globe`, `chart`, `check`, `info`.

An unsupported or missing icon name uses the link icon.

**Status:** `none`, `unknown`, `operational`, `degraded`, `outage`, `maintenance`.

Status matching ignores capitalization. Unsupported nonempty status text is shown as unknown. A status banner is a presentation of supplied status data; it does not test availability or infer a healthy state.

## 2. Populate a few rows

Start with a small set of actual destinations. For example:

| Title | TileUrl | IconName | Category | Visible | SortOrder |
| --- | --- | --- | --- | --- | --- |
| Request a service | Your verified service-catalog URL | apps | Employee | Yes | 10 |
| Employee resources | Your published resources page URL | book | Employee | Yes | 20 |
| Manager resources | Your published manager-resources page URL | people | Manager | Yes | 30 |

Replace the descriptive URL placeholders before using the rows. The web part does not create the destination pages or integrate with the systems behind those links.

## 3. Connect the web part

1. Edit the SharePoint page and open the Tile Studio designer.
2. In **Content**, select **SharePoint list**.
3. Enter the source site URL. Leave the current site URL when the list is local.
4. Select **Load lists**, then choose **Source list**. Changing the site input is applied through **Load lists**.
5. Under **Map list fields**, choose the fields you created. Title is required; choose **Not mapped** for unused properties.
6. If needed, map Category and enter an exact **Category filter**. A category filter requires a mapped Category column.
7. Choose **Sort by**, **Sort direction**, **Maximum items**, and **Refresh interval**.
8. Select **Check connection** and review the tile preview. Save or republish the page when ready.

The list picker discovers visible standard lists. Document libraries, native SharePoint News, Graph data, and Freshservice data are not built-in content adapters in this release.

## Reading and refresh behavior

The configured display limit is **1–100 visible tiles**. The reader follows SharePoint pagination within a bounded number of pages and scanned rows; it does not load an unlimited list. When the result is truncated, refine the category filter, reduce hidden rows in the selected population, or use another web part instance for a separate category.

Sorting supports the mapped numeric order field, the mapped title, or SharePoint’s Modified field. When the order field is not mapped, rows use item ID order. A secondary item ID sort makes equal sort values deterministic.

The refresh interval is configurable from **0–60 minutes**. Zero disables scheduled refresh. The connection check explicitly reloads the selected source. Caching is held in the web part instance’s memory; it is not a shared cross-user cache.

Large lists still need appropriate SharePoint indexes and queries. The web part’s 100-tile display limit does not bypass SharePoint list-query thresholds. If a query fails, review the mapped columns and indexes with the list owner.

## Permissions and supported content

Give employees read access to the source list and any linked content they should open. Give content owners list-editing rights as appropriate. Test with a representative employee account, not only a site owner.

**List permissions enforce access.** The Visible column, Category filter, and hidden tiles are presentation controls. They are not authorization boundaries. Manually configured content is stored in the page configuration; do not put confidential material into a broadly readable page and rely on hiding it.

The adapter maps text/scalar values and SharePoint hyperlink values. It does not expand person, lookup, taxonomy, or modern Image fields. List mode does not map per-tile color overrides, new-tab preferences, or action labels; those controls are available for manual tiles.

For service health, a trusted owner or separate upstream process must maintain Status and the supporting information. This release includes no live monitoring feed, health freshness guarantee, native News integration, Graph integration, or Freshservice automation.

## Common issues

| What you see | What to check |
| --- | --- |
| No lists after loading | Confirm the site URL and that the current employee can access a standard list there. |
| Site/list not found | Confirm the selected site and list still exist. Load the lists again after moving to a different site. |
| Access/session error | Confirm list permissions and refresh the SharePoint session. |
| Query error | Check field mappings, column types, category mapping, and required indexes. |
| No tiles | Check the exact category filter, Visible values, and whether rows exist in the selected list. |
| Image absent | Use an HTTPS/root-relative image URL and verify the employee can read the image. Do not map a modern Image column. |
| Service status shows unknown | Use a supported status value and verify the upstream process supplies current data. |

Implementation references: [listData.ts](../src/webparts/tileStudio/services/listData.ts), [safety.ts](../src/webparts/tileStudio/services/safety.ts), and [types.ts](../src/webparts/tileStudio/models/types.ts).
