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
import { createContext, useContext } from 'react'
import { Bus } from 'suber'

/**
 * Context for the Suber bus instance.
 * This provides a hook-based alternative to the withBus HOC from react-suber.
 *
 * Usage:
 *   const bus = useBus()
 *   bus.send(CHANNEL, data)
 *   bus.self(CHANNEL, data, callback)
 */
export const BusContext = createContext<Bus | null>(null)

/**
 * Hook to access the Suber bus instance.
 * Must be used within a BusContextProvider.
 *
 * @returns The Bus instance
 * @throws Error if used outside of BusContextProvider
 */
export function useBus(): Bus {
  const bus = useContext(BusContext)
  if (!bus) {
    throw new Error(
      'useBus must be used within a BusContextProvider. ' +
        'Make sure your component is wrapped in a BusContextProvider.'
    )
  }
  return bus
}

export default useBus
