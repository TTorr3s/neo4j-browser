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
import { debounce } from './debounce'

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should delay function execution', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(50)
    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should pass arguments to the debounced function', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced('arg1', 'arg2')
    jest.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should reset timer on subsequent calls', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced()
    jest.advanceTimersByTime(50)
    debounced()
    jest.advanceTimersByTime(50)
    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should use the last arguments when called multiple times', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    debounced('second')
    debounced('third')
    jest.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('third')
  })

  describe('cancel', () => {
    it('should cancel pending invocation', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 100)

      debounced()
      debounced.cancel()
      jest.advanceTimersByTime(100)

      expect(fn).not.toHaveBeenCalled()
    })
  })

  describe('flush', () => {
    it('should immediately execute pending invocation', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 100)

      debounced('test')
      debounced.flush()

      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('test')
    })

    it('should not execute if no pending invocation', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 100)

      debounced.flush()
      expect(fn).not.toHaveBeenCalled()
    })
  })

  describe('pending', () => {
    it('should return true when there is a pending invocation', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 100)

      expect(debounced.pending()).toBe(false)
      debounced()
      expect(debounced.pending()).toBe(true)
      jest.advanceTimersByTime(100)
      expect(debounced.pending()).toBe(false)
    })
  })

  describe('leading option', () => {
    it('should invoke on the leading edge when leading is true', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 100, { leading: true })

      debounced('test')
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('test')
    })

    it('should invoke on both edges when leading and trailing are true', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 100, { leading: true, trailing: true })

      debounced('first')
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('first')

      debounced('second')
      jest.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledTimes(2)
      expect(fn).toHaveBeenLastCalledWith('second')
    })

    it('should not invoke on trailing edge when trailing is false', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 100, { leading: true, trailing: false })

      debounced('first')
      expect(fn).toHaveBeenCalledTimes(1)

      debounced('second')
      jest.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('maxWait option', () => {
    it('should invoke after maxWait even if calls continue', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 100, { maxWait: 200 })

      // Rapid calls within maxWait period
      debounced('call1')
      jest.advanceTimersByTime(50)
      debounced('call2')
      jest.advanceTimersByTime(50)
      debounced('call3')
      jest.advanceTimersByTime(50)
      debounced('call4')
      jest.advanceTimersByTime(50)

      // maxWait of 200ms should have triggered with latest args
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('call4')
    })

    it('should guarantee execution within maxWait regardless of continuous calls', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 100, { maxWait: 150 })

      // Start calling
      debounced('a')
      jest.advanceTimersByTime(50)
      debounced('b')
      jest.advanceTimersByTime(50)
      debounced('c')
      jest.advanceTimersByTime(50)

      // After 150ms total, maxWait should have fired
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should invoke at wait time if no more calls within maxWait', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 100, { maxWait: 500 })

      debounced('test')
      jest.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('test')
    })

    it('should not double-invoke when wait and maxWait timers expire simultaneously', () => {
      const fn = jest.fn()
      const debounced = debounce(fn, 100, { maxWait: 100 })

      debounced('test')
      jest.advanceTimersByTime(100)

      // Both timers expire at the same time, but should only invoke once
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('test')
    })
  })
})
