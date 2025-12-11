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
import React, { useState, useCallback, ChangeEvent } from 'react'

import RevealablePasswordInput from './revealable-password-input'
import {
  StyledChangePasswordForm,
  StyledConnectionFormEntry,
  StyledConnectionLabel,
  StyledConnectionTextInput
} from './styled'
import { getRandomWords } from './utils'
import InputEnterStepping from 'browser-components/InputEnterStepping/InputEnterStepping'
import { FormButton } from 'browser-components/buttons'

interface ChangePasswordCallbackResult {
  newPassword?: string
  error?: { code: string; message: string }
  success?: boolean
}

interface ChangePasswordFormProps {
  showExistingPasswordInput?: boolean
  isLoading?: boolean
  onChange: () => void
  onChangePasswordClick: (result: ChangePasswordCallbackResult) => void
  tryConnect?: (
    password: string,
    callback: (res: { success: boolean }) => void
  ) => void
  children?: React.ReactNode
}

interface FormState {
  password: string
  newPassword: string
  newPassword2: string
  revealNewPassword: boolean
}

const ChangePasswordForm = ({
  showExistingPasswordInput,
  isLoading,
  onChange,
  onChangePasswordClick,
  tryConnect
}: ChangePasswordFormProps) => {
  const [formState, setFormState] = useState<FormState>({
    password: '',
    newPassword: '',
    newPassword2: '',
    revealNewPassword: false
  })

  const onExistingPasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const password = event.target.value
      setFormState(prev => ({ ...prev, password }))
      onChange()
    },
    [onChange]
  )

  const onNewPasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const newPassword = event.target.value
      setFormState(prev => ({ ...prev, newPassword }))
      onChange()
    },
    [onChange]
  )

  const onNewPasswordChange2 = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const newPassword2 = event.target.value
      setFormState(prev => ({ ...prev, newPassword2 }))
      onChange()
    },
    [onChange]
  )

  const onSuggestPassword = useCallback(() => {
    const suggestedPassword = `${getRandomWords(5).join('-')}-${Math.floor(
      Math.random() * 10000
    )}`
    setFormState(prev => ({
      ...prev,
      newPassword: suggestedPassword,
      newPassword2: suggestedPassword,
      revealNewPassword: true
    }))
  }, [])

  const togglePasswordRevealed = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      revealNewPassword: !prev.revealNewPassword
    }))
  }, [])

  const validateSame = useCallback(() => {
    if (
      formState.newPassword &&
      formState.newPassword !== '' &&
      formState.newPassword !== formState.newPassword2
    ) {
      return onChangePasswordClick({
        error: {
          code: 'Mismatch',
          message: 'The two entered passwords must be the same.'
        }
      })
    }

    if (showExistingPasswordInput && tryConnect) {
      tryConnect(formState.password, (res: { success: boolean }) => {
        if (res.success) {
          onChangePasswordClick({
            newPassword: formState.newPassword
          })
        } else {
          onChangePasswordClick(res)
        }
      })
    } else {
      onChangePasswordClick({
        newPassword: formState.newPassword
      })
    }
  }, [
    formState.newPassword,
    formState.newPassword2,
    formState.password,
    showExistingPasswordInput,
    tryConnect,
    onChangePasswordClick
  ])

  const indexStart = showExistingPasswordInput ? 1 : 0
  const classNames = []
  if (isLoading) {
    classNames.push('isLoading')
  }

  return (
    <StyledChangePasswordForm className={classNames.join(' ')}>
      <InputEnterStepping
        steps={showExistingPasswordInput ? 3 : 2}
        submitAction={validateSame}
        render={({
          getSubmitProps,
          getInputPropsForIndex,
          setRefForIndex
        }: {
          getSubmitProps: () => Record<string, unknown>
          getInputPropsForIndex: (
            index: number,
            props: Record<string, unknown>
          ) => Record<string, unknown>
          setRefForIndex: (index: number, ref: HTMLInputElement | null) => void
        }) => {
          return (
            <>
              {showExistingPasswordInput && (
                <StyledConnectionFormEntry>
                  <StyledConnectionLabel>
                    Existing password
                  </StyledConnectionLabel>
                  <StyledConnectionTextInput
                    {...getInputPropsForIndex(0, {
                      initialFocus: true,
                      type: 'password',
                      onChange: onExistingPasswordChange,
                      value: formState.password,
                      ref: (ref: HTMLInputElement | null) =>
                        setRefForIndex(0, ref),
                      disabled: isLoading,
                      autoComplete: 'off'
                    })}
                  />
                </StyledConnectionFormEntry>
              )}
              <StyledConnectionFormEntry>
                <StyledConnectionLabel>New password</StyledConnectionLabel>
                <RevealablePasswordInput
                  {...getInputPropsForIndex(indexStart, {
                    initialFocus: !showExistingPasswordInput,
                    'data-testid': 'newPassword',
                    type: 'password',
                    onChange: onNewPasswordChange,
                    value: formState.newPassword,
                    setRef: (ref: HTMLInputElement | null) =>
                      setRefForIndex(indexStart, ref),
                    disabled: isLoading,
                    isRevealed: formState.revealNewPassword,
                    toggleReveal: togglePasswordRevealed,
                    autoComplete: 'new-password'
                  })}
                />
                &nbsp;OR&nbsp;&nbsp;
                <FormButton tabIndex={-1} onClick={onSuggestPassword}>
                  Generate
                </FormButton>
              </StyledConnectionFormEntry>
              <StyledConnectionFormEntry>
                <StyledConnectionLabel>
                  Repeat new password
                </StyledConnectionLabel>
                <RevealablePasswordInput
                  {...getInputPropsForIndex(indexStart + 1, {
                    'data-testid': 'newPasswordConfirmation',
                    type: 'password',
                    onChange: onNewPasswordChange2,
                    value: formState.newPassword2,
                    setRef: (ref: HTMLInputElement | null) =>
                      setRefForIndex(indexStart + 1, ref),
                    disabled: isLoading,
                    isRevealed: formState.revealNewPassword,
                    toggleReveal: togglePasswordRevealed,
                    autoComplete: 'new-password'
                  })}
                />
              </StyledConnectionFormEntry>
              {isLoading ? (
                'Please wait...'
              ) : (
                <FormButton
                  data-testid="changePassword"
                  label="Change password"
                  disabled={isLoading}
                  {...getSubmitProps()}
                />
              )}
            </>
          )
        }}
      />
    </StyledChangePasswordForm>
  )
}

export default ChangePasswordForm
