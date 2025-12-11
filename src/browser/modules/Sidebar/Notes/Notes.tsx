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
import React, { useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  Drawer,
  DrawerBody,
  DrawerHeader
} from 'browser-components/drawer/drawer-styled'
import { Note, NOTES_CONFIG } from 'shared/services/notesStorage'
import {
  getNotes,
  getNoteCount,
  getIsNotesLoading,
  addNote,
  updateNote,
  deleteNote,
  toggleCollapse
} from 'shared/modules/notes/notesDuck'

import NoteCard from './NoteCard'
import {
  NotesListContainer,
  NewNoteButton,
  EmptyStateMessage
} from './notes-styled'

const Notes = (): JSX.Element => {
  const dispatch = useDispatch()
  const notes = useSelector(getNotes)
  const noteCount = useSelector(getNoteCount)
  const isLoading = useSelector(getIsNotesLoading)

  const handleAddNote = useCallback(() => {
    const newTitle = `Note #${noteCount + 1}`
    dispatch(addNote(newTitle, ''))
  }, [dispatch, noteCount])

  const handleUpdate = useCallback(
    (id: number, updates: Partial<Note>) => {
      dispatch(updateNote(id, updates))
    },
    [dispatch]
  )

  const handleDelete = useCallback(
    (id: number) => {
      dispatch(deleteNote(id))
    },
    [dispatch]
  )

  const handleToggleCollapse = useCallback(
    (id: number) => {
      dispatch(toggleCollapse(id))
    },
    [dispatch]
  )

  const isMaxNotesReached = noteCount >= NOTES_CONFIG.maxNotes

  return (
    <Drawer id="db-notes">
      <DrawerHeader>Notes</DrawerHeader>
      <DrawerBody>
        <NewNoteButton
          onClick={handleAddNote}
          disabled={isMaxNotesReached || isLoading}
          title={
            isMaxNotesReached
              ? `Maximum ${NOTES_CONFIG.maxNotes} notes reached`
              : 'Create new note'
          }
        >
          {isLoading ? 'Loading...' : 'New Note'}
        </NewNoteButton>

        {notes.length === 0 && !isLoading ? (
          <EmptyStateMessage>
            No notes yet. Click &quot;New Note&quot; to create one.
          </EmptyStateMessage>
        ) : (
          <NotesListContainer>
            {notes.map((note: Note) => (
              <NoteCard
                key={note.id}
                note={note}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onToggleCollapse={handleToggleCollapse}
              />
            ))}
          </NotesListContainer>
        )}
      </DrawerBody>
    </Drawer>
  )
}

export default Notes
