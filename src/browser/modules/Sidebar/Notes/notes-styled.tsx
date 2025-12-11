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
import styled from 'styled-components'

// Container for the list of notes with scroll
export const NotesListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0;
  overflow-y: auto;
  flex: 1;
`

// Card container with collapse animation
export const CardContainer = styled.div<{ $isCollapsed: boolean }>`
  background-color: ${props => props.theme.alternativeBackground};
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  overflow: hidden;
  transition: max-height 0.2s ease-out;
`

// Card header with title and buttons
export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.15);
  cursor: pointer;

  &:hover {
    background-color: rgba(0, 0, 0, 0.25);
  }
`

export const CardTitle = styled.span`
  flex: 1;
  font-weight: 500;
  color: ${props => props.theme.drawerText};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const CardTitleInput = styled.input`
  flex: 1;
  background: transparent;
  border: 1px solid ${props => props.theme.primary};
  border-radius: 2px;
  color: ${props => props.theme.drawerText};
  padding: 2px 6px;
  font-weight: 500;

  &:focus {
    outline: none;
  }
`

export const CardActions = styled.div`
  display: flex;
  gap: 4px;
  margin-left: 8px;
`

export const ActionButton = styled.button`
  background: transparent;
  border: none;
  color: ${props => props.theme.drawerTextMuted};
  cursor: pointer;
  padding: 4px;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;

  &:hover {
    color: ${props => props.theme.drawerText};
    background-color: ${props => props.theme.hoverBackground};
  }
`

// Card content
export const CardContent = styled.div<{ $isCollapsed: boolean }>`
  padding: ${props => (props.$isCollapsed ? '0' : '4px 4px 2px 4px')};
  max-height: ${props => (props.$isCollapsed ? '0' : 'calc(80vh - 200px)')};
  overflow-y: auto;
  transition: all 0.2s ease-out;
`

export const ContentTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  background: transparent;
  border: ${props => props.theme.drawerSeparator};
  border-radius: 4px;
  color: ${props => props.theme.drawerText};
  font-size: 13px;
  padding: 8px;
  resize: vertical;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }

  &::placeholder {
    color: ${props => props.theme.drawerTextMuted};
  }
`

export const CardFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 4px 0;
  font-size: 10px;
  color: rgba(150, 150, 150, 0.6);
`

export const CharacterCounter = styled.span<{ $isNearLimit: boolean }>`
  color: ${props =>
    props.$isNearLimit ? props.theme.error : props.theme.drawerTextMuted};
`

// Button to create new note
export const NewNoteButton = styled.button`
  width: 100%;
  padding: 10px;
  background-color: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

// Delete confirmation overlay
export const DeleteConfirmOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

export const DeleteConfirmDialog = styled.div`
  background: ${props => props.theme.secondaryBackground};
  padding: 20px;
  border-radius: 8px;
  max-width: 300px;
  text-align: center;
`

export const DeleteConfirmTitle = styled.p`
  color: ${props => props.theme.primaryText};
  margin-bottom: 16px;
`

export const DeleteConfirmButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`

export const ConfirmButton = styled.button<{ $danger?: boolean }>`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;

  background-color: ${props =>
    props.$danger ? props.theme.error : props.theme.secondaryButtonBackground};
  color: ${props =>
    props.$danger ? 'white' : props.theme.secondaryButtonText};

  &:hover {
    opacity: 0.9;
  }
`

export const EmptyStateMessage = styled.div`
  text-align: center;
  color: ${props => props.theme.drawerTextMuted};
  padding: 20px;
`
