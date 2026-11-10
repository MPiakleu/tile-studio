import * as React from 'react';
import { CompositionSettings, CompositionTemplate, DesignSettings, FooterElement } from '../../models/types';
import { COMPOSITION_NAMES, COMPOSITION_TEMPLATES } from '../../models/composition';
import { LAYOUTS } from '../../models/config';
import { layoutSelectionPatch } from '../../models/layoutProfiles';
import { FOOTER_OPTIONS } from './constants';
import { Field, Range, Toggle } from '../EditorControls';
import type { EditorController } from './useEditorController';
import styles from '../StudioEditor.module.scss';

interface Props { editor: EditorController; }

export const LayoutSection: React.FC<Props> = ({ editor }) => {
  const { config, design, composition, id } = editor;
  return (
<div id={id('panel-layout')} role="tabpanel" aria-labelledby={id('tab-layout')}>
          <div className={styles.sectionHeader}><div><h3>A layout for every idea</h3><p>Selecting a layout adjusts the columns, spacing and icon arrangement. Tile content, colors and action links are preserved.</p></div><span className={styles.countPill}>10 layouts</span></div>
          <div className={styles.layoutGrid} role="group" aria-label="Choose a tile layout">{LAYOUTS.map((layout) => <button type="button" key={layout.id} aria-pressed={config.design.layout === layout.id} className={`${styles.layoutCard} ${config.design.layout === layout.id ? styles.selectedLayout : ''}`} onClick={() => design(layoutSelectionPatch(layout.id))}>
            <span className={styles.layoutIllustration} data-layout={layout.id} aria-hidden="true">{Array.from({ length: layout.id === 'featured' || layout.id === 'status' ? 1 : layout.id === 'list' || layout.id === 'minimal' ? 3 : 4 }, (_, index) => <span key={index}><i /><b /><em /></span>)}</span>
            <span className={styles.layoutName}>{layout.name}{config.design.layout === layout.id && <span aria-hidden="true">✓</span>}</span><span className={styles.layoutDescription}>{layout.description}</span>
          </button>)}</div>
          <div className={styles.sectionDivider} />
          <fieldset className={styles.settingsGroup}><legend>Card composition — seven starting designs</legend>
            <p className={styles.hint}>Choose where the header, content, badges, actions and metadata sit. Changing a composition does not remove your tile data.</p>
            <div className={styles.formGrid}>
              <Field label="Composition template" id={id('composition-template')} wide><select id={id('composition-template')} value={config.design.compositionTemplate} onChange={(event) => { const template = event.target.value as CompositionTemplate; design({ compositionTemplate: template, composition: { ...COMPOSITION_TEMPLATES[template] } }); }}>{COMPOSITION_NAMES.map(t => <option key={t.id} value={t.id}>{t.name} — {t.description}</option>)}</select></Field>
              <Field label="Card navigation" id={id('card-interaction')} wide hint="Appearance settings will never change how a card navigates. Tiles with two destinations use separate action links."><select id={id('card-interaction')} value={config.design.cardInteraction} onChange={(event) => design({ cardInteraction: event.target.value as DesignSettings['cardInteraction'] })} aria-describedby={`${id('card-interaction')}-hint`}><option value="auto">Automatic: classic card link, other templates use actions</option><option value="card">Make the whole card a link</option><option value="actions">Only action buttons are links</option></select></Field>
              <Field label="Header layout" id={id('header-mode')}><select id={id('header-mode')} value={config.design.composition.headerMode} onChange={(event) => composition({ headerMode: event.target.value as CompositionSettings['headerMode'] })}><option value="stacked">Stacked</option><option value="category-inline">Icon beside category</option><option value="icon-inline">Icon beside content</option><option value="icon-top">Icon above content</option><option value="none">No header</option></select></Field>
              <Field label="Footer placement" id={id('footer-anchor')}><select id={id('footer-anchor')} value={config.design.composition.footerAnchor} onChange={(event) => composition({ footerAnchor: event.target.value as CompositionSettings['footerAnchor'] })}><option value="bottom">Anchor to bottom</option><option value="flow">Follow content</option></select></Field>
              {(['footerLeft','footerCenter','footerRight'] as const).map(key => <Field key={key} label={key === 'footerLeft' ? 'Footer left' : key === 'footerCenter' ? 'Footer center' : 'Footer right'} id={id(key)}><select id={id(key)} value={config.design.composition[key]} onChange={(event) => composition({ [key]: event.target.value as FooterElement })}>{FOOTER_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>)}
              <Field label="Footer distribution" id={id('footer-align')}><select id={id('footer-align')} value={config.design.composition.footerAlign} onChange={(event) => composition({ footerAlign: event.target.value as CompositionSettings['footerAlign'] })}><option value="spread">Distribute across row</option><option value="start">Group at start</option></select></Field>
              <Toggle label="Show category" id={id('show-category')} value={config.design.composition.showCategory} onChange={(showCategory) => composition({ showCategory })} />
              <Toggle label="Include icon beside category" id={id('show-category-icon')} value={config.design.composition.iconInCategory} onChange={(iconInCategory) => composition({ iconInCategory })} />
              <Toggle label="Show eyebrow" id={id('show-eyebrow')} value={config.design.composition.showEyebrow} onChange={(showEyebrow) => composition({ showEyebrow })} />
              <Toggle label="Show badge in header" id={id('badge-header')} value={config.design.composition.showBadgeInHeader} onChange={(showBadgeInHeader) => composition({ showBadgeInHeader })} />
              <Toggle label="Show status below description" id={id('status-body')} value={config.design.composition.showStatusInBody} onChange={(showStatusInBody) => composition({ showStatusInBody })} />
            </div>
          </fieldset>
          <div className={styles.sectionDivider} /><div className={styles.formGrid}>
            <Range label="Desktop columns" id={id('columns')} value={config.design.columns} min={1} max={6} suffix="" onChange={(columns) => design({ columns })} hint="Use one column for full-width lists and banners." />
            <Range label="Minimum tile height" id={id('min-height')} value={config.design.minHeight} min={0} max={600} onChange={(minHeight) => design({ minHeight })} hint="0 lets the layout size itself to its content." />
            <Toggle label="Equal tile heights" id={id('equal-height')} value={config.design.equalHeight} onChange={(equalHeight) => design({ equalHeight })} hint="Keeps sparse tiles aligned within each row." />
            <Toggle label="Show descriptions" id={id('show-description')} value={config.design.showDescription} onChange={(showDescription) => design({ showDescription })} />
            <Toggle label="Show link arrows" id={id('show-arrow')} value={config.design.showArrow} onChange={(showArrow) => design({ showArrow })} hint="Arrows appear only on tiles with valid links." />
          </div>
        </div>
  );
};
