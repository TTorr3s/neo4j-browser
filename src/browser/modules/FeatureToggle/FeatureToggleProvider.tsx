import React, { useCallback, ReactNode, createContext } from 'react'
import { useSelector } from 'react-redux'

import { getExperimentalFeatures } from 'shared/modules/experimentalFeatures/experimentalFeaturesDuck'
import { GlobalState } from 'shared/globalState'

type ShowFeature = (featureName: string) => boolean

const FeatureToggleContext = createContext<ShowFeature>(() => true)

interface FeatureToggleProviderProps {
  children: ReactNode
}

function FeatureToggleProvider({ children }: FeatureToggleProviderProps) {
  const features = useSelector((state: GlobalState) =>
    getExperimentalFeatures(state)
  )

  const showFeature = useCallback(
    (featureName: string): boolean => {
      if (
        !features ||
        !Object.prototype.hasOwnProperty.call(features, featureName)
      ) {
        return true
      }
      return !!features[featureName].on
    },
    [features]
  )

  return (
    <FeatureToggleContext.Provider value={showFeature}>
      {children}
    </FeatureToggleContext.Provider>
  )
}

const Consumer = FeatureToggleContext.Consumer

export default FeatureToggleProvider
export { Consumer, FeatureToggleProvider }
