import { createContext, useState, useCallback, useMemo, useEffect, KeyboardEvent } from 'react'
import { SkipBack, ChevronLeft, ChevronRight, SkipForward, Plus, Trash2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

import { useDibEgg } from '/src/hooks'
import { SectionLabel, Button, Input, TracePreview, TraceStepBubble, Preference, Switch } from '/src/components'
import { useProjectStore, usePDAVisualiserStore } from '/src/stores'
import { closureWithPredicate, simulateFSA, simulatePDA } from '@automatarium/simulation'

import { simulateTM } from '@automatarium/simulation/src/simulateTM'
import useTMSimResultStore from '../../../../stores/useTMSimResultStore'

import {
  StepButtons,
  MultiTraceRow,
  RemoveButton,
  Wrapper,
  TraceConsole,
  StatusIcon,
  WarningLabel
} from './testingLabStyle'
import {
  ExecutionResult,
  FSAExecutionResult,
  FSAExecutionTrace,
  PDAExecutionResult,
  PDAExecutionTrace,
  TMExecutionResult,
  TMExecutionTrace
} from '@automatarium/simulation/src/graph'
import { Graph, Node, State } from '@automatarium/simulation/src/interfaces/graph'
import { BaseAutomataTransition } from 'frontend/src/types/ProjectTypes'
import { buildProblem } from '@automatarium/simulation/src/utils'
import { assertType } from '/src/types/ProjectTypes'

type SimulationResult = ExecutionResult & {transitionCount: number}

export const ThemeContext = createContext({})

const TestingLab = () => {
  const [simulationResult, setSimulationResult] = useState<SimulationResult | undefined>()
  const [traceIdx, setTraceIdx] = useState(0)
  const [multiTraceOutput, setMultiTraceOutput] = useState([])
  const [showTraceTape, setShowTraceTape] = useState(false)
  const [enableManualStepping, setEnableManualStepping] = useState(false)
  const [problem, setProblem] = useState<Graph<State, BaseAutomataTransition> | undefined>()
  const [currentManualNode, setCurrentManualNode] = useState<Node<State> | undefined>()
  const [currentManualSuccessors, setCurrentManualSuccessors] = useState<Node<State>[]>([])
  // const [manualExecutionTrace, setManualExecutionTrace] = useState([])

  // Graph state
  const graph = useProjectStore(s => s.getGraph())
  const statePrefix = useProjectStore(s => s.project.config?.statePrefix)
  const setProjectSimResults = useTMSimResultStore(s => s.setSimResults)
  const setProjectSimTraceIDx = useTMSimResultStore(s => s.setTraceIDx)
  const traceInput = useProjectStore(s => s.project.tests.single)
  const setTraceInput = useProjectStore(s => s.setSingleTest)
  const multiTraceInput = useProjectStore(s => s.project.tests.batch)
  const addMultiTraceInput = useProjectStore(s => s.addBatchTest)
  const updateMultiTraceInput = useProjectStore(s => s.updateBatchTest)
  const removeMultiTraceInput = useProjectStore(s => s.removeBatchTest)
  const lastChangeDate = useProjectStore(s => s.lastChangeDate)
  const projectType = useProjectStore(s => s.project.config.type)
  const setPDAVisualiser = usePDAVisualiserStore(state => state.setStack)

  /**
   * Runs the correct simulation result for a trace input and returns the result.
   * The simulation function to use depends on the project name
   */
  const runSimulation = (input: string): SimulationResult => {
    // Find how many transitions can be shown
    // TODO: Find reasoning behind the magical -1
    const transitionCount = (res: ExecutionResult) =>
      Math.max(1, res.trace.length) - (res.accepted ? 1 : graph.projectType === 'TM' ? 1 : 0)
    /*
    if (graph.projectType === 'TM') {
      const result = simulateTM(graph, input)
      return {
        ...result,
        transitionCount: transitionCount(result)
      }
      } else */
    if (['PDA', 'FSA', 'TM'].includes(graph.projectType)) {
      function simulateAutomata (graph, input) {
        let result
        switch (graph.projectType) {
          case ('PDA'):
            result = simulatePDA(graph, input ?? '')
            break
          case ('FSA'):
            result = simulateFSA(graph, input ?? '')
            break
          case ('TM'):
            result = simulateTM(graph, input ?? '')
        }
        return result
      }
      const result = simulateAutomata(graph, input)
      /*
      const result =
            graph.projectType === 'PDA'
              ? simulatePDA(graph, input ?? '')
              : simulateFSA(graph, input ?? '')
*/
      // Formats a symbol. Makes an empty symbol become a lambda
      const formatSymbol = (char?: string): string =>
        char === null || char === '' ? 'λ' : char
      return {
        ...result,
        // We need format the symbols in the trace so any empty symbols become lambdas
        trace: result.trace.map((step: FSAExecutionTrace | PDAExecutionTrace | TMExecutionTrace) => ({
          to: step.to,
          read: formatSymbol(step.read),
          // Add extra info if its a PDA trace.
          // I know this isn't needed, but it pleases typescript
          ...('currentStack' in step
            ? {
                pop: formatSymbol(step.pop),
                push: formatSymbol(step.push),
                currentStack: step.currentStack
              }
            : {}),
          // Info for TMs
          ...('tape' in step
            ? {
                tape: step.tape,
                write: formatSymbol(step.write),
                direction: step.direction
              }
            : {})

        } as FSAExecutionTrace | PDAExecutionTrace | TMExecutionTrace)),
        transitionCount: transitionCount(result)
      }
    } else {
      throw new Error(`${projectType} is not supported`)
    }
  }

  /** Runs all multi trace inputs and updates the output */
  const rerunMultiTraceInput = () => {
    setMultiTraceOutput(multiTraceInput.map(input => runSimulation(input)))
  }

  function simulateGraphAuto () {
    const result = runSimulation(traceInput)
    // The `in` is just to type narrow for TS
    if ('tape' in result) {
      setSimulationResult(result)
      setProjectSimResults([{ accepted: result.accepted, ...result }]) // Currently for just a single simulation result. (DTM. Not yet NDTM).
    } else {
      setSimulationResult(result)
      // Adds result to PDA visualiser
      if (graph.projectType === 'PDA') {
        setPDAVisualiser(result as PDAExecutionResult)
      }
    }
    return result
  }

  function simulateGraphManual () {
    // TODO actually implement manual stepping
    return simulateGraphAuto()
  }

  // Execute graph
  const simulateGraph = useCallback(() => {
    if (enableManualStepping) {
      return simulateGraphManual()
    } else {
      return simulateGraphAuto()
    }
  }, [graph, traceInput, enableManualStepping])

  // Determine last position allowed
  const lastTraceIdx = simulationResult?.transitionCount

  const getStateName = useCallback((id: number) => graph.states.find(s => s.id === id)?.name, [graph.states])

  function traceOutputAuto () {
    // No output before simulating
    if (!simulationResult) { return '' }
    assertType<(FSAExecutionResult | PDAExecutionResult | TMExecutionResult) & {transitionCount: number}>(simulationResult)

    const { trace, accepted } = simulationResult
    // Return null if not enough states in trace to render transitions
    if (trace.length < 2) {
      if (traceIdx > 0) { return accepted ? 'ACCEPTED' : 'REJECTED' }
      return null
    }

    function transitionsForAutomata (projectType, trace) {
      let transitions
      switch (projectType) {
        case ('FSA'):
        case ('PDA'):
          // TODO add more detail for PDA trace (stack pushing/popping)
          assertType<(FSAExecutionTrace[] | PDAExecutionTrace[])>(trace)
          transitions = trace
            .slice(0, -1)
            .map<[string, number, number]>((_, i) => [trace[i + 1]?.read, trace[i]?.to, trace[i + 1]?.to])
            .map(([read, start, end]) => `${read}: ${getStateName(start) ?? statePrefix + start} -> ${getStateName(end) ?? statePrefix + end}`)
            .filter((_x, i) => i < traceIdx)

          break
        case ('TM'):
          assertType<(TMExecutionTrace[])>(trace)
          transitions = trace
            .slice(0, -1)
            .map<[string, number, number, string, string]>((_, i) => [trace[i + 1]?.read, trace[i]?.to, trace[i + 1]?.to, trace[i + 1]?.write, trace[i + 1]?.direction])
            .map(([read, start, end, write, direction]) => `${read},${write};${direction}: ${getStateName(start) ?? statePrefix + start} -> ${getStateName(end) ?? statePrefix + end}`)
            .filter((_x, i) => i < traceIdx)
      }
      return transitions
    }

    // Represent transitions as strings of form 'read: start -> end'
    const transitions = transitionsForAutomata(graph.projectType, trace)

    let transitionsWithRejected = ['']
    if ('remaining' in simulationResult) {
      // Add rejecting transition if applicable
      transitionsWithRejected = !accepted && traceIdx === trace.length
        ? [...transitions,
            simulationResult.remaining[0]
              ? `${simulationResult.remaining[0]}: ${getStateName(trace[trace.length - 1].to) ?? statePrefix + trace[trace.length - 1].to} ->|`
              : `\n${getStateName(trace[trace.length - 1].to) ?? statePrefix + trace[trace.length - 1].to} ->|`]
        : transitions
    } else {
      // TODO add failed transition text for turing machines
      transitionsWithRejected = transitions
    }

    // Add 'REJECTED'/'ACCEPTED' label
    return `${transitionsWithRejected.join('\n')}${(traceIdx === lastTraceIdx) ? '\n\n' + (accepted ? 'ACCEPTED' : 'REJECTED') : ''}`
  }

  function traceOutputManual () {
    // TODO fix for manual
    return traceOutputAuto()
  }

  const traceOutput = useMemo(() => {
    if (enableManualStepping) {
      return traceOutputManual()
    } else {
      return traceOutputAuto()
    }
  }, [traceInput, simulationResult, statePrefix, traceIdx, getStateName, enableManualStepping])

  // Creates problem and sets it, should run every time trace/graph changes while enableManualStepping is enabled
  // (doesn't work 100%, may have to cause update by changing input)
  useEffect(() => {
    if (enableManualStepping) {
      const _problem = buildProblem(graph, traceInput)
      if (_problem != null) {
        console.log('currentManualNode reset')
        setProblem(_problem)
        setCurrentManualNode(_problem.initial)
        setTraceIdx(0)
      } else {
        console.log('Problem not created properly!')
      }
    }
  }, [enableManualStepping, traceInput]) // TODO add more dependencies, tried graph but caused recursive calls

  // Runs every time new node is selected while enableManualStepping is enabled
  useEffect(() => {
    if (enableManualStepping) {
      // Detection of if final state has been reached
      if (problem && problem.isFinalState(currentManualNode)) {
        console.log(['Huzzah, final state has been reached!', currentManualNode])
      }
      // Updates array of successors
      if (currentManualNode != null && problem) {
        setCurrentManualSuccessors(problem.getSuccessors(currentManualNode))
      }
    }
  }, [traceInput, problem, currentManualNode])

  useEffect(() => {
    simulateGraph()
    setMultiTraceOutput([])
    setTraceIdx(0)
  }, [lastChangeDate])

  // Set the trace IDx to be passed through store to TMTapeLab component
  useEffect(() => {
    if (['TM', 'PDA'].includes(graph.projectType)) {
      setProjectSimTraceIDx(traceIdx)
    }
    // Try this for PDA as well - stack display
  }, [traceIdx])

  // Update warnings
  const noInitialState = [null, undefined].includes(graph?.initialState) || !graph?.states.find(s => s.id === graph?.initialState)
  const noFinalState = !graph?.states.find(s => s.isFinal)
  const warnings = []
  if (noInitialState) { warnings.push('There is no initial state') }
  if (noFinalState) { warnings.push('There are no final states') }

  // Update disconnected warning
  const pathToFinal = useMemo(() => {
    const closure = closureWithPredicate(graph, graph.initialState, () => true)
    return Array.from(closure).some(({ state }) => graph.states.find(s => s.id === state)?.isFinal)
  }, [graph])
  if (!pathToFinal) { warnings.push('There is no path to a final state') }

  // :^)
  const dibEgg = useDibEgg()

  // Determine input position
  const currentTrace = simulationResult?.trace.slice(0, traceIdx + 1) ?? []
  const inputIdx = currentTrace.map(tr => 'read' in tr && tr.read !== 'λ' ? 1 : 0).reduce((a, b) => a + b, 0) ?? 0
  const currentStateID = currentTrace?.[currentTrace.length - 1]?.to ?? graph?.initialState
  const automataIsInvalid = noInitialState || noFinalState || !pathToFinal

  return (
    <>
      {(showTraceTape && graph.projectType !== 'TM' && traceInput !== '') &&
        <TraceStepBubble input={traceInput} index={inputIdx} stateID={currentStateID} />
      }
      {warnings.length > 0 && <>
        <SectionLabel>Warnings</SectionLabel>
        {warnings.map(warning => <WarningLabel key={warning}>
          <AlertTriangle />
          {warning}
        </WarningLabel>)}
      </>}
      <SectionLabel>Trace</SectionLabel>
      <Wrapper>
        <Input
          onChange={e => {
            setTraceInput(e.target.value)
            setTraceIdx(0)
            setSimulationResult(undefined)
          }}
          value={traceInput ?? ''}
          placeholder="Enter a value to test"
        />

        <StepButtons>
          <Button icon={<SkipBack size={20} />}
            disabled={traceIdx <= 0 || automataIsInvalid
            }
            onClick={() => {
              setTraceIdx(0)
            }} />

          <Button icon={<ChevronLeft size={23} />}
            disabled={traceIdx <= 0 || automataIsInvalid
            }
            onClick={() => {
              setTraceIdx(traceIdx - 1)
            }} />

          <Button icon={<ChevronRight size={23} />}
            disabled={
              traceIdx >= lastTraceIdx || automataIsInvalid || enableManualStepping
            }
            onClick={() => {
              if (!simulationResult) {
                simulateGraph()
              }
              setTraceIdx(traceIdx + 1)
            }} />

          <Button icon={<SkipForward size={20} />}
            // eslint-disable-next-line no-mixed-operators
            disabled={
                traceIdx >= lastTraceIdx || automataIsInvalid || enableManualStepping
            }
            onClick={() => {
              // Increment tracer index
              const result = simulationResult ?? simulateGraph()
              setTraceIdx(lastTraceIdx)
              dibEgg(traceInput, result.accepted)
            }} />
        </StepButtons>
        {traceOutput && <div>
          <TracePreview
              result={simulationResult as (FSAExecutionResult | PDAExecutionResult) & {transitionCount: number}}
              step={traceIdx}
              statePrefix={statePrefix}
              states={graph.states}
          />
          <TraceConsole><pre>{traceOutput}</pre></TraceConsole>
        </div>}
        {projectType !== 'TM' && (
        <Preference
          label={useMemo(() => Math.random() < 0.001 ? 'Trace buddy' : 'Trace tape', [])}
          style={{ marginBlock: 0 }}
        >
          <Switch
            type="checkbox"
            checked={showTraceTape}
            disabled={automataIsInvalid}
            onChange={e => setShowTraceTape(e.target.checked)}
          />
        </Preference>
        )}
        {(
        <Preference
          label={'Manual stepping'}
          style={{ marginBlock: 0 }}
        >
          <Switch
            type="checkbox"
            checked={enableManualStepping}
            disabled={automataIsInvalid}
            onChange={e => setEnableManualStepping(e.target.checked)}
          />
        </Preference>
        )}
      {enableManualStepping && (
        <Button onClick={() => {
          if (currentManualSuccessors.length > 0) {
            setCurrentManualNode(currentManualSuccessors[0])
            setTraceIdx(traceIdx + 1)
            console.log(['New node set!', currentManualNode, currentManualSuccessors])
          } else {
            console.log(['invalid successor', currentManualNode, currentManualSuccessors])
          }
        }}>
          {'Successor 1'}</Button>
      )}
      </Wrapper>

      <SectionLabel>Multi-run</SectionLabel>
        <Wrapper>
          {multiTraceInput.map((value, index) => (
            <MultiTraceRow key={index}>
              {multiTraceOutput?.[index]?.accepted !== undefined && (
                <StatusIcon $accepted={multiTraceOutput[index].accepted}>
                  {multiTraceOutput[index].accepted ? <CheckCircle2 /> : <XCircle />}
                </StatusIcon>
              )}
              <Input
                onChange={e => {
                  updateMultiTraceInput(index, e.target.value)
                  setMultiTraceOutput([])
                }}
                value={value}
                placeholder="λ"
                color={multiTraceOutput?.[index]?.accepted !== undefined ? (multiTraceOutput[index].accepted ? 'success' : 'error') : undefined}
                onPaste={e => {
                  const paste = e.clipboardData.getData('text')
                  if (!paste.includes('\n')) return

                  e.preventDefault()
                  const lines = paste.split(/\r?\n/).filter(l => l !== '')
                  lines.forEach((l, i) => i === 0 ? updateMultiTraceInput(index, l) : addMultiTraceInput(l))
                }}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  assertType<HTMLElement>(e.target)
                  if (e.key === 'Enter' && !e.repeat) {
                    if (e.metaKey || e.ctrlKey) {
                      // Run shortcut
                      rerunMultiTraceInput()
                    } else {
                      addMultiTraceInput()
                      window.setTimeout(() => (e.target as HTMLElement).closest('div').parentElement?.querySelector<HTMLElement>('div:last-of-type > input')?.focus(), 50)
                    }
                  }
                  if (e.key === 'Backspace' && value === '' && !e.repeat) {
                    if (multiTraceInput.length === 1) return
                    e.preventDefault()
                    e.target?.focus()
                    if (e.target.closest('div').parentElement?.querySelector('div:last-of-type > input') === e.target) {
                      (e.target?.closest('div')?.previousSibling as HTMLElement)?.querySelector('input')?.focus()
                    }
                    removeMultiTraceInput(index)
                    setMultiTraceOutput([])
                  }
                  if (e.key === 'ArrowUp') {
                    (e.target?.closest('div')?.previousSibling as HTMLElement)?.querySelector('input')?.focus()
                  }
                  if (e.key === 'ArrowDown') {
                    (e.target?.closest('div')?.nextSibling as HTMLElement)?.querySelector('input')?.focus()
                  }
                }}
              />
              <RemoveButton
                onClick={e => {
                  const container = (e.target as HTMLElement).closest('div')
                  const next = (((container?.nextSibling as HTMLElement)?.tagName === 'DIV' || multiTraceInput.length === 1) ? container : container?.previousSibling) as HTMLElement
                  if (multiTraceInput.length === 1) {
                    updateMultiTraceInput(index, '')
                  } else {
                    removeMultiTraceInput(index)
                  }
                  next?.querySelector('input')?.focus()
                  setMultiTraceOutput([])
                }}
                title="Remove"
              ><Trash2 /></RemoveButton>
            </MultiTraceRow>
          ))}
          <Button
            secondary
            onClick={() => {
              addMultiTraceInput()
              setMultiTraceOutput([])
            }}
            icon={<Plus />}
          />
          <Button onClick={() => {
            rerunMultiTraceInput()
          }}>Run</Button>
      </Wrapper>
    </>
  )
}

export default TestingLab
