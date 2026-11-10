import * as React from 'react';
import { Range, Toggle } from '../EditorControls';
import { TileIcon } from '../TileIcon';
import type { EditorController } from './useEditorController';
import styles from '../StudioEditor.module.scss';

interface Props { editor: EditorController; }

export const ResponsiveSection: React.FC<Props> = ({ editor }) => {
  const { config, responsive, id } = editor;
  return (
<div id={id('panel-responsive')} role="tabpanel" aria-labelledby={id('tab-responsive')}>
          <div className={styles.sectionHeader}><div><h3>Every width, considered</h3><p>Layouts adapt to the available web part width, including narrow SharePoint sections.</p></div></div>
          <div className={styles.responsiveCards}>
            <fieldset className={styles.settingsGroup}><legend>Tablet &amp; narrow columns</legend><Range label="Tablet columns" id={id('tablet-columns')} min={1} max={4} suffix="" value={config.responsive.tabletColumns} onChange={(tabletColumns) => responsive({ tabletColumns })} /><Range label="Tablet breakpoint" id={id('tablet-breakpoint')} min={600} max={1400} value={config.responsive.tabletBreakpoint} hint="Use the tablet layout at or below this web part width." onChange={(tabletBreakpoint) => responsive({ tabletBreakpoint, mobileBreakpoint: Math.min(config.responsive.mobileBreakpoint, tabletBreakpoint - 100) })} /></fieldset>
            <fieldset className={styles.settingsGroup}><legend>Mobile &amp; small sections</legend><Range label="Mobile columns" id={id('mobile-columns')} min={1} max={2} suffix="" value={config.responsive.mobileColumns} onChange={(mobileColumns) => responsive({ mobileColumns })} /><Range label="Mobile breakpoint" id={id('mobile-breakpoint')} min={320} max={Math.min(700, config.responsive.tabletBreakpoint - 100)} value={config.responsive.mobileBreakpoint} onChange={(mobileBreakpoint) => responsive({ mobileBreakpoint })} /><Toggle label="Compact spacing on mobile" id={id('mobile-compact')} value={config.responsive.compactOnMobile} onChange={(compactOnMobile) => responsive({ compactOnMobile })} /><Toggle label="Hide decorative images on mobile" id={id('mobile-images')} value={config.responsive.hideImagesOnMobile} onChange={(hideImagesOnMobile) => responsive({ hideImagesOnMobile })} hint="Images with alternative text remain available." />
              <Toggle label="Stack actions on narrow screens" id={id('mobile-action-stack')} value={config.responsive.stackActionsOnMobile} onChange={(stackActionsOnMobile) => responsive({ stackActionsOnMobile })} />
              <Toggle label="Hide reading time / metadata" id={id('mobile-hide-meta')} value={config.responsive.hideMetaOnMobile} onChange={(hideMetaOnMobile) => responsive({ hideMetaOnMobile })} />
              <Toggle label="Hide category labels" id={id('mobile-hide-category')} value={config.responsive.hideCategoryOnMobile} onChange={(hideCategoryOnMobile) => responsive({ hideCategoryOnMobile })} />
              <Toggle label="Hide secondary actions" id={id('mobile-hide-secondary')} value={config.responsive.hideSecondaryOnMobile} onChange={(hideSecondaryOnMobile) => responsive({ hideSecondaryOnMobile })} hint="Choose carefully: hidden actions should remain available elsewhere." />
            </fieldset>
            <fieldset className={styles.settingsGroup}><legend>Motion preferences</legend><Toggle label="Reduce motion for everyone" id={id('reduce-motion')} value={config.responsive.reduceMotion} onChange={(reduceMotion) => responsive({ reduceMotion })} hint="Disables tile motion even if the employee has not requested reduced motion." /><p className={styles.hint}>The employee’s operating-system reduced-motion setting is always honored.</p><div className={styles.infoBox}><TileIcon name="info" size={20} /><span>Check the live preview in both wide and narrow SharePoint sections. Long text wraps without being cut off.</span></div></fieldset>
          </div>
        </div>
  );
};
