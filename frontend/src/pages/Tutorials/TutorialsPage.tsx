import { useSearchParams } from 'react-router-dom'
import manifest from '/src/config/tutorials-manifest.json'
import { NotFound, TutorialsSection, TutorialsVideo } from '/src/pages'
import { useEffect, useState } from 'react'

export interface TutorialLeaf {
  id: string
  title: string
  description: string
  type: 'item'
  link: string
}

export interface TutorialSection {
  id: string
  title: string
  description: string
  type: 'section'
  items: [TutorialSection | TutorialLeaf]
}

type ManifestItem = TutorialLeaf | TutorialSection
type PageInfo = ManifestItem | 'not found'

const TutorialsPage = () => {
  const [searchParams] = useSearchParams()
  const [pageInfo, setPageInfo] = useState<PageInfo>()
  const [pagePath, setPagePath] = useState<string[]>()

  // Determine if section, leaf or not found

  const traceTree = (params: IterableIterator<string>, manifestState: ManifestItem, path: string[] = []) : PageInfo => {
    const iResult = params.next()
    if (iResult.done) {
      setPagePath(path)
      return manifestState
    }
    // If the tree is a leaf and there is more then the page doesn't exist
    if (manifestState.type === 'item') { return 'not found' }

    const assertedSection = manifestState as TutorialSection
    const nextState = assertedSection.items.find((mi: ManifestItem) => mi.id === iResult.value)
    const nextPath = [...path, nextState.id]

    return traceTree(params, nextState, nextPath)
  }

  useEffect(() => {
    setPageInfo(traceTree(searchParams.keys(), manifest as ManifestItem))
  }, [searchParams])

  if (pageInfo === undefined || pageInfo === 'not found') {
    return <NotFound />
  } else {
    return pageInfo.type === 'section'
      ? <TutorialsSection pageInfo={pageInfo} pagePath={pagePath} />
      : <TutorialsVideo pageInfo={pageInfo} pagePath={pagePath} />
  }
}

export default TutorialsPage
