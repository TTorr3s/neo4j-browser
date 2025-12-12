/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Neo4j is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import { palette as needlePalette } from '@neo4j-ndl/base/lib/tokens/js/tokens'

import { baseArcTheme } from 'neo4j-arc/common'

import {
  DARK_THEME,
  LIGHT_THEME,
  OUTLINE_THEME
} from 'shared/modules/settings/settingsDuck'

// Currently hard code values for svgs, to be replaced with proper theme colors from NDL
export const stopIconColor = '#FD766E'
export const primaryLightColor = '#68BDF4'

export const base = {
  ...baseArcTheme,
  name: 'base',
  // Text colors
  primaryText: '#333',
  secondaryText: '#717172',
  inputText: '#222',
  headerText: '#333',
  asideText: '#292C33',
  link: '#428BCA',
  linkHover: '#5dade2',
  topicText: '#428BCA',
  preText: '#333',
  promptText: '#c0c2c5',
  neo4jBlue: '#128b9f',
  darkBlue: '#128b9f',

  // Design system colors 38517d
  primary: '#5762d9ff',
  primary50: '#363f9dff',

  // Backgrounds
  primaryBackground: '#D2D5DA',
  secondaryBackground: '#ffffff',
  editorBackground: '#ffffff',
  drawerBackground: '#f5f7fa',
  topicBackground: '#f8f8f8',
  preBackground: '#f5f5f5',
  alteringTableRowBackground: '#f5f5f5',
  frameCommandBackground: '#f5f7fa',
  runnableBackground: '#f5f5f5',
  teaserCardBackground: '#ffffff',
  hoverBackground: '#e2e8f0',

  // Fonts
  primaryFontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  drawerHeaderFontFamily:
    "'Open Sans', 'HelveticaNeue-Light', 'Helvetica Neue Light', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  streamlineFontFamily: 'streamline',
  editorFont:
    '"Fira Code", "Monaco", "Lucida Console", Courier, monospace !important;',
  codeBlockFont: '"Fira Code", "Monaco", "Lucida Console", Courier, monospace',

  // Shadows
  standardShadow:
    '0px 0px 2px rgba(52, 58, 67, 0.1), 0px 1px 2px rgba(52, 58, 67, 0.08), 0px 1px 4px rgba(52, 58, 67, 0.08);',

  // Headers
  primaryHeaderText: '#ffffff',

  // Drawer text (dark for light drawer background)
  drawerText: '#333333',
  drawerTextMuted: '#666666',
  drawerHeaderText: '#333333',

  // Sidebar icon colors
  sidebarIconActive: '#333333',
  sidebarIconInactive: '#797979',

  // User feedback colors
  success: '#65B144',
  error: '#E74C3C',
  warning: '#ffaf00',
  auth: '#303a4bbf',
  info: '#1d232dbf',

  // Form inputs
  inputBackground: '#ffffff',
  inputBackgroundHover: '#fafafa',
  inputBackgroundFocus: '#ffffff',
  inputBorderFocus: '#5762d9ff',
  inputBoxShadowFocus: '#5762d922',
  inputPlaceholder: '#999',

  // Buttons
  primaryButtonText: '#ffffff',
  primaryButtonBackground: '#428BCA',
  secondaryButtonText: '#888',
  secondaryButtonBorder: '1px solid #888',
  secondaryButtonBackground: 'transparent',
  secondaryButtonTextHover: '#ffffff',
  secondaryButtonBorderHover: '1px solid #888',
  secondaryButtonBackgroundHover: '#888',
  formButtonBorder: '1px solid #ccc',
  formButtonBorderHover: '1px solid #adadad',
  formButtonBackgroundHover: '#e6e6e6',
  editModeButtonText: '#ffaf00',

  // Borders
  frameBorder: 'none',
  inFrameBorder: '1px solid #DAE4F0;',
  topicBorder: '1px solid #dadada',
  drawerSeparator: '1px solid #d1d5db',
  monacoEditorBorder: '1px solid #d7e5f1',

  // Frame
  frameSidebarBackground: '#FFF',
  frameTitlebarText: '#717172',
  frameControlButtonTextColor: '#485662',
  frameButtonTextColorLegacy: '#0C1A25',
  frameButtonTextColor: needlePalette.light.neutral.text.weaker,
  frameButtonHoverBackground: needlePalette.light.neutral.hover,
  frameButtonActiveBackground: needlePalette.light.neutral.pressed,
  frameNodePropertiesPanelIconTextColor: '#717172',
  streamBackgroundColor: 'rgba(215, 229, 241, 0.7)',
  mainWrapperBackground: 'rgba(215, 229, 241, 0.7)',
  frameBackground: '#F9FCFF',
  accordionContentBackground: 'white',
  currentEditIconColor: '#6B6B6B',

  // Info message
  infoBackground: needlePalette.light.primary.bg.weak,
  infoBorder: `1px solid ${needlePalette.light.primary.border.weak}`,
  infoIconColor: needlePalette.light.primary.icon,

  // Code block
  codeBlockBackground: '#f5f5f5',
  codeBlockTextColor: needlePalette.light.primary.text,
  codeBlockHoveBackground: needlePalette.light.primary.hover.weak,

  // Drawer command styling
  drawerCommandBackground: '#e2e8f0',
  drawerCommandText: '#c53030'
}

export const normal = {
  ...base,
  name: LIGHT_THEME
}

export const outline = {
  ...base,
  name: OUTLINE_THEME,
  primaryText: '#000',
  secondaryText: '#000',
  frameBorder: '1px solid #000',
  inFrameBorder: '1px solid #000',
  topicBorder: '1px solid #000'
}

// Tokyo Night Storm color palette (darkened)
const tokyoNightStorm = {
  bg: '#1a1b26', // Main background (darkened from #24283b)
  bgDark: '#16161e', // Darker background (darkened from #1f2335)
  bgDarkest: '#101018',
  bgDarkLight: '#24283bff', // Slightly lighter dark background (darkened from #313651ff)
  bgHighlight: '#1f2335', // Line highlight, hover (darkened from #292e42)
  selection: '#24283bff', // Selection, borders (darkened from #414868)
  fg: '#a9b1d6', // Main foreground
  fgBright: '#c0caf5', // Bright foreground
  fgMuted: '#565f89', // Comments, muted text
  blue: '#7aa2f7', // Links, primary
  cyan: '#7dcfff', // Secondary accent
  green: '#9ece6a', // Success
  red: '#f7768e', // Error
  orange: '#ff9e64', // Warning
  purple: '#bb9af7' // Accent
}

export const dark = {
  ...base,
  name: DARK_THEME,

  // Drawer text (same as primaryText in dark theme since both backgrounds are dark)
  drawerText: tokyoNightStorm.fgBright,
  drawerTextMuted: tokyoNightStorm.fg,
  drawerHeaderText: tokyoNightStorm.fgBright,

  // Sidebar icon colors
  sidebarIconActive: '#ffffff',
  sidebarIconInactive: '#797979',

  primaryText: tokyoNightStorm.fgBright,
  secondaryText: tokyoNightStorm.fg,
  headerText: tokyoNightStorm.fgBright,
  primaryHeaderText: tokyoNightStorm.fgBright,
  inputText: tokyoNightStorm.fgBright,
  link: tokyoNightStorm.blue,
  linkHover: tokyoNightStorm.cyan,
  topicText: tokyoNightStorm.fgBright,
  preText: tokyoNightStorm.fg,
  asideText: tokyoNightStorm.fg,

  // Backgrounds - Tokyo Night Storm
  primaryBackground: tokyoNightStorm.selection,
  secondaryBackground: tokyoNightStorm.bgDark,
  alternativeBackground: tokyoNightStorm.bgDarkLight,
  editorBackground: tokyoNightStorm.bg,
  drawerBackground: tokyoNightStorm.bgDarkest,
  topicBackground: 'transparent',
  preBackground: tokyoNightStorm.bgDark,
  alteringTableRowBackground: tokyoNightStorm.bgHighlight,
  frameCommandBackground: tokyoNightStorm.bgDarkest,
  runnableBackground: tokyoNightStorm.bgHighlight,
  teaserCardBackground: tokyoNightStorm.bgDark,

  // Form inputs - Tokyo Night Storm
  inputBackground: tokyoNightStorm.bgHighlight,
  inputBackgroundHover: tokyoNightStorm.selection,
  inputBackgroundFocus: tokyoNightStorm.bgDark,
  inputBorderFocus: '#3c4a6b',
  inputBoxShadowFocus: '#3c4a6b14',
  inputPlaceholder: tokyoNightStorm.fgMuted,
  formButtonBorder: `1px solid ${tokyoNightStorm.selection}`,
  formButtonBorderHover: `1px solid ${tokyoNightStorm.fgMuted}`,
  formButtonBackgroundHover: tokyoNightStorm.selection,

  // Buttons
  primaryButtonText: tokyoNightStorm.fgBright,
  primaryButtonBackground: tokyoNightStorm.purple,
  secondaryButtonText: tokyoNightStorm.fg,
  secondaryButtonBorder: `1px solid ${tokyoNightStorm.selection}`,
  secondaryButtonBackground: 'transparent',
  secondaryButtonTextHover: tokyoNightStorm.fgBright,
  secondaryButtonBorderHover: `1px solid ${tokyoNightStorm.fgMuted}`,
  secondaryButtonBackgroundHover: tokyoNightStorm.bgHighlight,

  // Borders
  inFrameBorder: `1px solid ${tokyoNightStorm.selection}`,
  monacoEditorBorder: `1px solid ${tokyoNightStorm.bgDarkLight}`,

  // Frame - Tokyo Night Storm
  frameSidebarBackground: tokyoNightStorm.bgDark,
  frameTitlebarText: tokyoNightStorm.fgMuted,
  frameControlButtonTextColor: tokyoNightStorm.fg,
  frameButtonTextColorLegacy: tokyoNightStorm.fgBright,
  frameButtonTextColor: tokyoNightStorm.fg,
  frameButtonHoverBackground: tokyoNightStorm.bgHighlight,
  frameButtonActiveBackground: tokyoNightStorm.selection,
  frameNodePropertiesPanelIconTextColor: tokyoNightStorm.fg,
  streamBackgroundColor: tokyoNightStorm.bg,
  mainWrapperBackground: '#14151e',
  frameBackground: tokyoNightStorm.bg,
  accordionContentBackground: tokyoNightStorm.bgDark,
  currentEditIconColor: tokyoNightStorm.fgMuted,

  // Info message
  infoBackground: tokyoNightStorm.bgHighlight,
  infoBorder: `1px solid ${tokyoNightStorm.selection}`,
  infoIconColor: tokyoNightStorm.blue,

  // Code block
  codeBlockBackground: tokyoNightStorm.bgHighlight,
  codeBlockTextColor: tokyoNightStorm.cyan,
  codeBlockHoveBackground: tokyoNightStorm.selection,

  // Drawer command styling
  drawerCommandBackground: tokyoNightStorm.bgHighlight,
  drawerCommandText: tokyoNightStorm.red,

  // Drawer separator for dark theme
  drawerSeparator: `1px solid ${tokyoNightStorm.selection}`,

  // Hover background for dark theme
  hoverBackground: tokyoNightStorm.bgHighlight
}
