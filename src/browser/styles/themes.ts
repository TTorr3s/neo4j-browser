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
  AUTO_THEME,
  BEARDED_MELLE_JULIET_LIGHT_THEME,
  BEARDED_OLED_THEME,
  BEARDED_VIVID_BLACK_THEME,
  DARK_THEME,
  LIGHT_THEME,
  NORD_THEME,
  OUTLINE_THEME,
  ResolvedThemeId,
  SOLARIZED_LIGHT_THEME,
  ThemeId
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

export type BrowserTheme = typeof base & Record<string, string>

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

const nordPalette = {
  bg: '#2E3440',
  bgDark: '#242933',
  bgDarkest: '#1f242e',
  bgHighlight: '#3B4252',
  selection: '#434C5E',
  fg: '#D8DEE9',
  fgBright: '#ECEFF4',
  fgMuted: '#81A1C1',
  blue: '#88C0D0',
  blueDark: '#5E81AC',
  green: '#A3BE8C',
  red: '#BF616A',
  orange: '#D08770',
  purple: '#B48EAD'
}

export const nord = {
  ...base,
  name: NORD_THEME,

  primary: nordPalette.blue,
  primary50: nordPalette.blueDark,

  drawerText: nordPalette.fgBright,
  drawerTextMuted: nordPalette.fg,
  drawerHeaderText: nordPalette.fgBright,
  sidebarIconActive: nordPalette.fgBright,
  sidebarIconInactive: '#7f8795',

  primaryText: nordPalette.fgBright,
  secondaryText: nordPalette.fg,
  headerText: nordPalette.fgBright,
  primaryHeaderText: nordPalette.fgBright,
  inputText: nordPalette.fgBright,
  link: nordPalette.blue,
  linkHover: '#8FBCBB',
  topicText: nordPalette.fgBright,
  preText: nordPalette.fg,
  asideText: nordPalette.fg,

  primaryBackground: nordPalette.selection,
  secondaryBackground: nordPalette.bgDark,
  alternativeBackground: nordPalette.bgHighlight,
  editorBackground: nordPalette.bg,
  drawerBackground: nordPalette.bgDarkest,
  topicBackground: 'transparent',
  preBackground: nordPalette.bgDark,
  alteringTableRowBackground: nordPalette.bgHighlight,
  frameCommandBackground: nordPalette.bgDarkest,
  runnableBackground: nordPalette.bgHighlight,
  teaserCardBackground: nordPalette.bgDark,
  hoverBackground: nordPalette.bgHighlight,

  inputBackground: nordPalette.bgHighlight,
  inputBackgroundHover: nordPalette.selection,
  inputBackgroundFocus: nordPalette.bgDark,
  inputBorderFocus: nordPalette.blue,
  inputBoxShadowFocus: '#88C0D033',
  inputPlaceholder: nordPalette.fgMuted,
  formButtonBorder: `1px solid ${nordPalette.selection}`,
  formButtonBorderHover: `1px solid ${nordPalette.fgMuted}`,
  formButtonBackgroundHover: nordPalette.selection,

  primaryButtonText: nordPalette.bgDark,
  primaryButtonBackground: nordPalette.blue,
  secondaryButtonText: nordPalette.fg,
  secondaryButtonBorder: `1px solid ${nordPalette.selection}`,
  secondaryButtonBackground: 'transparent',
  secondaryButtonTextHover: nordPalette.fgBright,
  secondaryButtonBorderHover: `1px solid ${nordPalette.fgMuted}`,
  secondaryButtonBackgroundHover: nordPalette.bgHighlight,

  inFrameBorder: `1px solid ${nordPalette.selection}`,
  monacoEditorBorder: `1px solid ${nordPalette.selection}`,
  drawerSeparator: `1px solid ${nordPalette.selection}`,

  frameSidebarBackground: nordPalette.bgDark,
  frameTitlebarText: nordPalette.fgMuted,
  frameControlButtonTextColor: nordPalette.fg,
  frameButtonTextColorLegacy: nordPalette.fgBright,
  frameButtonTextColor: nordPalette.fg,
  frameButtonHoverBackground: nordPalette.bgHighlight,
  frameButtonActiveBackground: nordPalette.selection,
  frameNodePropertiesPanelIconTextColor: nordPalette.fg,
  streamBackgroundColor: nordPalette.bg,
  mainWrapperBackground: nordPalette.bgDarkest,
  frameBackground: nordPalette.bg,
  accordionContentBackground: nordPalette.bgDark,
  currentEditIconColor: nordPalette.fgMuted,

  infoBackground: nordPalette.bgHighlight,
  infoBorder: `1px solid ${nordPalette.selection}`,
  infoIconColor: nordPalette.blue,

  codeBlockBackground: nordPalette.bgHighlight,
  codeBlockTextColor: '#8FBCBB',
  codeBlockHoveBackground: nordPalette.selection,

  drawerCommandBackground: nordPalette.bgHighlight,
  drawerCommandText: nordPalette.red
}

const solarizedLightPalette = {
  base3: '#FDF6E3',
  base2: '#EEE8D5',
  base1: '#93A1A1',
  base0: '#839496',
  base00: '#657B83',
  base01: '#586E75',
  base02: '#073642',
  blue: '#268BD2',
  cyan: '#2AA198',
  green: '#859900',
  red: '#DC322F',
  orange: '#CB4B16',
  violet: '#6C71C4'
}

export const solarizedLight = {
  ...base,
  name: SOLARIZED_LIGHT_THEME,

  primary: solarizedLightPalette.blue,
  primary50: '#1e6ea8',

  drawerText: solarizedLightPalette.base02,
  drawerTextMuted: solarizedLightPalette.base00,
  drawerHeaderText: solarizedLightPalette.base02,
  sidebarIconActive: solarizedLightPalette.base02,
  sidebarIconInactive: solarizedLightPalette.base00,

  primaryText: solarizedLightPalette.base02,
  secondaryText: solarizedLightPalette.base00,
  headerText: solarizedLightPalette.base02,
  primaryHeaderText: solarizedLightPalette.base02,
  inputText: solarizedLightPalette.base02,
  link: solarizedLightPalette.blue,
  linkHover: solarizedLightPalette.cyan,
  topicText: solarizedLightPalette.blue,
  preText: solarizedLightPalette.base01,
  asideText: solarizedLightPalette.base00,

  primaryBackground: solarizedLightPalette.base2,
  secondaryBackground: solarizedLightPalette.base3,
  alternativeBackground: '#F6EFD9',
  editorBackground: solarizedLightPalette.base3,
  drawerBackground: solarizedLightPalette.base2,
  topicBackground: 'transparent',
  preBackground: solarizedLightPalette.base2,
  alteringTableRowBackground: '#F7F0DC',
  frameCommandBackground: solarizedLightPalette.base2,
  runnableBackground: '#F7F0DC',
  teaserCardBackground: solarizedLightPalette.base3,
  hoverBackground: '#E8DFC8',

  inputBackground: solarizedLightPalette.base3,
  inputBackgroundHover: '#F7F0DC',
  inputBackgroundFocus: solarizedLightPalette.base3,
  inputBorderFocus: solarizedLightPalette.blue,
  inputBoxShadowFocus: '#268BD233',
  inputPlaceholder: solarizedLightPalette.base1,
  formButtonBorder: `1px solid ${solarizedLightPalette.base1}`,
  formButtonBorderHover: `1px solid ${solarizedLightPalette.blue}`,
  formButtonBackgroundHover: solarizedLightPalette.base2,

  primaryButtonText: solarizedLightPalette.base3,
  primaryButtonBackground: solarizedLightPalette.blue,
  secondaryButtonText: solarizedLightPalette.base00,
  secondaryButtonBorder: `1px solid ${solarizedLightPalette.base1}`,
  secondaryButtonBackground: 'transparent',
  secondaryButtonTextHover: solarizedLightPalette.base02,
  secondaryButtonBorderHover: `1px solid ${solarizedLightPalette.blue}`,
  secondaryButtonBackgroundHover: solarizedLightPalette.base2,

  inFrameBorder: `1px solid ${solarizedLightPalette.base1}`,
  monacoEditorBorder: `1px solid ${solarizedLightPalette.base1}`,
  drawerSeparator: `1px solid ${solarizedLightPalette.base1}`,

  frameSidebarBackground: solarizedLightPalette.base2,
  frameTitlebarText: solarizedLightPalette.base00,
  frameControlButtonTextColor: solarizedLightPalette.base00,
  frameButtonTextColorLegacy: solarizedLightPalette.base02,
  frameButtonTextColor: solarizedLightPalette.base00,
  frameButtonHoverBackground: '#E8DFC8',
  frameButtonActiveBackground: '#DDD3BA',
  frameNodePropertiesPanelIconTextColor: solarizedLightPalette.base00,
  streamBackgroundColor: '#EEE8D5cc',
  mainWrapperBackground: '#EDE6D0',
  frameBackground: solarizedLightPalette.base3,
  accordionContentBackground: solarizedLightPalette.base3,
  currentEditIconColor: solarizedLightPalette.base00,

  infoBackground: '#E4F1F4',
  infoBorder: `1px solid ${solarizedLightPalette.cyan}`,
  infoIconColor: solarizedLightPalette.blue,

  codeBlockBackground: solarizedLightPalette.base2,
  codeBlockTextColor: solarizedLightPalette.base02,
  codeBlockHoveBackground: '#E8DFC8',

  drawerCommandBackground: '#E8DFC8',
  drawerCommandText: solarizedLightPalette.red
}

type BeardedDarkPalette = {
  name: ResolvedThemeId
  primary: string
  primary50: string
  primaryButtonBackground: string
  bg: string
  bgDark: string
  bgDarkest: string
  bgHighlight: string
  selection: string
  fg: string
  fgBright: string
  fgMuted: string
  blue: string
  cyan: string
  green: string
  orange: string
  purple: string
  red: string
  yellow: string
}

const createBeardedDarkTheme = (palette: BeardedDarkPalette): BrowserTheme => ({
  ...base,
  name: palette.name,

  primary: palette.primary,
  primary50: palette.primary50,

  drawerText: palette.fgBright,
  drawerTextMuted: palette.fg,
  drawerHeaderText: palette.fgBright,
  sidebarIconActive: palette.fgBright,
  sidebarIconInactive: palette.fgMuted,

  primaryText: palette.fgBright,
  secondaryText: palette.fg,
  headerText: palette.fgBright,
  primaryHeaderText: palette.fgBright,
  inputText: palette.fgBright,
  link: palette.blue,
  linkHover: palette.cyan,
  topicText: palette.fgBright,
  preText: palette.fg,
  asideText: palette.fg,

  primaryBackground: palette.selection,
  secondaryBackground: palette.bgDark,
  alternativeBackground: palette.bgHighlight,
  editorBackground: palette.bg,
  drawerBackground: palette.bgDarkest,
  topicBackground: 'transparent',
  preBackground: palette.bgDark,
  alteringTableRowBackground: palette.bgHighlight,
  frameCommandBackground: palette.bgDarkest,
  runnableBackground: palette.bgHighlight,
  teaserCardBackground: palette.bgDark,
  hoverBackground: palette.bgHighlight,

  success: palette.green,
  error: palette.red,
  warning: palette.yellow,
  info: palette.blue,

  inputBackground: palette.bgHighlight,
  inputBackgroundHover: palette.selection,
  inputBackgroundFocus: palette.bgDark,
  inputBorderFocus: palette.primary,
  inputBoxShadowFocus: `${palette.primary}33`,
  inputPlaceholder: palette.fgMuted,
  formButtonBorder: `1px solid ${palette.selection}`,
  formButtonBorderHover: `1px solid ${palette.fgMuted}`,
  formButtonBackgroundHover: palette.selection,

  primaryButtonText: palette.fgBright,
  primaryButtonBackground: palette.primaryButtonBackground,
  secondaryButtonText: palette.fg,
  secondaryButtonBorder: `1px solid ${palette.selection}`,
  secondaryButtonBackground: 'transparent',
  secondaryButtonTextHover: palette.fgBright,
  secondaryButtonBorderHover: `1px solid ${palette.fgMuted}`,
  secondaryButtonBackgroundHover: palette.bgHighlight,

  inFrameBorder: `1px solid ${palette.selection}`,
  monacoEditorBorder: `1px solid ${palette.selection}`,
  drawerSeparator: `1px solid ${palette.selection}`,

  frameSidebarBackground: palette.bgDark,
  frameTitlebarText: palette.fgMuted,
  frameControlButtonTextColor: palette.fg,
  frameButtonTextColorLegacy: palette.fgBright,
  frameButtonTextColor: palette.fg,
  frameButtonHoverBackground: palette.bgHighlight,
  frameButtonActiveBackground: palette.selection,
  frameNodePropertiesPanelIconTextColor: palette.fg,
  streamBackgroundColor: palette.bg,
  mainWrapperBackground: palette.bgDarkest,
  frameBackground: palette.bg,
  accordionContentBackground: palette.bgDark,
  currentEditIconColor: palette.fgMuted,

  infoBackground: palette.bgHighlight,
  infoBorder: `1px solid ${palette.selection}`,
  infoIconColor: palette.blue,

  codeBlockBackground: palette.bgHighlight,
  codeBlockTextColor: palette.cyan,
  codeBlockHoveBackground: palette.selection,

  drawerCommandBackground: palette.bgHighlight,
  drawerCommandText: palette.red
})

const beardedVividBlackPalette = {
  primary: '#AAAAAA',
  primary50: '#76767c',
  primaryButtonBackground: '#A95EFF',
  bg: '#141417',
  bgDark: '#0f0f12',
  bgDarkest: '#08080a',
  bgHighlight: '#202024',
  selection: '#313139',
  fg: '#d7d7de',
  fgBright: '#f0f0f4',
  fgMuted: '#888894',
  blue: '#28A9FF',
  cyan: '#14E5D4',
  green: '#42DD76',
  orange: '#FF7135',
  purple: '#A95EFF',
  red: '#D62C2C',
  salmon: '#FF478D',
  yellow: '#FFB638'
}

export const beardedVividBlack = createBeardedDarkTheme({
  name: BEARDED_VIVID_BLACK_THEME,
  ...beardedVividBlackPalette
})

const beardedOledPalette = {
  primary: '#688eff',
  primary50: '#526cc2',
  primaryButtonBackground: '#688eff',
  bg: '#000000',
  bgDark: '#050505',
  bgDarkest: '#000000',
  bgHighlight: '#151515',
  selection: '#262626',
  fg: '#d6d6d6',
  fgBright: '#f2f2f2',
  fgMuted: '#858585',
  blue: '#63BBE5',
  cyan: '#6AD3CD',
  green: '#5CD4C3',
  orange: '#E79E69',
  purple: '#B69EDE',
  red: '#E87474',
  salmon: '#DE8199',
  yellow: '#E0CF77'
}

export const beardedOled = createBeardedDarkTheme({
  name: BEARDED_OLED_THEME,
  ...beardedOledPalette
})

const beardedMelleJulietLightPalette = {
  bg: '#edeeee',
  bgAlt: '#f7f8f8',
  bgMid: '#e2e7e7',
  bgHover: '#d7dddd',
  border: '#bdcaca',
  fg: '#1f3839',
  fgMuted: '#607173',
  primary: '#218d8f',
  primary50: '#176d70',
  blue: '#1f89cf',
  green: '#2aa54d',
  orange: '#c97a2a',
  purple: '#7c68ef',
  red: '#d24545',
  cyan: '#23716d',
  yellow: '#b48806'
}

export const beardedMelleJulietLight: BrowserTheme = {
  ...base,
  name: BEARDED_MELLE_JULIET_LIGHT_THEME,

  primary: beardedMelleJulietLightPalette.primary,
  primary50: beardedMelleJulietLightPalette.primary50,

  drawerText: beardedMelleJulietLightPalette.fg,
  drawerTextMuted: beardedMelleJulietLightPalette.fgMuted,
  drawerHeaderText: beardedMelleJulietLightPalette.fg,
  sidebarIconActive: beardedMelleJulietLightPalette.fg,
  sidebarIconInactive: beardedMelleJulietLightPalette.fgMuted,

  primaryText: beardedMelleJulietLightPalette.fg,
  secondaryText: beardedMelleJulietLightPalette.fgMuted,
  headerText: beardedMelleJulietLightPalette.fg,
  primaryHeaderText: beardedMelleJulietLightPalette.fg,
  inputText: beardedMelleJulietLightPalette.fg,
  link: beardedMelleJulietLightPalette.blue,
  linkHover: beardedMelleJulietLightPalette.primary,
  topicText: beardedMelleJulietLightPalette.blue,
  preText: beardedMelleJulietLightPalette.fgMuted,
  asideText: beardedMelleJulietLightPalette.fgMuted,

  primaryBackground: beardedMelleJulietLightPalette.bgMid,
  secondaryBackground: beardedMelleJulietLightPalette.bgAlt,
  alternativeBackground: beardedMelleJulietLightPalette.bgHover,
  editorBackground: beardedMelleJulietLightPalette.bg,
  drawerBackground: beardedMelleJulietLightPalette.bgMid,
  topicBackground: 'transparent',
  preBackground: beardedMelleJulietLightPalette.bgMid,
  alteringTableRowBackground: beardedMelleJulietLightPalette.bgHover,
  frameCommandBackground: beardedMelleJulietLightPalette.bgMid,
  runnableBackground: beardedMelleJulietLightPalette.bgHover,
  teaserCardBackground: beardedMelleJulietLightPalette.bgAlt,
  hoverBackground: beardedMelleJulietLightPalette.bgHover,

  success: beardedMelleJulietLightPalette.green,
  error: beardedMelleJulietLightPalette.red,
  warning: beardedMelleJulietLightPalette.yellow,
  info: beardedMelleJulietLightPalette.blue,

  inputBackground: beardedMelleJulietLightPalette.bgAlt,
  inputBackgroundHover: beardedMelleJulietLightPalette.bg,
  inputBackgroundFocus: beardedMelleJulietLightPalette.bgAlt,
  inputBorderFocus: beardedMelleJulietLightPalette.primary,
  inputBoxShadowFocus: '#218d8f33',
  inputPlaceholder: beardedMelleJulietLightPalette.fgMuted,
  formButtonBorder: `1px solid ${beardedMelleJulietLightPalette.border}`,
  formButtonBorderHover: `1px solid ${beardedMelleJulietLightPalette.primary}`,
  formButtonBackgroundHover: beardedMelleJulietLightPalette.bgHover,

  primaryButtonText: '#ffffff',
  primaryButtonBackground: beardedMelleJulietLightPalette.primary,
  secondaryButtonText: beardedMelleJulietLightPalette.fgMuted,
  secondaryButtonBorder: `1px solid ${beardedMelleJulietLightPalette.border}`,
  secondaryButtonBackground: 'transparent',
  secondaryButtonTextHover: beardedMelleJulietLightPalette.fg,
  secondaryButtonBorderHover: `1px solid ${beardedMelleJulietLightPalette.primary}`,
  secondaryButtonBackgroundHover: beardedMelleJulietLightPalette.bgHover,

  inFrameBorder: `1px solid ${beardedMelleJulietLightPalette.border}`,
  monacoEditorBorder: `1px solid ${beardedMelleJulietLightPalette.border}`,
  drawerSeparator: `1px solid ${beardedMelleJulietLightPalette.border}`,

  frameSidebarBackground: beardedMelleJulietLightPalette.bgMid,
  frameTitlebarText: beardedMelleJulietLightPalette.fgMuted,
  frameControlButtonTextColor: beardedMelleJulietLightPalette.fgMuted,
  frameButtonTextColorLegacy: beardedMelleJulietLightPalette.fg,
  frameButtonTextColor: beardedMelleJulietLightPalette.fgMuted,
  frameButtonHoverBackground: beardedMelleJulietLightPalette.bgHover,
  frameButtonActiveBackground: '#cbd6d6',
  frameNodePropertiesPanelIconTextColor: beardedMelleJulietLightPalette.fgMuted,
  streamBackgroundColor: '#e2e7e7cc',
  mainWrapperBackground: '#dfe7e7',
  frameBackground: beardedMelleJulietLightPalette.bgAlt,
  accordionContentBackground: beardedMelleJulietLightPalette.bgAlt,
  currentEditIconColor: beardedMelleJulietLightPalette.fgMuted,

  infoBackground: '#dff1f1',
  infoBorder: `1px solid ${beardedMelleJulietLightPalette.primary}`,
  infoIconColor: beardedMelleJulietLightPalette.blue,

  codeBlockBackground: beardedMelleJulietLightPalette.bgMid,
  codeBlockTextColor: beardedMelleJulietLightPalette.fg,
  codeBlockHoveBackground: beardedMelleJulietLightPalette.bgHover,

  drawerCommandBackground: beardedMelleJulietLightPalette.bgHover,
  drawerCommandText: beardedMelleJulietLightPalette.red
}

type ThemeMode = 'system' | 'light' | 'dark'

export type ThemePreset = {
  id: ThemeId
  displayName: string
  mode: ThemeMode
  previewSwatches: string[]
  uiTheme?: BrowserTheme
  monacoThemeId: ResolvedThemeId
}

export const themesById: Record<ResolvedThemeId, BrowserTheme> = {
  [LIGHT_THEME]: normal,
  [OUTLINE_THEME]: outline,
  [DARK_THEME]: dark,
  [NORD_THEME]: nord,
  [SOLARIZED_LIGHT_THEME]: solarizedLight,
  [BEARDED_VIVID_BLACK_THEME]: beardedVividBlack,
  [BEARDED_OLED_THEME]: beardedOled,
  [BEARDED_MELLE_JULIET_LIGHT_THEME]: beardedMelleJulietLight
}

export const themePresets: ThemePreset[] = [
  {
    id: AUTO_THEME,
    displayName: 'Auto',
    mode: 'system',
    previewSwatches: [
      normal.primaryBackground,
      normal.secondaryBackground,
      dark.editorBackground,
      dark.link
    ],
    monacoThemeId: LIGHT_THEME
  },
  {
    id: LIGHT_THEME,
    displayName: 'Light',
    mode: 'light',
    previewSwatches: [
      normal.primaryBackground,
      normal.secondaryBackground,
      normal.link,
      normal.success
    ],
    uiTheme: normal,
    monacoThemeId: LIGHT_THEME
  },
  {
    id: OUTLINE_THEME,
    displayName: 'Outline',
    mode: 'light',
    previewSwatches: ['#ffffff', '#000000', '#d9d9d9', '#555555'],
    uiTheme: outline,
    monacoThemeId: OUTLINE_THEME
  },
  {
    id: DARK_THEME,
    displayName: 'Tokyo Night',
    mode: 'dark',
    previewSwatches: [
      dark.editorBackground,
      dark.secondaryBackground,
      dark.link,
      dark.primaryButtonBackground
    ],
    uiTheme: dark,
    monacoThemeId: DARK_THEME
  },
  {
    id: NORD_THEME,
    displayName: 'Nord',
    mode: 'dark',
    previewSwatches: [
      nord.editorBackground,
      nord.secondaryBackground,
      nord.link,
      nord.primaryButtonBackground
    ],
    uiTheme: nord,
    monacoThemeId: NORD_THEME
  },
  {
    id: SOLARIZED_LIGHT_THEME,
    displayName: 'Solarized Light',
    mode: 'light',
    previewSwatches: [
      solarizedLight.editorBackground,
      solarizedLight.primaryBackground,
      solarizedLight.link,
      solarizedLight.drawerCommandText
    ],
    uiTheme: solarizedLight,
    monacoThemeId: SOLARIZED_LIGHT_THEME
  },
  {
    id: BEARDED_VIVID_BLACK_THEME,
    displayName: 'Bearded Vivid Black',
    mode: 'dark',
    previewSwatches: [
      beardedVividBlack.editorBackground,
      beardedVividBlack.secondaryBackground,
      beardedVividBlackPalette.blue,
      beardedVividBlackPalette.purple
    ],
    uiTheme: beardedVividBlack,
    monacoThemeId: BEARDED_VIVID_BLACK_THEME
  },
  {
    id: BEARDED_OLED_THEME,
    displayName: 'Bearded OLED',
    mode: 'dark',
    previewSwatches: [
      beardedOled.editorBackground,
      beardedOled.secondaryBackground,
      beardedOledPalette.primary,
      beardedOledPalette.green
    ],
    uiTheme: beardedOled,
    monacoThemeId: BEARDED_OLED_THEME
  },
  {
    id: BEARDED_MELLE_JULIET_LIGHT_THEME,
    displayName: 'Bearded Melle Juliet Light',
    mode: 'light',
    previewSwatches: [
      beardedMelleJulietLight.editorBackground,
      beardedMelleJulietLight.primaryBackground,
      beardedMelleJulietLightPalette.primary,
      beardedMelleJulietLightPalette.purple
    ],
    uiTheme: beardedMelleJulietLight,
    monacoThemeId: BEARDED_MELLE_JULIET_LIGHT_THEME
  }
]

export const themePresetsById = themePresets.reduce(
  (presets, preset) => ({ ...presets, [preset.id]: preset }),
  {} as Record<ThemeId, ThemePreset>
)

export const getUiTheme = (themeId: ResolvedThemeId): BrowserTheme =>
  themesById[themeId] || normal

export const getThemePreset = (themeId: ThemeId): ThemePreset =>
  themePresetsById[themeId] || themePresetsById[AUTO_THEME]
