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
import { useEffect, useState } from 'react'

import useDetectColorScheme from './useDetectColorScheme'
import {
  LIGHT_THEME,
  ResolvedThemeId,
  resolveTheme
} from 'shared/modules/settings/settingsDuck'

export default function useAutoTheme(
  defaultTheme: ResolvedThemeId = LIGHT_THEME
) {
  const detectedScheme = useDetectColorScheme()
  const [autoTheme, setAutoTheme] = useState<ResolvedThemeId>(
    detectedScheme ? resolveTheme('auto', detectedScheme) : defaultTheme
  )
  const [overriddenTheme, overrideAutoTheme] = useState<ResolvedThemeId | null>(
    null
  )

  useEffect(() => {
    if (overriddenTheme) {
      setAutoTheme(overriddenTheme)
      return
    }
    if (!detectedScheme && !overriddenTheme) {
      setAutoTheme(defaultTheme)
      return
    }
    setAutoTheme(resolveTheme('auto', detectedScheme))
  }, [defaultTheme, detectedScheme, overriddenTheme])
  return [autoTheme, overrideAutoTheme]
}
