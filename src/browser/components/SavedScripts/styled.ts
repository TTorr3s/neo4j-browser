import styled from 'styled-components'

import { primaryLightColor } from 'browser-styles/themes'

export const SavedScriptsBody = styled.div`
  padding: 0 18px;
  margin-bottom: 25px;
`

export const SavedScriptsHeader = styled.h5`
  display: flex;
  justify-content: space-between;
  border-bottom: ${props => props.theme.drawerSeparator};
  font-size: 16px;
  margin-bottom: 12px;
  line-height: 39px;
  position: relative;
  font-weight: bold;
`
export const FolderNameWrapper = styled.span`
  margin-left: 5px;
  line-height: 24px;
`

export const SavedScriptsListItemMain = styled.div<{
  isSelected?: boolean
}>`
  padding: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  background-color: ${props =>
    props.isSelected ? props.theme.hoverBackground : 'inherit'};

  ${props =>
    props.isSelected
      ? `margin-left: -3px;
border-left: 3px solid ${primaryLightColor};`
      : ''};

  &:hover {
    color: inherit;
    background-color: ${props => props.theme.hoverBackground};
  }
`

export const SavedScriptsNewFavorite = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  user-select: none;
  cursor: pointer;
  color: ${props => props.theme.drawerTextMuted};
  font-size: 13px;
  margin-top: 10px;
  padding: 5px;
  transition: color ease-in-out 0.3s;

  &:hover {
    color: ${props => props.theme.drawerText};
  }
`

export const SavedScriptsListItemDisplayName = styled.div`
  flex: 1;
  user-select: none;
  cursor: pointer;
  color: ${props => props.theme.drawerTextMuted};
  font-size: 13px;
  padding: 1px 0;
  margin-right: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    color: ${props => props.theme.drawerText};
  }
`

export const SavedScriptsFolderMain = styled.div`
  padding: 5px;
`
export const ChildrenContainer = styled.div`
  padding-left: 10px;
`

export const SavedScriptsFolderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  padding-bottom: 5px;
`

export const SavedScriptsFolderLabel = styled.div`
  flex: 1;
  margin-right: 10px;
  user-select: none;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
`

export const SavedScriptsFolderCollapseIcon = styled.span`
  margin-right: 3px;
  width: 8px;
  display: inline-block;
  vertical-align: middle;
`

export const SavedScriptsButtonWrapper = styled.div`
  min-width: 21px;

  > button:not(:last-of-type) {
    margin-right: 2px;
  }

  svg {
    display: inline-block;
    vertical-align: middle;
  }
`

export const SavedScriptsFolderMenuIconWrapper = styled.div`
  padding: 0 0.3rem;
  line-height: 24px;
`

export const StyledSavedScriptsButton = styled.button<{ color?: string }>`
  color: ${props => (props.color ? props.color : props.theme.drawerTextMuted)};
  background: transparent;
  border: none;
  outline: none;
  padding: 3px;
  transition: color ease-in-out 0.3s;
  cursor: pointer;

  &:hover {
    color: ${props => (props.color ? props.color : props.theme.drawerText)};
  }
`

export const SavedScriptsInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-weight: normal;
  margin-right: 5px;

  ::selection {
    color: white;
    background-color: ${props => props.theme.linkHover};
  }
`

export const SavedScriptsSearchInput = styled.input`
  width: 100%;
  padding: 6px 10px;
  border-radius: 4px;
  outline: none;
  background: ${props => props.theme.inputBackground};
  color: ${props => props.theme.inputText};
  font-size: 13px;
  margin-bottom: 12px;

  &:focus {
    border-color: ${props => props.theme.linkHover};
  }

  &::placeholder {
    color: ${props => props.theme.drawerTextMuted};
  }
`

export const ContextMenuContainer = styled.span`
  position: relative;
  cursor: pointer;
`

export const ContextMenuHoverParent = styled.span<{ stayVisible?: boolean }>`
  ${ContextMenuContainer} {
    visibility: ${props => (props.stayVisible ? 'visible' : 'hidden')};
  }

  &:hover ${ContextMenuContainer} {
    visibility: visible;
  }
`

export const ContextMenu = styled.div`
  color: ${props => props.theme.primaryText};
  padding-top: 5px;
  padding-bottom: 5px;
  position: absolute;
  width: 156px;
  left: -156px;
  top: -3px;
  z-index: 99;
  border: 1px solid transparent;
  background-color: ${props => props.theme.secondaryBackground};
  border: ${props => props.theme.frameBorder};

  box-shadow: ${props => props.theme.standardShadow};
  border-radius: 2px;
`
export const ContextMenuItem = styled.div`
  cursor: pointer;
  width: 100%;
  padding-left: 5px;

  &:hover {
    background-color: ${props => props.theme.primaryBackground};
  }
`

export const Separator = styled.div`
  border-bottom: 1px solid rgb(77, 74, 87, 0.3);
`

export const QueryStatsSectionContainer = styled.div`
  margin-bottom: 12px;
`

export const QueryStatsSectionHeader = styled.div`
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${props => props.theme.drawerTextMuted};
  margin-bottom: 4px;
`

export const QueryStatsItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 5px;
  cursor: pointer;
  border-radius: 3px;

  &:hover {
    background-color: ${props => props.theme.hoverBackground};
  }
`

export const QueryStatsItemText = styled.div`
  flex: 1;
  font-size: 13px;
  color: ${props => props.theme.drawerTextMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;

  ${QueryStatsItem}:hover & {
    color: ${props => props.theme.drawerText};
  }
`

export const QueryStatsItemCount = styled.span`
  font-size: 11px;
  color: ${props => props.theme.drawerTextMuted};
  margin-right: 6px;
  flex-shrink: 0;
`

export const QueryStatsItemActions = styled.div`
  flex-shrink: 0;
  visibility: hidden;

  ${QueryStatsItem}:hover & {
    visibility: visible;
  }
`
