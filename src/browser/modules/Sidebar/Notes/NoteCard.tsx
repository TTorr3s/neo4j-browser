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
import React, { useState, useCallback, useRef, useEffect } from 'react'

import {
  CloseIcon,
  UpIcon,
  DownIcon
} from 'browser-components/icons/LegacyIcons'
import { Note, NOTES_CONFIG } from 'shared/services/notesStorage'

import {
  CardContainer,
  CardHeader,
  CardTitle,
  CardTitleInput,
  CardActions,
  ActionButton,
  CardContent,
  ContentTextarea,
  CardFooter,
  DeleteConfirmOverlay,
  DeleteConfirmDialog,
  DeleteConfirmTitle,
  DeleteConfirmButtons,
  ConfirmButton
} from './notes-styled'

interface NoteCardProps {
  note: Note
  onUpdate: (id: number, updates: Partial<Note>) => void
  onDelete: (id: number) => void
  onToggleCollapse: (id: number) => void
}

const NoteCard = React.memo(function NoteCard({
  note,
  onUpdate,
  onDelete,
  onToggleCollapse
}: NoteCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [localTitle, setLocalTitle] = useState(note.title)
  const [localContent, setLocalContent] = useState(note.content)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local state when note prop changes
  useEffect(() => {
    setLocalTitle(note.title)
    setLocalContent(note.content)
  }, [note.title, note.content])

  // Focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  // Debounced update
  const debouncedUpdate = useCallback(
    (updates: Partial<Note>) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        onUpdate(note.id, updates)
      }, NOTES_CONFIG.debounceMs)
    },
    [note.id, onUpdate]
  )

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value
      setLocalTitle(newTitle)
      debouncedUpdate({ title: newTitle })
    },
    [debouncedUpdate]
  )

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false)
    if (localTitle !== note.title) {
      onUpdate(note.id, { title: localTitle })
    }
  }, [localTitle, note.id, note.title, onUpdate])

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        setIsEditingTitle(false)
        onUpdate(note.id, { title: localTitle })
      } else if (e.key === 'Escape') {
        setLocalTitle(note.title)
        setIsEditingTitle(false)
      }
    },
    [localTitle, note.id, note.title, onUpdate]
  )

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value.slice(0, NOTES_CONFIG.maxContentLength)
      setLocalContent(newContent)
      debouncedUpdate({ content: newContent })
    },
    [debouncedUpdate]
  )

  const handleToggleCollapse = useCallback(() => {
    onToggleCollapse(note.id)
  }, [note.id, onToggleCollapse])

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    onDelete(note.id)
    setShowDeleteConfirm(false)
  }, [note.id, onDelete])

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false)
  }, [])

  const handleTitleInputClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const handleTitleDoubleClick = useCallback(() => {
    setIsEditingTitle(true)
  }, [])

  return (
    <>
      <CardContainer $isCollapsed={note.isCollapsed}>
        <CardHeader onClick={handleToggleCollapse}>
          {isEditingTitle ? (
            <CardTitleInput
              ref={titleInputRef}
              value={localTitle}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              onClick={handleTitleInputClick}
            />
          ) : (
            <CardTitle onDoubleClick={handleTitleDoubleClick}>
              {note.title}
            </CardTitle>
          )}
          <CardActions>
            <ActionButton
              onClick={handleToggleCollapse}
              title={note.isCollapsed ? 'Expand' : 'Collapse'}
            >
              {note.isCollapsed ? <DownIcon /> : <UpIcon />}
            </ActionButton>
            <ActionButton onClick={handleDeleteClick} title="Delete">
              <CloseIcon />
            </ActionButton>
          </CardActions>
        </CardHeader>

        <CardContent $isCollapsed={note.isCollapsed}>
          <ContentTextarea
            value={localContent}
            onChange={handleContentChange}
            placeholder="Write your note here..."
            maxLength={NOTES_CONFIG.maxContentLength}
          />
          <CardFooter>
            <span>{note.updatedAt}</span>
          </CardFooter>
        </CardContent>
      </CardContainer>

      {showDeleteConfirm && (
        <DeleteConfirmOverlay onClick={handleCancelDelete}>
          <DeleteConfirmDialog onClick={e => e.stopPropagation()}>
            <DeleteConfirmTitle>
              Delete this note? This action cannot be undone.
            </DeleteConfirmTitle>
            <DeleteConfirmButtons>
              <ConfirmButton onClick={handleCancelDelete}>Cancel</ConfirmButton>
              <ConfirmButton $danger onClick={handleConfirmDelete}>
                Delete
              </ConfirmButton>
            </DeleteConfirmButtons>
          </DeleteConfirmDialog>
        </DeleteConfirmOverlay>
      )}
    </>
  )
})

export default NoteCard
