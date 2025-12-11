import { useState, useRef, useCallback, ReactElement } from 'react'

interface Step {
  focusFn?: () => void
  focusOnRef?: boolean
}

interface RenderProps {
  getInputPropsForIndex: (
    i: number,
    props?: Record<string, unknown>
  ) => Record<string, unknown>
  getSubmitProps: () => { onClick: (() => void) | undefined }
  setRefForIndex: (i: number, ref: HTMLElement | null) => void
}

interface InputEnterSteppingProps {
  submitAction?: () => void
  render: (props: RenderProps) => ReactElement
  /** Number of steps - informational prop for parent components */
  steps?: number
}

function InputEnterStepping({
  submitAction,
  render
}: InputEnterSteppingProps): ReactElement {
  const [initial, setInitial] = useState(true)
  const stepsRef = useRef<Step[]>([])

  const getSubmitProps = useCallback(() => {
    return {
      onClick: submitAction
    }
  }, [submitAction])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent, i: number) => {
      const ENTER_KEYCODE = 13
      if (e.keyCode === ENTER_KEYCODE) {
        e.preventDefault()
        const steps = stepsRef.current
        if (i !== steps.length - 1) {
          steps[i + 1]?.focusFn?.()
        } else {
          submitAction?.()
        }
      }
    },
    [submitAction]
  )

  const getInputPropsForIndex = useCallback(
    (i: number, props: Record<string, unknown> = {}) => {
      const steps = stepsRef.current
      steps[i] = steps[i] || {}
      const { initialFocus, onKeyDown: propsOnKeyDown, ...cleanProps } = props
      const out: Record<string, unknown> = {
        ...cleanProps,
        onKeyDown: (e: React.KeyboardEvent) => {
          onKeyDown(e, i)
          if (typeof propsOnKeyDown === 'function') {
            propsOnKeyDown(e)
          }
        }
      }
      if (initialFocus) {
        steps[i].focusOnRef = true
      }
      return out
    },
    [onKeyDown]
  )

  const setRefForIndex = useCallback(
    (i: number, ref: HTMLElement | null) => {
      if (!ref) return

      const steps = stepsRef.current
      steps[i] = steps[i] || {}
      steps[i].focusFn = () => ref.focus()

      if (initial && steps[i].focusOnRef) {
        delete steps[i].focusOnRef
        setInitial(false)
        setTimeout(() => steps[i].focusFn?.(), 0)
      }
    },
    [initial]
  )

  return render({
    getInputPropsForIndex,
    getSubmitProps,
    setRefForIndex
  })
}

export default InputEnterStepping
