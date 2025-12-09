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
import { GraphStyleModel, Selector } from './GraphStyle'

describe('grass', () => {
  it('can generate a default style', () => {
    // Given
    const grass = new GraphStyleModel()

    // When
    const styleStr = grass.toString()

    // Then
    expect(styleStr).toEqual(
      `node {
  diameter: 50px;
  color: #7aa2f7;
  border-color: #3d59a1;
  border-width: 2px;
  text-color-internal: #1a1b26;
  font-size: 10px;
}

relationship {
  color: #7dcfff;
  shaft-width: 1px;
  font-size: 8px;
  padding: 3px;
  text-color-external: #c0caf5;
  text-color-internal: #1a1b26;
  caption: '<type>';
}

`
    )
  })
  it('can generate a style for a node with a simple label', () => {
    // Given
    const grass = new GraphStyleModel()
    const node = {
      labels: ['foo']
    }

    // When
    grass.forNode(node)
    const styleStr = grass.toString()

    // Then
    expect(styleStr).toEqual(`node {
  diameter: 50px;
  color: #7aa2f7;
  border-color: #3d59a1;
  border-width: 2px;
  text-color-internal: #1a1b26;
  font-size: 10px;
}

relationship {
  color: #7dcfff;
  shaft-width: 1px;
  font-size: 8px;
  padding: 3px;
  text-color-external: #c0caf5;
  text-color-internal: #1a1b26;
  caption: '<type>';
}

node.foo {
  color: #7aa2f7;
  border-color: #3d59a1;
  text-color-internal: #1a1b26;
  defaultCaption: <id>;
}

`)
  })
  it('can generate a style for a node with a label with a dot', () => {
    // Given
    const grass = new GraphStyleModel()
    const node = {
      labels: ['foo.bar']
    }

    // When
    grass.forNode(node)
    const styleStr = grass.toString()

    // Then
    expect(styleStr).toEqual(`node {
  diameter: 50px;
  color: #7aa2f7;
  border-color: #3d59a1;
  border-width: 2px;
  text-color-internal: #1a1b26;
  font-size: 10px;
}

relationship {
  color: #7dcfff;
  shaft-width: 1px;
  font-size: 8px;
  padding: 3px;
  text-color-external: #c0caf5;
  text-color-internal: #1a1b26;
  caption: '<type>';
}

node.foo\\.bar {
  color: #7aa2f7;
  border-color: #3d59a1;
  text-color-internal: #1a1b26;
  defaultCaption: <id>;
}

`)
  })
  it('can generate a style for a relationship with a type with a dot', () => {
    // Given
    const grass = new GraphStyleModel()

    // When
    grass.loadRules()
    const selector = new Selector('relationship', ['REL.TYPE'])
    grass.changeForSelector(selector, {
      caption: 'yo'
    })
    // grass.forRelationship(rel)
    const styleStr = grass.toString()

    // Then
    expect(styleStr).toEqual(`node {
  diameter: 50px;
  color: #7aa2f7;
  border-color: #3d59a1;
  border-width: 2px;
  text-color-internal: #1a1b26;
  font-size: 10px;
}

relationship {
  color: #7dcfff;
  shaft-width: 1px;
  font-size: 8px;
  padding: 3px;
  text-color-external: #c0caf5;
  text-color-internal: #1a1b26;
  caption: '<type>';
}

relationship.REL\\.TYPE {
  caption: 'yo';
}

`)
  })
})
