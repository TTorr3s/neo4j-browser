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
import { QueryOrCommand, parse } from '@neo4j-cypher/editor-support'
import { debounce } from 'lodash-es'
import 'monaco-editor/esm/vs/editor/editor.all.js'

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { QueryResult } from 'neo4j-driver-core'
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import styled from 'styled-components'
import { ResizeObserver } from '@juggle/resize-observer'
import { keys } from '../../common/utils/objectUtils'

const shouldCheckForHints = (code: string) =>
  code.trim().length > 0 &&
  !code.trimLeft().startsWith(':') &&
  !code.trimLeft().toUpperCase().startsWith('EXPLAIN') &&
  !code.trimLeft().toUpperCase().startsWith('PROFILE')

const MonacoStyleWrapper = styled.div`
  height: 100%;
  width: 100%;

  .margin .margin-view-overlays {
    margin-left: 10px;
  }

  // hides the "Peek Problem" status bar on the warnings hover widgets
  .hover-row.status-bar {
    display: none !important;
  }
`

const EXPLAIN_QUERY_PREFIX = 'EXPLAIN '
const EXPLAIN_QUERY_PREFIX_LENGTH = EXPLAIN_QUERY_PREFIX.length
const EDITOR_UPDATE_DEBOUNCE_TIME = 300
const UNRUN_CMD_HISTORY_INDEX = -1

/**
 * Provider interface for history navigation with async storage support.
 * This interface is defined inline to maintain neo4j-arc isolation
 * (cannot import from shared/services).
 */
export interface HistoryProvider {
  /** Get the entry at the specified index (0 = most recent). Returns null if not found. */
  getEntry: (index: number) => Promise<string | null>
  /** Get entry synchronously from cache. Returns undefined if not in cache. */
  getEntrySync: (index: number) => string | undefined
  /** Get the total number of entries in storage */
  getTotalCount: () => number
  /** Trigger prefetch of entries around the given index */
  prefetch: (index: number, direction: 'back' | 'forward') => void
  /** Check if an entry is currently in the cache */
  isInCache: (index: number) => boolean
}

export type CypherEditorProps = {
  className?: string
  enableMultiStatementMode?: boolean
  fontLigatures?: boolean
  history?: string[]
  /** Provider for async history storage (IndexedDB). Takes precedence over history prop. */
  historyProvider?: HistoryProvider
  id?: string
  isFullscreen?: boolean
  onChange?: (value: string) => void
  onDisplayHelpKeys?: () => void
  onExecute?: (value: string) => void
  sendCypherQuery?: (query: string) => Promise<QueryResult>
  additionalCommands?: Partial<
    Record<
      monaco.KeyCode,
      { handler: monaco.editor.ICommandHandler; context?: string }
    >
  >
  tabIndex?: number
  useDb?: null | string
  value?: string
}

export interface CypherEditorHandle {
  focus: () => void
  getValue: () => string
  setValue: (value: string) => void
  setPosition: (pos: { lineNumber: number; column: number }) => void
  resize: (fillContainer: boolean) => void
}

export const CypherEditor = forwardRef<CypherEditorHandle, CypherEditorProps>(
  (
    {
      className = '',
      enableMultiStatementMode = false,
      fontLigatures = true,
      history = [],
      historyProvider,
      id = 'main',
      isFullscreen = false,
      onChange = () => undefined,
      onDisplayHelpKeys = () => undefined,
      onExecute,
      sendCypherQuery = () =>
        Promise.resolve({
          result: { summary: { notifications: [] } }
        } as unknown as QueryResult),
      additionalCommands = {},
      tabIndex,
      useDb = null,
      value = ''
    },
    ref
  ) => {
    // Refs for Monaco resources
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
    const containerRef = useRef<HTMLElement | null>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const commandDisposablesRef = useRef<monaco.IDisposable[]>([])
    const editorEventDisposablesRef = useRef<monaco.IDisposable[]>([])
    const isMountedRef = useRef(false)
    const resizeObserverRef = useRef<ResizeObserver | null>(null)
    const debouncedUpdateCodeRef = useRef<ReturnType<typeof debounce> | null>(
      null
    )

    // State for history navigation
    // Note: currentHistoryIndex is used via functional state updates in Monaco action handlers
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState(
      UNRUN_CMD_HISTORY_INDEX
    )
    // Using ref instead of state for draft - it never triggers UI updates
    // and avoids the anti-pattern of nested setState calls
    const draftRef = useRef('')
    const [isEditorFocusable, setIsEditorFocusable] = useState(true)

    // Ref to keep history current for Monaco action closures
    // Monaco actions are created once on mount and capture variables by closure.
    // Without this ref, they would always see the initial empty history array.
    const historyRef = useRef(history)
    useEffect(() => {
      historyRef.current = history
    }, [history])

    // Ref to keep historyProvider current for Monaco action closures
    const historyProviderRef = useRef(historyProvider)
    useEffect(() => {
      historyProviderRef.current = historyProvider
    }, [historyProvider])

    // Reset history index when history changes to prevent stale index references
    // This handles the case when a new query is executed and added to history
    // For historyProvider, we track getTotalCount() changes
    const providerTotalCount = historyProvider?.getTotalCount() ?? 0
    useEffect(() => {
      setCurrentHistoryIndex(UNRUN_CMD_HISTORY_INDEX)
    }, [history.length, providerTotalCount])

    // Helper to get Monaco container ID
    const getMonacoId = useCallback((): string => `monaco-${id}`, [id])

    // Helper to check if editor is multiline
    const isMultiLine = useCallback((): boolean => {
      return (editorRef.current?.getModel()?.getLineCount() || 0) > 1
    }, [])

    // Helper to update gutter character width
    const updateGutterCharWidth = useCallback(
      (dbName: string): void => {
        editorRef.current?.updateOptions({
          lineNumbersMinChars:
            dbName.length && !isMultiLine() ? dbName.length * 1.3 : 2
        })
      },
      [isMultiLine]
    )

    // Helper to position cursor at end of editor content
    const positionCursorAtEnd = useCallback((): void => {
      if (!editorRef.current) return
      const lines = editorRef.current.getModel()?.getLinesContent() || []
      const linesLength = lines.length
      editorRef.current.setPosition({
        lineNumber: linesLength,
        column: lines[linesLength - 1].length + 1
      })
    }, [])

    // Helper to set editor value and position cursor at end
    const setEditorValueAtEnd = useCallback(
      (value: string): void => {
        if (!editorRef.current) return
        editorRef.current.setValue(value)
        editorRef.current.focus()
        positionCursorAtEnd()
      },
      [positionCursorAtEnd]
    )

    // Internal setValue that also positions cursor at end (used by imperative handle)
    const internalSetValue = useCallback(
      (newValue: string): void => {
        setEditorValueAtEnd(newValue)
      },
      [setEditorValueAtEnd]
    )

    // Navigate to previous item in history (older queries)
    const navigateHistoryBack = useCallback((): void => {
      const provider = historyProviderRef.current
      const currentHistory = historyRef.current

      // Determine total count from provider or fallback to array length
      const totalCount = provider
        ? provider.getTotalCount()
        : currentHistory.length
      if (totalCount === 0) {
        return
      }

      setCurrentHistoryIndex(prevIndex => {
        const newIndex = prevIndex + 1
        if (newIndex >= totalCount) return prevIndex

        // Save current editor content as draft before navigating away
        if (prevIndex === UNRUN_CMD_HISTORY_INDEX) {
          draftRef.current = editorRef.current?.getValue() || ''
        }

        // Try to get entry from provider or fallback to array
        if (provider) {
          // Try sync first for instant navigation
          const syncEntry = provider.getEntrySync(newIndex)
          if (syncEntry !== undefined) {
            setEditorValueAtEnd(syncEntry)
          } else {
            // Async fallback - fetch from storage
            provider.getEntry(newIndex).then(entry => {
              if (entry) setEditorValueAtEnd(entry)
            })
          }
          // Prefetch in the direction we're navigating
          provider.prefetch(newIndex, 'back')
        } else if (currentHistory.length > 0) {
          setEditorValueAtEnd(currentHistory[newIndex])
        }

        return newIndex
      })
    }, [setEditorValueAtEnd])

    // Navigate to next item in history (newer queries or back to draft)
    const navigateHistoryForward = useCallback((): void => {
      const provider = historyProviderRef.current
      const currentHistory = historyRef.current

      // Determine total count from provider or fallback to array length
      const totalCount = provider
        ? provider.getTotalCount()
        : currentHistory.length
      if (totalCount === 0) {
        return
      }

      setCurrentHistoryIndex(prevIndex => {
        if (prevIndex === UNRUN_CMD_HISTORY_INDEX) return prevIndex

        const newIndex = prevIndex - 1

        // If returning to draft (index -1), use the saved draft
        if (newIndex === UNRUN_CMD_HISTORY_INDEX) {
          setEditorValueAtEnd(draftRef.current)
          return newIndex
        }

        // Try to get entry from provider or fallback to array
        if (provider) {
          // Try sync first for instant navigation
          const syncEntry = provider.getEntrySync(newIndex)
          if (syncEntry !== undefined) {
            setEditorValueAtEnd(syncEntry)
          } else {
            // Async fallback - fetch from storage
            provider.getEntry(newIndex).then(entry => {
              if (entry) setEditorValueAtEnd(entry)
            })
          }
          // Prefetch in the direction we're navigating
          provider.prefetch(newIndex, 'forward')
        } else if (currentHistory.length > 0) {
          setEditorValueAtEnd(currentHistory[newIndex])
        }

        return newIndex
      })
    }, [setEditorValueAtEnd])

    // Add warnings based on parsed statements
    const addWarnings = useCallback(
      (statements: QueryOrCommand[]): void => {
        const model = editorRef.current?.getModel()
        if (!statements.length || !model) return

        const monacoId = getMonacoId()

        // clearing markers again solves issue with incorrect multi-statement warning when user spam clicks setting on and off
        monaco.editor.setModelMarkers(model, monacoId, [])

        // add multi statement warning if multi setting is off
        if (statements.length > 1 && !enableMultiStatementMode) {
          const secondStatementLine = statements[1].start.line
          monaco.editor.setModelMarkers(model, monacoId, [
            {
              startLineNumber: secondStatementLine,
              startColumn: 1,
              endLineNumber: secondStatementLine,
              endColumn: 1000,
              message:
                'To use multi statement queries, please enable multi statement in the settings panel.',
              severity: monaco.MarkerSeverity.Warning
            }
          ])
        }

        // add a warning for each notification returned by explain query
        statements.forEach(statement => {
          const text = statement.getText()
          if (!shouldCheckForHints(text)) {
            return
          }
          const statementLineNumber = statement.start.line - 1

          sendCypherQuery(EXPLAIN_QUERY_PREFIX + text)
            .then((result: QueryResult) => {
              // Check if component is still mounted before updating markers
              // This prevents memory leaks and errors from accessing disposed resources
              if (!isMountedRef.current) {
                return
              }

              const currentModel = editorRef.current?.getModel()
              if (!currentModel) {
                return
              }

              if (result.summary.notifications.length > 0) {
                monaco.editor.setModelMarkers(currentModel, monacoId, [
                  ...monaco.editor.getModelMarkers({ owner: monacoId }),
                  ...result.summary.notifications.map(
                    ({ description, position, title }) => {
                      const line = 'line' in position ? (position.line ?? 0) : 0
                      const column =
                        'column' in position ? (position.column ?? 0) : 0
                      return {
                        startLineNumber: statementLineNumber + line,
                        startColumn:
                          statement.start.column +
                          (line === 1
                            ? column - EXPLAIN_QUERY_PREFIX_LENGTH
                            : column),
                        endLineNumber: statement.stop.line,
                        endColumn: statement.stop.column + 2,
                        message: title + '\n\n' + description,
                        severity: monaco.MarkerSeverity.Warning
                      }
                    }
                  )
                ])
              }
            })
            .catch(() => {
              /* Parent should ensure connection */
            })
        })
      },
      [enableMultiStatementMode, getMonacoId, sendCypherQuery]
    )

    // Content update handler
    const onContentUpdate = useCallback((): void => {
      const model = editorRef.current?.getModel()
      if (!model) return

      monaco.editor.setModelMarkers(model, getMonacoId(), [])

      updateGutterCharWidth(useDb || '')

      // Use the debounced function if it exists
      if (debouncedUpdateCodeRef.current) {
        debouncedUpdateCodeRef.current()
      }
    }, [getMonacoId, updateGutterCharWidth, useDb])

    // Resize handler
    const resize = useCallback((fillContainer: boolean): void => {
      if (!containerRef.current || !editorRef.current) return
      const contentHeight = editorRef.current.getContentHeight()

      const height = fillContainer
        ? Math.min(window.innerHeight - 20, containerRef.current.scrollHeight)
        : Math.min(276, contentHeight) // Upper bound is 12 lines * 23px line height = 276px

      containerRef.current.style.height = `${height}px`
      editorRef.current.layout({
        height,
        width: containerRef.current.offsetWidth
      })
    }, [])

    // Expose public API via ref
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          editorRef.current?.focus()
        },
        getValue: () => {
          return editorRef.current?.getValue() || ''
        },
        setValue: (newValue: string) => {
          setCurrentHistoryIndex(UNRUN_CMD_HISTORY_INDEX)
          internalSetValue(newValue)
        },
        setPosition: (pos: { lineNumber: number; column: number }) => {
          editorRef.current?.setPosition(pos)
        },
        resize
      }),
      [internalSetValue, resize]
    )

    // Initialize Monaco editor on mount
    useLayoutEffect(() => {
      const monacoId = getMonacoId()
      const container = document.getElementById(monacoId)
      if (!container) return

      containerRef.current = container

      // Create ResizeObserver - wrapped in requestAnimationFrame to avoid
      // the error "ResizeObserver loop limit exceeded"
      resizeObserverRef.current = new ResizeObserver(() => {
        window.requestAnimationFrame(() => {
          editorRef.current?.layout()
        })
      })

      // Create debounced update function
      debouncedUpdateCodeRef.current = debounce(() => {
        const text =
          editorRef.current?.getModel()?.getLinesContent().join('\n') || ''
        onChange?.(text)
        addWarnings(parse(text).referencesListener.queriesAndCommands)
      }, EDITOR_UPDATE_DEBOUNCE_TIME)

      // Create Monaco editor
      editorRef.current = monaco.editor.create(container, {
        autoClosingOvertype: 'always',
        contextmenu: true,
        cursorStyle: 'block',
        fontFamily: '"Fira Code", Monaco, "Courier New", Terminal, monospace',
        fontLigatures,
        fontSize: 17,
        fontWeight: '400',
        hideCursorInOverviewRuler: true,
        language: 'cypher',
        lightbulb: { enabled: monaco.editor.ShowLightbulbIconMode.Off },
        lineHeight: 23,
        lineNumbers: (line: number) =>
          (editorRef.current?.getModel()?.getLineCount() || 0) > 1
            ? line.toString()
            : `${useDb || ''}$`,
        links: false,
        minimap: { enabled: false },
        // Disable features that can cause "Canceled" errors during disposal
        occurrencesHighlight: 'off',
        overviewRulerBorder: false,
        overviewRulerLanes: 0,
        quickSuggestions: true,
        renderLineHighlight: 'none',
        scrollbar: {
          alwaysConsumeMouseWheel: false,
          useShadows: false
        },
        scrollBeyondLastColumn: 0,
        scrollBeyondLastLine: false,
        selectionHighlight: false,
        value,
        wordWrap: 'on',
        wrappingStrategy: 'advanced',
        tabIndex
      })

      const { KeyCode, KeyMod } = monaco
      const editorId = id

      // Clear any previous disposables (safety measure)
      commandDisposablesRef.current.forEach(d => d.dispose())
      commandDisposablesRef.current = []

      // Use addAction instead of addCommand - addAction properly disposes with the editor
      // This fixes a bug where keybindings from disposed editors would remain active globally
      if (onExecute) {
        commandDisposablesRef.current.push(
          editorRef.current.addAction({
            id: `${editorId}-enter`,
            label: 'Execute or New Line',
            keybindings: [KeyCode.Enter],
            precondition: '!suggestWidgetVisible && !findWidgetVisible',
            run: () => {
              if ((editorRef.current?.getModel()?.getLineCount() || 0) > 1) {
                editorRef.current?.trigger('keyboard', 'type', { text: '\n' })
              } else {
                const currentValue = editorRef.current?.getValue() || ''
                const onlyWhitespace = currentValue.trim() === ''
                if (!onlyWhitespace) {
                  onExecute(currentValue)
                  setCurrentHistoryIndex(UNRUN_CMD_HISTORY_INDEX)
                }
              }
            }
          })
        )
      }

      commandDisposablesRef.current.push(
        editorRef.current.addAction({
          id: `${editorId}-up`,
          label: 'Handle Up',
          keybindings: [KeyCode.UpArrow],
          precondition: '!suggestWidgetVisible',
          run: () => {
            if ((editorRef.current?.getModel()?.getLineCount() || 0) > 1) {
              editorRef.current?.trigger('', 'cursorUp', null)
            } else {
              navigateHistoryBack()
            }
          }
        })
      )

      commandDisposablesRef.current.push(
        editorRef.current.addAction({
          id: `${editorId}-down`,
          label: 'Handle Down',
          keybindings: [KeyCode.DownArrow],
          precondition: '!suggestWidgetVisible',
          run: () => {
            if ((editorRef.current?.getModel()?.getLineCount() || 0) > 1) {
              editorRef.current?.trigger('', 'cursorDown', null)
            } else {
              navigateHistoryForward()
            }
          }
        })
      )

      commandDisposablesRef.current.push(
        editorRef.current.addAction({
          id: `${editorId}-shift-enter`,
          label: 'New Line',
          keybindings: [KeyMod.Shift | KeyCode.Enter],
          run: () => {
            editorRef.current?.trigger('keyboard', 'type', { text: '\n' })
          }
        })
      )

      if (onExecute) {
        commandDisposablesRef.current.push(
          editorRef.current.addAction({
            id: `${editorId}-ctrl-enter`,
            label: 'Execute',
            keybindings: [KeyMod.CtrlCmd | KeyCode.Enter],
            run: () => {
              const currentValue = editorRef.current?.getValue() || ''
              const onlyWhitespace = currentValue.trim() === ''
              if (!onlyWhitespace) {
                onExecute(currentValue)
                setCurrentHistoryIndex(UNRUN_CMD_HISTORY_INDEX)
              }
            }
          })
        )
      }

      commandDisposablesRef.current.push(
        editorRef.current.addAction({
          id: `${editorId}-ctrl-up`,
          label: 'History Previous',
          keybindings: [KeyMod.CtrlCmd | KeyCode.UpArrow],
          run: () => navigateHistoryBack()
        })
      )

      commandDisposablesRef.current.push(
        editorRef.current.addAction({
          id: `${editorId}-ctrl-down`,
          label: 'History Next',
          keybindings: [KeyMod.CtrlCmd | KeyCode.DownArrow],
          run: () => navigateHistoryForward()
        })
      )

      commandDisposablesRef.current.push(
        editorRef.current.addAction({
          id: `${editorId}-ctrl-period`,
          label: 'Display Help Keys',
          keybindings: [KeyMod.CtrlCmd | KeyCode.Period],
          run: () => onDisplayHelpKeys()
        })
      )

      commandDisposablesRef.current.push(
        editorRef.current.addAction({
          id: `${editorId}-escape`,
          label: 'Escape',
          keybindings: [KeyCode.Escape],
          precondition: '!suggestWidgetVisible && !findWidgetVisible',
          run: () => {
            wrapperRef.current?.focus()
          }
        })
      )

      // Register additional commands
      keys(additionalCommands).forEach(key => {
        const command = additionalCommands[key]
        if (!command || !editorRef.current) {
          return
        }
        commandDisposablesRef.current.push(
          editorRef.current.addAction({
            id: `${editorId}-additional-${key}`,
            label: `Additional Command ${key}`,
            keybindings: [key],
            precondition: command.context,
            run: () => {
              if (editorRef.current) {
                command.handler(editorRef.current)
              }
            }
          })
        )
      })

      // Initial content update
      const model = editorRef.current.getModel()
      if (model) {
        monaco.editor.setModelMarkers(model, monacoId, [])
        const dbName = useDb || ''
        editorRef.current.updateOptions({
          lineNumbersMinChars:
            dbName.length &&
            !((editorRef.current.getModel()?.getLineCount() || 0) > 1)
              ? dbName.length * 1.3
              : 2
        })
        debouncedUpdateCodeRef.current?.()
      }

      // Store event listener disposables for cleanup
      editorEventDisposablesRef.current.push(
        editorRef.current.onDidChangeModelContent(() => {
          const currentModel = editorRef.current?.getModel()
          if (!currentModel) return

          monaco.editor.setModelMarkers(currentModel, monacoId, [])

          const dbName = useDb || ''
          editorRef.current?.updateOptions({
            lineNumbersMinChars:
              dbName.length &&
              !((editorRef.current?.getModel()?.getLineCount() || 0) > 1)
                ? dbName.length * 1.3
                : 2
          })

          debouncedUpdateCodeRef.current?.()
        })
      )

      editorEventDisposablesRef.current.push(
        editorRef.current.onDidContentSizeChange(() => {
          if (!containerRef.current || !editorRef.current) return
          const contentHeight = editorRef.current.getContentHeight()

          const height = isFullscreen
            ? Math.min(
                window.innerHeight - 20,
                containerRef.current.scrollHeight
              )
            : Math.min(276, contentHeight)

          containerRef.current.style.height = `${height}px`
          editorRef.current.layout({
            height,
            width: containerRef.current.offsetWidth
          })
        })
      )

      resizeObserverRef.current.observe(container)
      isMountedRef.current = true

      // Cleanup
      return () => {
        isMountedRef.current = false

        // Cancel debounced operations FIRST to prevent callbacks during disposal
        debouncedUpdateCodeRef.current?.cancel()

        // Disconnect resize observer before editor disposal
        resizeObserverRef.current?.disconnect()

        // Dispose all command/action bindings - this is critical!
        // Without this, the keybindings remain active globally even after editor disposal
        commandDisposablesRef.current.forEach(d => {
          try {
            d.dispose()
          } catch {
            // Ignore disposal errors
          }
        })
        commandDisposablesRef.current = []

        // Dispose editor event listeners to prevent memory leaks
        editorEventDisposablesRef.current.forEach(d => {
          try {
            d.dispose()
          } catch {
            // Ignore disposal errors
          }
        })
        editorEventDisposablesRef.current = []

        // Dispose the editor last - wrap in try-catch to handle "Canceled" errors
        // that can occur when Monaco's internal Delayers are interrupted
        try {
          editorRef.current?.dispose()
        } catch {
          // Monaco may throw "Canceled" errors during disposal when internal
          // async operations (like WordHighlighter) are interrupted - this is safe to ignore
        }
        editorRef.current = null
      }
      // We intentionally only run this on mount/unmount
      // The callbacks are inlined to capture current values
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Update fontLigatures when prop changes
    useEffect(() => {
      editorRef.current?.updateOptions({ fontLigatures })
    }, [fontLigatures])

    // Redraw line numbers when useDb changes
    useEffect(() => {
      if (!editorRef.current) return
      const cursorPosition = editorRef.current.getPosition() as monaco.IPosition
      editorRef.current.setValue(editorRef.current.getValue() || '')
      if (cursorPosition) {
        editorRef.current.setPosition(cursorPosition)
      }
    }, [useDb])

    // Re-check warnings when enableMultiStatementMode changes
    useEffect(() => {
      onContentUpdate()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enableMultiStatementMode])

    // Update tabIndex when isEditorFocusable or tabIndex changes
    useEffect(() => {
      editorRef.current?.updateOptions({
        tabIndex: isEditorFocusable ? tabIndex : -1
      })
    }, [isEditorFocusable, tabIndex])

    return (
      <MonacoStyleWrapper
        id={getMonacoId()}
        className={className}
        ref={wrapperRef}
        tabIndex={-1}
        onFocus={() => {
          setIsEditorFocusable(false)
        }}
        onBlur={() => {
          setIsEditorFocusable(true)
        }}
      />
    )
  }
)

CypherEditor.displayName = 'CypherEditor'
