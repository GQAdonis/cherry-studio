import { FC } from 'react'
import { Route, Routes } from 'react-router-dom'

import AihubmixPage from './AihubmixPage'
import SiliconPage from './PaintingsPage'
import FALPage from './FALPage'
import ReplicatePage from './ReplicatePage'

const Options = ['aihubmix', 'silicon', 'fal', 'replicate']

const PaintingsRoutePage: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AihubmixPage Options={Options} />} />
      <Route path="/aihubmix" element={<AihubmixPage Options={Options} />} />
      <Route path="/silicon" element={<SiliconPage Options={Options} />} />
      <Route path="/fal" element={<FALPage Options={Options} />} />
      <Route path="/replicate" element={<ReplicatePage Options={Options} />} />
    </Routes>
  )
}

export default PaintingsRoutePage
