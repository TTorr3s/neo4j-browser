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

import useAutoTheme from './useAutoTheme'
import {
  AUTO_THEME,
  LIGHT_THEME,
  ResolvedThemeId,
  ThemeId,
  isThemeId,
  resolveTheme
} from 'shared/modules/settings/settingsDuck'

export default function useDerivedTheme(
  selectedTheme: ThemeId,
  defaultTheme: ResolvedThemeId = LIGHT_THEME
) {
  const [derivedTheme, overrideAutoTheme]: any[] = useAutoTheme(defaultTheme)
  const [environmentTheme, setEnvironmentTheme] = useState<string | null>(null)

  useEffect(() => {
    if (selectedTheme === AUTO_THEME || !isThemeId(selectedTheme)) {
      overrideAutoTheme(
        environmentTheme ? resolveTheme(AUTO_THEME, environmentTheme) : null
      )
      return
    }

    overrideAutoTheme(resolveTheme(selectedTheme))
  }, [selectedTheme, environmentTheme])
  return [derivedTheme as ResolvedThemeId, setEnvironmentTheme] as const
}
