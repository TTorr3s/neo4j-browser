/*
 * Copyright (c) 2002-2021 "Neo4j,"
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
const helpers = require('./webpack-helpers')
const path = require('path')
const createStyledComponentsTransformer =
  require('typescript-plugin-styled-components').default
const styledComponentsTransformer = createStyledComponentsTransformer()

const tsLoaderOptions = {
  transpileOnly: true,
  getCustomTransformers: () => ({
    before: [...(helpers.isProduction ? [] : [styledComponentsTransformer])]
  })
}

module.exports = [
  // Fix for ESM packages (like react-dnd 16+) that require jsx-runtime without extension
  {
    test: /\.m?js$/,
    resolve: {
      fullySpecified: false
    }
  },
  {
    test: /\.(ts|tsx)?$/,
    use: {
      loader: 'ts-loader',
      options: tsLoaderOptions
    },
    include: [path.resolve('src')],
    exclude: /node_modules/
  },
  {
    test: /\.(js|jsx)$/,
    include: [
      path.resolve('src'),
      path.resolve('node_modules/@neo4j/browser-lambda-parser'),
      path.resolve('node_modules/@neo4j-devtools/word-color')
    ],
    use: 'babel-loader',
    resolve: {
      fullySpecified: false
    }
  },
  {
    test: /\.(png|gif|jpg|svg)$/,
    include: [path.resolve(helpers.browserPath, 'modules')],
    type: 'asset',
    parser: {
      dataUrlCondition: {
        maxSize: 20480
      }
    },
    generator: {
      filename: 'assets/[name]-[contenthash][ext]'
    }
  },
  {
    test: /\.woff$/,
    type: 'asset/resource',
    generator: {
      filename: 'assets/fonts/[name][ext]'
    }
  },
  {
    test: /\.woff2$/,
    type: 'asset/resource',
    generator: {
      filename: 'assets/fonts/[name][ext]'
    }
  },
  {
    test: /\.[ot]tf$/,
    type: 'asset/resource',
    generator: {
      filename: 'assets/fonts/[name][ext]'
    }
  },
  {
    test: /\.eot$/,
    type: 'asset/resource',
    generator: {
      filename: 'assets/fonts/[name][ext]'
    }
  },
  {
    test: /\.less$/, // Carousel
    include: path.resolve(helpers.browserPath, 'modules/Carousel'),
    use: [
      'style-loader',
      {
        loader: 'css-loader',
        options: {
          modules: {
            localIdentName: '[local]',
            exportLocalsConvention: 'camelCase'
          },
          importLoaders: 1
        }
      },
      'postcss-loader'
    ]
  },
  {
    test: /\.css$/,
    include: path.resolve(helpers.sourcePath), // css modules for component css files
    exclude: [
      path.resolve(helpers.browserPath, 'styles'),
      path.resolve(helpers.browserPath, 'modules/Carousel')
    ],
    use: [
      'style-loader',
      {
        loader: 'css-loader',
        options: {
          modules: {
            localIdentName: '[name]__[local]___[hash:base64:5]',
            exportLocalsConvention: 'camelCase'
          },
          importLoaders: 1
        }
      },
      'postcss-loader'
    ]
  },
  {
    test: /\.css$/, // global css files that don't need any processing
    exclude: [
      path.resolve(helpers.browserPath, 'components'),
      path.resolve(helpers.browserPath, 'modules')
    ],
    use: ['style-loader', 'css-loader']
  },
  {
    test: /\.svg$/,
    type: 'asset/resource',
    generator: {
      filename: 'assets/fonts/[name][ext]'
    },
    exclude: [path.resolve(helpers.browserPath, 'components/icons/svgs')]
  },
  {
    test: /\.svg$/,
    type: 'asset/source',
    include: [path.resolve(helpers.browserPath, 'components/icons/svgs')]
  },
  {
    test: /\.html?$/,
    use: ['html-loader']
  }
]
