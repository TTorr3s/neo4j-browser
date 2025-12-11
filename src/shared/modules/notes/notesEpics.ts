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

import { AnyAction } from 'redux'
import { combineEpics, Epic } from 'redux-observable'
import { EMPTY, from, of } from 'rxjs'
import { filter, switchMap, catchError, mergeMap } from 'rxjs/operators'

import {
  INITIALIZE_NOTES,
  ADD_NOTE,
  UPDATE_NOTE,
  DELETE_NOTE,
  TOGGLE_COLLAPSE,
  setNotes,
  setError,
  setLoading,
  getNotes,
  getNoteById
} from './notesDuck'
import { NotesStorageService, NOTES_CONFIG } from 'shared/services/notesStorage'
import { GlobalState } from 'shared/globalState'

/**
 * Epic that initializes the notes storage service on app startup.
 *
 * - Initializes NotesStorageService (IndexedDB)
 * - Populates Redux state with notes from storage
 */
export const initializeNotesEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    filter(action => action.type === INITIALIZE_NOTES),
    switchMap(() => {
      const service = NotesStorageService.getInstance()

      return from(service.initialize()).pipe(
        switchMap(() => from(service.getAllNotes())),
        mergeMap(notes => [setNotes(notes), setLoading(false)]),
        catchError(error => {
          console.error('[notesEpics] Failed to initialize notes:', error)
          return of(
            setError(
              error instanceof Error
                ? error.message
                : 'Failed to initialize notes'
            ),
            setLoading(false)
          )
        })
      )
    })
  )

/**
 * Epic that handles adding a new note asynchronously.
 *
 * - Checks if max notes limit (50) has been reached
 * - Persists note to storage via NotesStorageService
 * - Updates Redux state with the new note
 */
export const addNoteEpic: Epic<AnyAction, AnyAction, GlobalState> = (
  action$,
  state$
) =>
  action$.pipe(
    filter(action => action.type === ADD_NOTE),
    switchMap(action => {
      const { title, content } = action
      const currentNotes = getNotes(state$.value)

      // Check if max notes limit has been reached
      if (currentNotes.length >= NOTES_CONFIG.maxNotes) {
        return of(
          setError(`Maximum number of notes (${NOTES_CONFIG.maxNotes}) reached`)
        )
      }

      const service = NotesStorageService.getInstance()

      return from(service.addNote(title, content)).pipe(
        switchMap(() => from(service.getAllNotes())),
        mergeMap(notes => [setNotes(notes), setError(null)]),
        catchError(error => {
          console.error('[notesEpics] Failed to add note:', error)
          return of(
            setError(
              error instanceof Error ? error.message : 'Failed to add note'
            )
          )
        })
      )
    })
  )

/**
 * Epic that handles updating an existing note.
 *
 * - Persists updates to storage via NotesStorageService
 * - Updates Redux state with the updated notes list
 */
export const updateNoteEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    filter(action => action.type === UPDATE_NOTE),
    switchMap(action => {
      const { id, updates } = action
      const service = NotesStorageService.getInstance()

      return from(service.updateNote(id, updates)).pipe(
        switchMap(() => from(service.getAllNotes())),
        mergeMap(notes => [setNotes(notes), setError(null)]),
        catchError(error => {
          console.error('[notesEpics] Failed to update note:', error)
          return of(
            setError(
              error instanceof Error ? error.message : 'Failed to update note'
            )
          )
        })
      )
    })
  )

/**
 * Epic that handles deleting a note.
 *
 * - Removes note from storage via NotesStorageService
 * - Updates Redux state with the remaining notes
 */
export const deleteNoteEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    filter(action => action.type === DELETE_NOTE),
    switchMap(action => {
      const { id } = action
      const service = NotesStorageService.getInstance()

      return from(service.deleteNote(id)).pipe(
        switchMap(() => from(service.getAllNotes())),
        mergeMap(notes => [setNotes(notes), setError(null)]),
        catchError(error => {
          console.error('[notesEpics] Failed to delete note:', error)
          return of(
            setError(
              error instanceof Error ? error.message : 'Failed to delete note'
            )
          )
        })
      )
    })
  )

/**
 * Epic that handles toggling a note's collapsed state.
 *
 * - Gets the current note from state
 * - Toggles the isCollapsed property
 * - Persists the update to storage
 */
export const toggleCollapseEpic: Epic<AnyAction, AnyAction, GlobalState> = (
  action$,
  state$
) =>
  action$.pipe(
    filter(action => action.type === TOGGLE_COLLAPSE),
    switchMap(action => {
      const { id } = action
      const currentNote = getNoteById(state$.value, id)

      if (!currentNote) {
        console.error('[notesEpics] Note not found for toggle collapse:', id)
        return EMPTY
      }

      const service = NotesStorageService.getInstance()

      return from(
        service.updateNote(id, { isCollapsed: !currentNote.isCollapsed })
      ).pipe(
        switchMap(() => from(service.getAllNotes())),
        mergeMap(notes => [setNotes(notes), setError(null)]),
        catchError(error => {
          console.error('[notesEpics] Failed to toggle collapse:', error)
          return of(
            setError(
              error instanceof Error
                ? error.message
                : 'Failed to toggle collapse'
            )
          )
        })
      )
    })
  )

export const notesEpics = combineEpics(
  initializeNotesEpic,
  addNoteEpic,
  updateNoteEpic,
  deleteNoteEpic,
  toggleCollapseEpic
)

export default notesEpics
