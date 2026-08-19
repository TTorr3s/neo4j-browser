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
import { removeItem } from 'services/localstorage'

const LEGACY_FRAME_EDITOR_HEIGHT_KEY = 'frameEditorHeight'

/**
 * Frame editor height used to be a single number persisted globally and applied
 * to every frame on mount, so one drag pinned every future frame to that size.
 * Editors now size themselves to their content, and a hand-set height lives only
 * on the editor it was set on. There is nothing to carry forward — drop the key.
 */
export function clearLegacyFrameEditorHeight(): void {
  removeItem(LEGACY_FRAME_EDITOR_HEIGHT_KEY)
}
