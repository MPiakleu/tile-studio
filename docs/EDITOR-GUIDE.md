# Tile Studio editor guide

Tile Studio is one reusable web part. Add several instances to a SharePoint page when you want separate sections with different content and designs. Each instance keeps its own configuration.

## Open and save the designer

1. Edit the SharePoint page and add **Tile Studio**, or select an existing Tile Studio web part.
2. Open the web part’s edit/property pane. The inline designer opens on the page.
3. Make changes in the five tabs. The tile preview updates as you work.
4. Select **Done editing** to close the designer.
5. Save the SharePoint page as a draft, or republish it when the changes are ready for readers.

**Done editing closes the designer; it does not publish the page.** SharePoint page-editing permissions determine who can change the configuration. There is no separate Tile Studio administrator role.

## The five tabs

| Tab | What you can change |
| --- | --- |
| Content | Heading, subtitle, content source, tiles, links, images, supporting text, status, visibility, and tile color overrides. |
| Layout | Ten layout options, desktop columns, minimum tile height, equal heights, descriptions, and link arrows. |
| Style | Theme or custom colors, spacing, corners, borders, typography, icon treatment, image ratio, shadows, and hover effects. |
| Responsive | Tablet/mobile columns and breakpoints, mobile spacing, decorative-image visibility, and reduced motion. |
| Presets | Built-in designs, saved designs for this instance, and JSON configuration import/export. |

**Find a setting** identifies the relevant tab. For example, search for “color,” “mobile,” “list,” or “import.”

## Manage manual tiles

Select a tile in **Content** to edit it. Add a destination to make it clickable; starter tiles are intentionally unlinked. Valid destinations include HTTP/HTTPS URLs, site-relative paths, `mailto:` links, and `tel:` links. Blank or unsupported destinations produce informational tiles without clickable links.

Use **Add tile**, **Duplicate**, and **Remove** to curate the section. Removal requires an inline confirmation. Reorder tiles with the drag grip or the labeled up/down buttons. Up to **100 manual tiles** are supported.

Each tile can contain a title, description, icon, image, eyebrow, badge, status, metric, supporting detail, category, and optional action label. Layouts use the fields that suit their presentation. Missing descriptions, images, and metrics are handled without requiring dummy content.

**Show this tile** controls whether the tile is rendered. It does not secure the destination or hide information from someone who can read the page configuration. Keep confidential material in a properly permissioned SharePoint location.

### Images and tile colors

Use an HTTPS image or a root-relative path such as `/SiteAssets/technology/training.jpg`. Enter alternative text when an image communicates information beyond the tile’s text. Leave alternative text blank for a decorative image.

The mobile option **Hide decorative images on mobile** hides only images with empty alternative text. Meaningful images remain available.

Under **Tile color overrides**, set an individual tile’s accent, background, or text color. Blank values inherit the section design. **Reset section colors** affects section colors and preserves individual tile overrides.

## Choose a layout and refine its style

The layouts are Action cards, Compact tiles, Resource list, Status banners, Featured cards, Image cards, Icon grid, Split cards, KPI cards, and Minimal links. Changing the layout preserves tiles, links, source configuration, colors and composition overrides, while applying the selected design’s structural defaults (columns, heights, spacing and icon arrangement). Refine these structural settings after selecting the layout; previously customized values for them are intentionally replaced when you choose another layout.

Use one column for a full-width list or banner. Columns remain adjustable. Equal tile heights align sparse content within each row; long content can expand rather than being clipped to a fixed height.

Blank section colors follow the SharePoint theme. Custom colors accept three-, six-, or eight-digit hex values; eight-digit values include transparency. The color picker changes the opaque base color. Review foreground/background contrast after adding custom colors.

Icon position, shape, and size are configurable. Hover effects include lift, shadow, border highlight, and none. The operating system’s reduced-motion preference is always honored. **Reduce motion for everyone** disables tile motion for this instance even when a reader has not enabled that system preference.

Responsive breakpoints use the **available web part width**, including narrow SharePoint columns. They do not depend only on the browser’s overall width. Check the design inside the section where it will be used.

## Reuse a design

Applying a built-in or saved preset changes the design and responsive settings while preserving the current content. Save up to **20 named designs** in each web part instance.

Saved designs belong to that instance. Version 1 does **not** provide a centrally synchronized preset gallery.

Use **Export configuration** to download JSON containing content, design, responsive settings, saved presets, and SharePoint list connection settings. In another instance, choose a JSON file or paste its contents, then select **Import configuration**. Selecting a file alone does not apply it.

Import replaces the current instance’s configuration. The maximum import size is **1 MiB**. Invalid JSON and unsupported configuration versions produce an error without replacing the existing design. Review imported destinations and list connections before saving or publishing the page.

## Connected content

Choose **SharePoint list** to display centrally maintained list content. Switching back to **Manual tiles** retains the manual content you entered previously. See [LIST-SETUP.md](LIST-SETUP.md) for the supported schema, permissions, and connection steps.

Status and KPI values are displayed as supplied. Tile Studio does not monitor service availability, calculate metrics, or run backend actions.
