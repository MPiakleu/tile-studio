import * as React from 'react';
import * as ReactDom from 'react-dom';
import { DisplayMode, Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart, IWebPartPropertiesMetadata } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';
import { IPropertyPaneConfiguration, IPropertyPaneField, IPropertyPaneCustomFieldProps, PropertyPaneFieldType } from '@microsoft/sp-property-pane';
import { SPHttpClient } from '@microsoft/sp-http';
import { StudioEditor, StudioEditorUiState } from './components/StudioEditor';
import { createDefaultConfig, DEFAULT_THEME, normalizeConfig } from './models/config';
import { ThemeTokens, TileStudioConfig } from './models/types';
import { ListDataClient } from './services/listData';
import { PropertyChangeCallback, PropertyPaneSession } from './services/PropertyPaneSession';
import { TileStudioApp, TileStudioBoundary } from './components/TileStudioApp';

export interface TileStudioWebPartProperties { config?: TileStudioConfig; }

interface PaneFocus {
  id: string;
  start?: number;
  end?: number;
}

export default class TileStudioWebPart extends BaseClientSideWebPart<TileStudioWebPartProperties> {
  private theme: ThemeTokens = { ...DEFAULT_THEME };
  private dataProvider: ListDataClient | undefined;
  private draft: TileStudioConfig | undefined;
  // Only SharePoint's custom-field change callback can reliably notify the
  // property pane that a custom editor changed its persisted property.
  // Retain edits made during a host replacement until its callback reattaches.
  private pendingPaneChange: TileStudioConfig | undefined;
  private lastPreviewProperty: TileStudioConfig | undefined;

  // SPFx can mount a new custom property-pane field BEFORE disposing the old
  // one. The v1.1 cleanup unconditionally cleared the new field's callback,
  // silently disabling every edit until the user reopened the pane.
  private readonly paneSession = new PropertyPaneSession<HTMLElement>();
  private paneEditorField: IPropertyPaneField<IPropertyPaneCustomFieldProps> | undefined;
  private editorUiState: StudioEditorUiState | undefined;
  private paneFocus: PaneFocus | undefined;

  // The editor UI state is independent from persisted SharePoint properties.
  // SharePoint must be notified through its custom-field callback on changes.
  private readonly saveEditorUiState = (state: StudioEditorUiState): void => {
    this.editorUiState = state;
  };

  protected async onInit(): Promise<void> {
    await super.onInit();
    if (!this.properties.config) this.properties.config = createDefaultConfig();
    this.dataProvider = new ListDataClient(this.context.pageContext.web.absoluteUrl, (url, signal) =>
      this.context.spHttpClient.get(url, SPHttpClient.configurations.v1, {
        headers: { Accept: 'application/json;odata=nometadata', 'odata-version': '' }, signal
      }));
  }

  public render(): void {
    let config: TileStudioConfig;
    try { config = normalizeConfig(this.properties.config); }
    catch (error) {
      this.renderError(error instanceof Error ? error : new Error('Tile Studio configuration is unavailable.'));
      return;
    }
    const isEditMode = this.displayMode === DisplayMode.Edit;
    ReactDom.render(React.createElement(TileStudioBoundary, undefined, React.createElement(TileStudioApp, {
      config, isEditMode, dataProvider: this.dataProvider,
      currentSiteUrl: this.context.pageContext.web.absoluteUrl, theme: this.theme, instanceId: this.instanceId,
      onChange: updated => this.updateConfiguration(updated),
      onOpenEditor: () => this.context.propertyPane.open(),
      onCloseEditor: () => this.context.propertyPane.close()
    })), this.domElement);
    this.lastPreviewProperty = this.properties.config;
  }

  private updateConfiguration(updated: TileStudioConfig): void {
    if (this.displayMode !== DisplayMode.Edit) return;
    const previous = this.properties.config;
    const safe = normalizeConfig(updated);
    // The unnormalized draft preserves partially entered field values. Only
    // normalized values are placed in the SharePoint property bag.
    this.draft = updated;

    const notify = this.paneSession.changeCallback;
    let notified = false;
    if (notify) {
      // Notify while the OLD value is still in the property bag. The pane may
      // compare old/new values to determine whether the page is modified.
      // A direct invocation of onPropertyPaneFieldChanged is not a substitute
      // for this custom-field callback.
      this.pendingPaneChange = undefined;
      try {
        notify('config', safe, true);
        notified = true;
      } catch {
        // A callback can be invalidated while SharePoint replaces its pane.
        this.pendingPaneChange = safe;
      }
    } else {
      this.pendingPaneChange = safe;
    }

    // Do not depend on the custom callback's implementation to assign the
    // property. Every edit is also committed to our own serializable bag.
    this.properties.config = safe;
    if (!notified) this.onPropertyPaneFieldChanged('config', previous, safe);

    // Render if SharePoint didn't already paint the same property-bag value.
    // A synchronous framework repaint may have used the *old* value; compare
    // identities after synchronization rather than just counting renders.
    if (this.lastPreviewProperty !== this.properties.config) this.render();
    this.renderPaneEditor();
  }

  private renderPaneEditor(): void {
    const host = this.paneSession.host;
    if (!host || this.displayMode !== DisplayMode.Edit) return;
    ReactDom.render(React.createElement(StudioEditor, {
      config: this.draft || normalizeConfig(this.properties.config),
      initialUiState: this.editorUiState,
      onUiStateChange: this.saveEditorUiState,
      onChange: updated => this.updateConfiguration(updated),
      onClose: () => this.context.propertyPane.close(),
      dataProvider: this.dataProvider,
      currentSiteUrl: this.context.pageContext.web.absoluteUrl,
      theme: this.theme,
      instanceId: this.instanceId
    }), host);
  }

  private captureEditorFocus(host: HTMLElement): void {
    const active = document.activeElement as HTMLElement | null;
    if (!active || !host.contains(active) || !active.id.startsWith(`${this.instanceId}-studio-`)) return;
    const focus: PaneFocus = { id: active.id };
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      // Selection properties throw for certain input types (color, number, etc).
      try {
        if (active.selectionStart !== null && active.selectionEnd !== null) {
          focus.start = active.selectionStart;
          focus.end = active.selectionEnd;
        }
      } catch { /* Not a text-selection control. */ }
    }
    this.paneFocus = focus;
  }

  private restoreEditorFocus(host: HTMLElement): void {
    if (!this.paneFocus) return;
    const wanted = this.paneFocus;
    this.paneFocus = undefined;
    window.requestAnimationFrame(() => {
      if (this.paneSession.host !== host || this.displayMode !== DisplayMode.Edit) return;
      const current = document.activeElement;
      // Do not steal focus from a different SharePoint control.
      if (current && current !== document.body && current !== document.documentElement && !host.contains(current)) return;
      const control = Array.from(host.querySelectorAll<HTMLElement>('[id]')).find(item => item.id === wanted.id);
      if (!control) return;
      control.focus();
      if ((control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) && wanted.start !== undefined && wanted.end !== undefined) {
        try { control.setSelectionRange(wanted.start, wanted.end); } catch { /* Not a text-selection control. */ }
      }
    });
  }

  // All property-pane hosts use the same unmount path. SharePoint can dispose
  // an old host after a new host has mounted; unmount only the supplied host,
  // never the currently attached replacement. Each ReactDOM root is paired
  // with a matching unmount (the web-part root is unmounted in onDispose).
  private unmountPaneHost(host: HTMLElement): void {
    ReactDom.unmountComponentAtNode(host);
  }

  private attachPaneEditor(host: HTMLElement, callback?: PropertyChangeCallback): void {
    const previousHost = this.paneSession.attach(host, callback);
    if (previousHost) {
      this.captureEditorFocus(previousHost);
      this.unmountPaneHost(previousHost);
    }
    // SharePoint may dispose a field after an edit but before its replacement
    // supplies a callback. Flush the latest pending value to that new field.
    const pending = this.pendingPaneChange;
    const notify = this.paneSession.changeCallback;
    if (pending && notify) {
      this.pendingPaneChange = undefined;
      try { notify('config', pending, true); }
      catch { this.pendingPaneChange = pending; }
      // The pane may replace or normalize the property bag during notification.
      this.properties.config = normalizeConfig(pending);
    }
    this.renderPaneEditor();
    this.restoreEditorFocus(host);
  }

  private disposePaneEditor(host: HTMLElement): void {
    if (this.paneSession.host === host) this.captureEditorFocus(host);
    this.unmountPaneHost(host);
    // CRITICAL: out-of-order onDispose must never clear the *new* callback.
    this.paneSession.detach(host);
  }

  protected onPropertyPaneConfigurationStart(): void {
    // Reinitializing on every property-pane refresh can overwrite an active
    // typing session; only initialize on a genuinely new editing session.
    if (!this.draft) {
      this.draft = normalizeConfig(this.properties.config);
    }
    this.renderPaneEditor();
  }

  protected onPropertyPaneConfigurationComplete(): void {
    // IMPORTANT: SPFx also calls this lifecycle method after a short period
    // without property changes while the pane is STILL OPEN (reactive mode).
    // Unmounting the custom React field here used to erase every setting after
    // an edit or a few seconds of inactivity. The custom field onDispose owns
    // its DOM lifecycle; completion alone is not an unmount signal.
    if (this.context.propertyPane.isPropertyPaneOpen()) {
      return;
    }

    // A genuinely closed pane ends the transient draft/session. The canonical
    // property bag retains the last serialized configuration for page save.
    this.pendingPaneChange = undefined;
    this.draft = undefined;
    this.editorUiState = undefined;
    this.paneFocus = undefined;
    const oldHost = this.paneSession.host;
    if (oldHost) this.unmountPaneHost(oldHost);
    this.paneSession.clear();
    this.render();
    if (this.displayMode === DisplayMode.Edit) {
      window.requestAnimationFrame(() => {
        if (document.activeElement === document.body || document.activeElement === document.documentElement) {
          this.domElement.querySelector<HTMLButtonElement>('button[data-studio-open-editor]')?.focus();
        }
      });
    }
  }

  protected onBeforeSerialize(): void {
    if (this.properties.config) this.properties.config = normalizeConfig(this.properties.config);
  }

  protected onDisplayModeChanged(oldDisplayMode: DisplayMode): void {
    if (this.displayMode !== DisplayMode.Edit) {
      this.pendingPaneChange = undefined;
      this.draft = undefined;
      this.editorUiState = undefined;
      this.paneFocus = undefined;
      const oldHost = this.paneSession.host;
      if (oldHost) this.unmountPaneHost(oldHost);
      this.paneSession.clear();
    }
    super.onDisplayModeChanged(oldDisplayMode);
  }

  protected onAfterDeserialize(deserializedObject: TileStudioWebPartProperties): TileStudioWebPartProperties {
    this.pendingPaneChange = undefined;
    this.draft = undefined;
    return deserializedObject;
  }

  protected onThemeChanged(theme: IReadonlyTheme | undefined): void {
    if (!theme) return;
    this.theme = {
      accent: theme.palette?.themePrimary || DEFAULT_THEME.accent,
      surface: theme.semanticColors?.bodyBackground || DEFAULT_THEME.surface,
      text: theme.semanticColors?.bodyText || DEFAULT_THEME.text,
      muted: theme.semanticColors?.bodySubtext || DEFAULT_THEME.muted,
      border: theme.semanticColors?.variantBorder || theme.palette?.neutralLight || DEFAULT_THEME.border,
      subtle: theme.palette?.neutralLighterAlt || DEFAULT_THEME.subtle,
      isDark: !!theme.isInverted
    };
    if (this.renderedOnce) { this.render(); this.renderPaneEditor(); }
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    // SharePoint augments a returned configuration with its built-in Visibility
    // section. Never return the *same mutable pages/groups array* repeatedly:
    // subsequent calls can append another Visibility group to the cached array.
    // The custom field itself keeps a stable identity/key, preserving the live
    // React editor and the lifecycle protections in PropertyPaneSession.
    if (!this.paneEditorField) {
      this.paneEditorField = {
        type: PropertyPaneFieldType.Custom,
        targetProperty: 'config',
        properties: {
          key: `tile-studio-editor-${this.instanceId}`,
          onRender: (element: HTMLElement, _context?: unknown, changeCallback?: PropertyChangeCallback): void => {
            this.attachPaneEditor(element, changeCallback);
          },
          onDispose: (element: HTMLElement): void => {
            this.disposePaneEditor(element);
          }
        }
      };
    }
    // Preserve SharePoint's native Visibility controls. Avoid preview-only
    // configuration flags; always return fresh framework-owned arrays.
    return {
      pages: [{
        header: { description: 'Design your tiles in SharePoint web part properties. Changes preview on the page; save or publish to keep them.' },
        groups: [{ groupName: 'Tile Studio', groupFields: [this.paneEditorField] }]
      }]
    };
  }

  protected get propertiesMetadata(): IWebPartPropertiesMetadata {
    return {
      'config.title': { isSearchablePlainText: true },
      'config.subtitle': { isSearchablePlainText: true },
      'config.tiles[*].title': { isSearchablePlainText: true },
      'config.tiles[*].description': { isSearchablePlainText: true },
      'config.tiles[*].url': { isLink: true },
      'config.tiles[*].secondaryUrl': { isLink: true },
      'config.tiles[*].imageUrl': { isImageSource: true }
    };
  }

  protected onDispose(): void {
    this.dataProvider?.dispose();
    const host = this.paneSession.host;
    if (host) this.disposePaneEditor(host);
    this.paneSession.clear();
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version { return Version.parse('1.0'); }
}
