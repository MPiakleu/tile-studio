import * as React from 'react';
import { DesignSettings } from '../../models/types';
import { COLORS } from './constants';
import { ColorControl, Field, Range } from '../EditorControls';
import type { EditorController } from './useEditorController';
import styles from '../StudioEditor.module.scss';

interface Props { editor: EditorController; }

export const StyleSection: React.FC<Props> = ({ editor }) => {
  const { config, design, sectionContrast, id, theme, setNotice } = editor;
  return (
<div id={id('panel-style')} role="tabpanel" aria-labelledby={id('tab-style')}>
          <div className={styles.sectionHeader}><div><h3>Make it yours</h3><p>Start with the SharePoint theme, then fine-tune the details.</p></div><button type="button" className={styles.textButton} onClick={() => { design({ accentColor: '', backgroundColor: '', textColor: '', mutedColor: '', borderColor: '', iconBackground: '', iconColor: '' }); setNotice('Section colors reset to the SharePoint theme. Tile overrides are retained.'); }}>Reset section colors</button></div>
          <div className={styles.styleColumns}>
            <fieldset className={styles.settingsGroup}><legend>Color palette</legend><p className={styles.hint}>Blank values follow your SharePoint theme. Review contrast when using custom colors.</p><div className={styles.paletteRow}>{COLORS.map((color) => <button key={color} type="button" style={{ backgroundColor: color }} aria-label={`Set accent to ${color}`} title={color} className={config.design.accentColor.toLowerCase() === color.toLowerCase() ? styles.selectedSwatch : ''} onClick={() => design({ accentColor: color })} />)}</div><div className={styles.formGrid}>
              <ColorControl label="Accent" id={id('accent')} value={config.design.accentColor} fallback={theme.accent} onChange={(accentColor) => design({ accentColor })} />
              <div className={styles.wide}>
                <ColorControl label="Card background (section default)" id={id('background')} value={config.design.backgroundColor} fallback={theme.surface} onChange={(backgroundColor) => design({ backgroundColor })} />
                <p className={styles.hint}>Applies to every tile without its own background override. In Content → Tile color overrides, clear the individual tile background to inherit this color.</p>
                {config.source.mode === 'manual' && config.tiles.some(tile => !!tile.backgroundColor) && <p className={styles.hint} role="status">{config.tiles.filter(tile => !!tile.backgroundColor).length} tile(s) have individual background colors; changing this section default will not override them.</p>}
              </div>
              <ColorControl label="Title color" id={id('text')} value={config.design.textColor} fallback={theme.text} onChange={(textColor) => design({ textColor })} />
              <ColorControl label="Description color" id={id('muted')} value={config.design.mutedColor} fallback={theme.muted} onChange={(mutedColor) => design({ mutedColor })} />
              <ColorControl label="Border color" id={id('border-color')} value={config.design.borderColor} fallback={theme.border} onChange={(borderColor) => design({ borderColor })} />
            </div>{sectionContrast.length ? <div className={styles.contrastWarning} role="status"><strong>Contrast needs attention</strong>{sectionContrast.map(item => <p key={item.label}>{item.label}: {item.ratio.toFixed(1)}:1 (minimum {item.minimum}:1)</p>)}<span>Adjust text, accent, or card background. Check each tile override as well.</span></div> : <p className={styles.contrastPass} role="status">Section text and action contrast meet the standard 4.5:1 ratio for the selected colors.</p>}</fieldset>
            <fieldset className={styles.settingsGroup}><legend>Space &amp; shape</legend><div className={styles.formGrid}>
              <Range label="Card padding" id={id('padding')} min={0} max={80} value={config.design.padding} onChange={(padding) => design({ padding })} />
              <Range label="Space between tiles" id={id('gap')} min={0} max={64} value={config.design.gap} onChange={(gap) => design({ gap })} />
              <Range label="Corner radius" id={id('radius')} min={0} max={48} value={config.design.radius} onChange={(radius) => design({ radius })} />
              <Range label="Border width" id={id('border-width')} min={0} max={4} value={config.design.borderWidth} onChange={(borderWidth) => design({ borderWidth })} />
              <Field label="Density" id={id('density')}><select id={id('density')} value={config.design.density} onChange={(event) => design({ density: event.target.value as DesignSettings['density'] })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></Field>
              <Field label="Shadow" id={id('shadow')}><select id={id('shadow')} value={config.design.shadow} onChange={(event) => design({ shadow: event.target.value as DesignSettings['shadow'] })}><option value="none">None</option><option value="soft">Soft</option><option value="medium">Medium</option></select></Field>
              <Field label="Hover effect" id={id('hover')} hint="System reduced-motion preferences are always respected."><select id={id('hover')} value={config.design.hover} onChange={(event) => design({ hover: event.target.value as DesignSettings['hover'] })}><option value="none">None</option><option value="lift">Subtle lift</option><option value="shadow">Shadow</option><option value="outline">Border highlight</option></select></Field>
            </div></fieldset>
            <fieldset className={styles.settingsGroup}><legend>Typography</legend><div className={styles.formGrid}>
              <Range label="Title size" id={id('title-size')} min={12} max={48} value={config.design.titleSize} onChange={(titleSize) => design({ titleSize })} />
              <Range label="Description size" id={id('description-size')} min={12} max={24} value={config.design.descriptionSize} onChange={(descriptionSize) => design({ descriptionSize })} />
              <Field label="Title weight" id={id('title-weight')}><select id={id('title-weight')} value={config.design.titleWeight} onChange={(event) => design({ titleWeight: event.target.value as DesignSettings['titleWeight'] })}><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option><option value="800">Extra bold</option></select></Field>
              <Field label="Text alignment" id={id('align')}><select id={id('align')} value={config.design.align} onChange={(event) => design({ align: event.target.value as DesignSettings['align'] })}><option value="left">Left</option><option value="center">Center</option></select></Field>
            </div></fieldset>
            <fieldset className={styles.settingsGroup}><legend>Buttons, badges &amp; metadata</legend><div className={styles.formGrid}>
              <Field label="Primary button appearance" id={id('primary-style')}><select id={id('primary-style')} value={config.design.primaryStyle} onChange={(event) => design({ primaryStyle: event.target.value as DesignSettings['primaryStyle'] })}>{['text','solid','outline','soft'].map(v => <option value={v} key={v}>{v}</option>)}</select></Field>
              <Field label="Secondary button appearance" id={id('secondary-style')}><select id={id('secondary-style')} value={config.design.secondaryStyle} onChange={(event) => design({ secondaryStyle: event.target.value as DesignSettings['secondaryStyle'] })}>{['text','solid','outline','soft'].map(v => <option value={v} key={v}>{v}</option>)}</select></Field>
              <Field label="Badge appearance" id={id('badge-style')}><select id={id('badge-style')} value={config.design.badgeStyle} onChange={(event) => design({ badgeStyle: event.target.value as DesignSettings['badgeStyle'] })}><option value="plain">Plain text</option><option value="pill">Rounded pill</option><option value="outline">Outlined</option></select></Field>
              <Field label="Status appearance" id={id('status-style')}><select id={id('status-style')} value={config.design.statusStyle} onChange={(event) => design({ statusStyle: event.target.value as DesignSettings['statusStyle'] })}><option value="dot">Dot and text</option><option value="pill">Pill and dot</option><option value="info">Pill with info icon</option></select></Field>
              <Field label="Category capitalization" id={id('category-case')}><select id={id('category-case')} value={config.design.categoryCase} onChange={(event) => design({ categoryCase: event.target.value as DesignSettings['categoryCase'] })}><option value="upper">UPPERCASE</option><option value="normal">Natural case</option></select></Field>
              <Range label="Category font size" id={id('category-size')} min={10} max={20} value={config.design.categorySize} onChange={(categorySize) => design({ categorySize })} />
              <Range label="Metadata font size" id={id('meta-size')} min={10} max={18} value={config.design.metaSize} onChange={(metaSize) => design({ metaSize })} />
              <Range label="Button radius" id={id('button-radius')} min={0} max={40} value={config.design.buttonRadius} onChange={(buttonRadius) => design({ buttonRadius })} />
              <Range label="Footer spacing" id={id('footer-gap')} min={0} max={36} value={config.design.footerGap} onChange={(footerGap) => design({ footerGap })} />
              <Range label="Title line height" id={id('title-line-height')} min={100} max={200} suffix="%" value={config.design.titleLineHeight} onChange={(titleLineHeight) => design({ titleLineHeight })} />
              <Range label="Description line height" id={id('description-line-height')} min={115} max={220} suffix="%" value={config.design.descriptionLineHeight} onChange={(descriptionLineHeight) => design({ descriptionLineHeight })} />
            </div></fieldset>
            <fieldset className={styles.settingsGroup}><legend>Icons &amp; imagery</legend><div className={styles.formGrid}>
              <Field label="Icon position" id={id('icon-position')}><select id={id('icon-position')} value={config.design.iconPosition} onChange={(event) => design({ iconPosition: event.target.value as DesignSettings['iconPosition'] })}><option value="top">Above the title</option><option value="left">Left of content</option><option value="right">Right of content</option><option value="hidden">Hidden</option></select></Field>
              <Field label="Icon background shape" id={id('icon-shape')}><select id={id('icon-shape')} value={config.design.iconShape} onChange={(event) => design({ iconShape: event.target.value as DesignSettings['iconShape'] })}><option value="rounded">Rounded square</option><option value="circle">Circle</option><option value="none">No background</option></select></Field>
              <Range label="Icon size" id={id('icon-size')} min={16} max={64} value={config.design.iconSize} onChange={(iconSize) => design({ iconSize })} />
              <Field label="Image aspect ratio" id={id('image-aspect')}><select id={id('image-aspect')} value={config.design.imageAspect} onChange={(event) => design({ imageAspect: event.target.value as DesignSettings['imageAspect'] })}><option value="landscape">Landscape (16:9)</option><option value="square">Square (1:1)</option><option value="wide">Wide (21:9)</option></select></Field>
              <ColorControl label="Icon background" id={id('icon-background')} value={config.design.iconBackground} fallback={theme.subtle} onChange={(iconBackground) => design({ iconBackground })} />
              <ColorControl label="Icon color" id={id('icon-color')} value={config.design.iconColor} fallback={config.design.accentColor || theme.accent} onChange={(iconColor) => design({ iconColor })} />
            </div></fieldset>
          </div>
        </div>
  );
};
