import { useState } from 'react'

import { useEvent } from '/src/hooks'
import { useProjectStore, useToolStore } from '/src/stores'
import { snapPosition } from '/src/util/points'

const useStateCreation = () => {
  const tool = useToolStore(s => s.tool)
  const createState = useProjectStore(s => s.createState)
  const commit = useProjectStore(s => s.commit)
  const [mousePos, setMousePos] = useState()
  const [showGhost, setShowGhost] = useState(false)

  useEvent('svg:mousemove', e => {
    setMousePos(positionFromEvent(e))
  })

  useEvent('svg:mousedown', e => {
    if (tool === 'state' && e.detail.didTargetSVG && e.detail.originalEvent.button === 0) {
      setShowGhost(true)
    }
  })

  useEvent('svg:mouseup', e => {
    setShowGhost(false)
    if (tool === 'state' && e.detail.didTargetSVG && e.detail.originalEvent.button === 0) {
      createState(positionFromEvent(e))
      commit()
    }
  }, [tool])

  return { ghostState: tool === 'state' && showGhost && mousePos }
}

const positionFromEvent = e => {
  const doSnap = !e.detail.originalEvent.altKey
  const pos = { x: e.detail.viewX, y: e.detail.viewY }
  return doSnap ? snapPosition(pos) : pos
}

export default useStateCreation
