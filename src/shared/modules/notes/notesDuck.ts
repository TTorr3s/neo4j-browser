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

import { GlobalState } from 'shared/globalState'
import { Note, NotesState } from 'shared/services/notesStorage'

// Module name
export const NAME = 'notes'

// Action types
export const INITIALIZE_NOTES = 'notes/INITIALIZE'
export const SET_NOTES = 'notes/SET_NOTES'
export const ADD_NOTE = 'notes/ADD'
export const UPDATE_NOTE = 'notes/UPDATE'
export const DELETE_NOTE = 'notes/DELETE'
export const TOGGLE_COLLAPSE = 'notes/TOGGLE_COLLAPSE'
export const SET_LOADING = 'notes/SET_LOADING'
export const SET_ERROR = 'notes/SET_ERROR'

// Initial state
export const initialState: NotesState = {
  items: [],
  isLoading: false,
  error: null
}

// Selectors
export const getNotes = (state: GlobalState): Note[] => state[NAME]?.items ?? []

export const getNoteCount = (state: GlobalState): number =>
  state[NAME]?.items?.length ?? 0

export const getIsNotesLoading = (state: GlobalState): boolean =>
  state[NAME]?.isLoading ?? false

export const getNotesError = (state: GlobalState): string | null =>
  state[NAME]?.error ?? null

export const getNoteById = (state: GlobalState, id: number): Note | undefined =>
  state[NAME]?.items?.find(note => note.id === id)

// Action interfaces
interface InitializeNotesAction {
  type: typeof INITIALIZE_NOTES
}

interface SetNotesAction {
  type: typeof SET_NOTES
  notes: Note[]
}

interface AddNoteAction {
  type: typeof ADD_NOTE
  title: string
  content: string
}

interface UpdateNoteAction {
  type: typeof UPDATE_NOTE
  id: number
  updates: Partial<Omit<Note, 'id' | 'createdAt'>>
}

interface DeleteNoteAction {
  type: typeof DELETE_NOTE
  id: number
}

interface ToggleCollapseAction {
  type: typeof TOGGLE_COLLAPSE
  id: number
}

interface SetLoadingAction {
  type: typeof SET_LOADING
  isLoading: boolean
}

interface SetErrorAction {
  type: typeof SET_ERROR
  error: string | null
}

type NotesAction =
  | InitializeNotesAction
  | SetNotesAction
  | AddNoteAction
  | UpdateNoteAction
  | DeleteNoteAction
  | ToggleCollapseAction
  | SetLoadingAction
  | SetErrorAction

// Reducer
export default function notesReducer(
  state: NotesState = initialState,
  action: NotesAction
): NotesState {
  switch (action.type) {
    case SET_NOTES:
      return {
        ...state,
        items: (action as SetNotesAction).notes
      }

    case SET_LOADING:
      return {
        ...state,
        isLoading: (action as SetLoadingAction).isLoading
      }

    case SET_ERROR:
      return {
        ...state,
        error: (action as SetErrorAction).error,
        isLoading: false
      }

    // These actions are handled by epics, not the reducer
    case INITIALIZE_NOTES:
    case ADD_NOTE:
    case UPDATE_NOTE:
    case DELETE_NOTE:
    case TOGGLE_COLLAPSE:
      return state

    default:
      return state
  }
}

// Action creators
export const initializeNotes = (): InitializeNotesAction => ({
  type: INITIALIZE_NOTES
})

export const setNotes = (notes: Note[]): SetNotesAction => ({
  type: SET_NOTES,
  notes
})

export const addNote = (title: string, content: string): AddNoteAction => ({
  type: ADD_NOTE,
  title,
  content
})

export const updateNote = (
  id: number,
  updates: Partial<Omit<Note, 'id' | 'createdAt'>>
): UpdateNoteAction => ({
  type: UPDATE_NOTE,
  id,
  updates
})

export const deleteNote = (id: number): DeleteNoteAction => ({
  type: DELETE_NOTE,
  id
})

export const toggleCollapse = (id: number): ToggleCollapseAction => ({
  type: TOGGLE_COLLAPSE,
  id
})

export const setLoading = (isLoading: boolean): SetLoadingAction => ({
  type: SET_LOADING,
  isLoading
})

export const setError = (error: string | null): SetErrorAction => ({
  type: SET_ERROR,
  error
})
