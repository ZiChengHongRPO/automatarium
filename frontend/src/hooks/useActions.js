import { useEffect, useMemo } from 'react'
import { useProjectStore, useSelectionStore, useViewStore } from '/src/stores'
import { VIEW_MOVE_STEP } from '/src/config/interactions'

const isWindows = navigator.platform.match(/Win/)
const formatHotkey = ({ key, meta, alt, shift, showCtrl = isWindows }) => [
  meta && (showCtrl ? (isWindows ? 'Ctrl' : '⌃') : '⌘'),
  alt && (isWindows ? 'Alt' : '⌥'),
  shift && (isWindows ? 'Shift' : '⇧'),
  key.toUpperCase(),
].filter(Boolean).join(isWindows ? '+' : ' ')

const useActions = (registerHotkeys=false) => {
  const undo = useProjectStore(s => s.undo)
  const redo = useProjectStore(s => s.redo)
  const selectNoStates = useSelectionStore(s => s.selectNone)
  const selectAllStates = useSelectionStore(s => s.selectAll)
  const removeStates = useProjectStore(s => s.removeStates)
  const removeTransitions = useProjectStore(s => s.removeTransitions)
  const commit = useProjectStore(s => s.commit)
  const moveView = useViewStore(s => s.moveViewPosition)

  // TODO: memoize
  const actions = {
    NEW_FILE: {
      hotkey: { key: 'n', meta: true, showCtrl: true },
      handler: () => console.log('New File'),
    },
    OPEN_FILE: {
     hotkey: { key: 'o', meta: true },
     handler: () => console.log('Open File'),
    },
    SAVE_FILE: {
      hotkey: { key: 's', meta: true },
      handler: () => console.log('Save'),
    },
    SAVE_FILE_AS: {
      hotkey: { key: 's', shift: true, meta: true },
      handler: () => console.log('Save File As'),
    },
    EXPORT_AS_PNG: {
      hotkey: { key: 'e', shift: true, meta: true, showCtrl: true },
      handler: () => console.log('Export PNG'),
    },
    EXPORT_AS_SVG: {
      hotkey: { key: 'e', shift: true, alt: true, meta: true},
      handler: () => console.log('Export SVG'),
    },
    EXPORT_AS_JPG: {
      handler: () => console.log('Export JPG'),
    },
    EXPORT_AS_JFLAP: {
      handler: () => console.log('Export JFLAP'),
    },
    SHARE: {
      handler: () => console.log('Share'),
    },
    OPEN_PREFERENCES: {
      hotkey: { key: ',', meta: true },
      handler: () => console.log('Preferences'),
    },
    UNDO: {
      hotkey: { key: 'z', meta: true },
      handler: undo,
    },
    REDO: {
      hotkey: { key: 'y', meta: true },
      handler: redo,
    },
    COPY: {
      hotkey: { key: 'c', meta: true },
      handler: () => console.log('Copy'),
    },
    PASTE: {
      hotkey: { key: 'v', meta: true },
      handler: () => console.log('Paste'),
    },
    SELECT_ALL: {
      hotkey: { key: 'a', meta: true },
      handler: selectAllStates,
    },
    SELECT_NONE: {
      hotkey: { key: 'd', meta: true },
      handler: selectNoStates,
    },
    DELETE: {
      hotkey: [{ key: 'Delete' }, { key: 'Backspace' }],
      handler: () => {
        const selectedStateIDs = useSelectionStore.getState().selectedStates
        const selectedTransitionIDs = useSelectionStore.getState().selectedTransitions
        if (selectedStateIDs.length > 0 || selectedTransitionIDs.length > 0) {
          removeStates(selectedStateIDs)
          removeTransitions(selectedTransitionIDs)
          selectNoStates()
          commit()
        }
      },
    },
    ZOOM_IN: {
      hotkey: { key: '=', meta: true },
      handler: () => console.log('Zoom In'),
    },
    ZOOM_OUT: {
      hotkey: { key: '-', meta: true },
      handler: () => console.log('Zoom Out'),
    },
    ZOOM_100: {
      hotkey: { key: '0', meta: true },
      handler: () => console.log('Zoom to 100%'),
    },
    ZOOM_FIT: {
      hotkey: { key: '1', shift: true },
      handler: () => console.log('Zoom to fit'),
    },
    TESTING_LAB: {
      hotkey: { key: 't', meta: true, showCtrl: true },
      handler: () => console.log('Testing Lab'),
    },
    FILE_INFO: {
      hotkey: { key: 'i', meta: true },
      handler: () => console.log('File Info'),
    },
    FILE_OPTIONS: {
      hotkey: { key: 'u', meta: true },
      handler: () => console.log('File Options'),
    },
    CONVERT_TO_DFA: {
      handler: () => console.log('Convert to DFA'),
    },
    MINIMIZE_DFA: {
      handler: () => console.log('Minimize DFA'),
    },
    AUTO_LAYOUT: {
      handler: () => console.log('Auto Layout'),
    },
    OPEN_DOCS: {
      handler: () => console.log('View Documentation'),
    },
    KEYBOARD_SHORTCUTS: {
      hotkey: { key: '/', meta: true },
      handler: () => console.log('Keyboard shortcuts'),
    },
    PRIVACY_POLICY: {
      handler: () => console.log('Privacy Policy'),
    },
    OPEN_ABOUT: {
      handler: () => console.log('About Automatarium'),
    },
    MOVE_VIEW_LEFT: {
      hotkey: { key: 'ArrowLeft' },
      handler: () => moveView({ x: -VIEW_MOVE_STEP })
    },
    MOVE_VIEW_RIGHT: {
      hotkey: { key: 'ArrowRight' },
      handler: () => moveView({ x: VIEW_MOVE_STEP })
    },
    MOVE_VIEW_UP: {
      hotkey: { key: 'ArrowUp' },
      handler: () => moveView({ y: -VIEW_MOVE_STEP })
    },
    MOVE_VIEW_DOWN: {
      hotkey: { key: 'ArrowDown' },
      handler: () => moveView({ y: VIEW_MOVE_STEP })
    }
  }

  // Register action hotkeys
  useEffect(() => {
    if (registerHotkeys) {
      const handleKeyDown = e => {
        // Hotkeys are disabled if an input is focused
        if (['input', 'textarea', 'select'].includes(e.target.tagName.toLowerCase())) {
          return
        }
        
        // Check hotkeys
        for (let action of Object.values(actions)) {
          // Skip if no hotkey
          if (!action.hotkey)
            continue

          const hotkeys = Array.isArray(action.hotkey) ? action.hotkey : [action.hotkey] 
          const activeHotkey = hotkeys.find(hotkey => {
            // Guard against other keys 
            const letterMatch = e.code === `Key${hotkey.key.toUpperCase()}`
            const digitMatch = e.code === `Digit${hotkey.key}`
            const keyMatch = e.key === hotkey.key
            if (!(letterMatch || digitMatch || keyMatch))
                return false

            // Check augmenting keys
            if ((hotkey.meta || false) !== (e.metaKey || e.ctrlKey))
              return false
            if ((hotkey.alt || false) !== e.altKey)
              return false
            if ((hotkey.shift || false) !== e.shiftKey)
              return false

            return true
          })
          
          // Prevent default and exec callback
          if (activeHotkey) {
            e.preventDefault()
            e.stopPropagation()
            action.handler(e)
            break
          }
        }
      }
      
      // Add listener
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [actions])

  // Add formatted hotkeys to actions
  const actionsWithLabels = useMemo(() => Object.fromEntries(Object.entries(actions).map(([key, action]) => ([key, {
    ...action,
    label: action.hotkey ? formatHotkey(Array.isArray(action.hotkey) ? action.hotkey[0] : action.hotkey) : null
  }]))), [actions])

  return actionsWithLabels
}

export default useActions
