import { useState, useEffect } from 'react'

import { useProjectStore, useViewStore } from '/src/stores'
import { GRID_SNAP } from '/src/config/interactions'

const useStateDragging = ({ containerRef }) => {
  const updateState = useProjectStore(s => s.updateState)
  const [draggedState, setDraggedState] = useState(null)
  const [dragOffset, setDragOffset] = useState()
  const [dragCenter, setDragCenter] = useState()
  const viewScale = useViewStore(s => s.scale)

  const relativeMousePosition = (x, y) => {
    const b = containerRef.current.getBoundingClientRect()
    return [(x - b.left) * viewScale, (y - b.top) * viewScale]
  }

  const startDrag = (state, e) => {
    const [x, y] = relativeMousePosition(e.clientX, e.clientY)
    setDraggedState(state.id)
    setDragOffset([x - state.x, y - state.y])
    setDragCenter([state.x, state.y])
    e.preventDefault()
  }

  // Listen for mouse move - dragging states
  useEffect(() => {
    const doDrag = e => {
      if (draggedState !== null) {
        const [x, y] = relativeMousePosition(e.clientX, e.clientY)
        const [dx, dy] = [x - dragOffset[0], y - dragOffset[1]]

        // Snapped dragging
        const [sx, sy] = e.altKey
          ? [dx, dy]
          : [Math.floor(dx / GRID_SNAP) * GRID_SNAP, Math.floor(dy / GRID_SNAP) * GRID_SNAP]

        // Aligned Dragging
        const distX = Math.abs(x - dragCenter[0])
        const distY = Math.abs(y - dragCenter[1])
        const [ax, ay] = e.shiftKey
          ? (distX > distY ? [dx, dragCenter[1]] : [dragCenter[0], dy])
          : [sx, sy]

        // Update state position
        updateState({ id: draggedState, x: ax, y: ay })
      }
    }
    containerRef.current.addEventListener('mousemove', doDrag)
    return () => containerRef.current.removeEventListener('mousemove', doDrag)
  })

  // Listen for mouse up - stop dragging states
  useEffect(() => {
    const cb = e => {
      if (e.button === 0) {
        setDraggedState(null)
        setDragOffset(null)
        e.preventDefault()
      }
    }
    document.addEventListener('mouseup', cb)
    return () => document.removeEventListener('mouseup', cb)
  }, [])

  return { startDrag }
}

export default useStateDragging
