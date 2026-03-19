import { Navigate, Route, Routes } from "react-router-dom"

import { BoardDetailsScreen } from "./features/study/screens/BoardDetailsScreen"
import { MyLectureRoomScreen } from "./features/lectures/screens/MyLectureRoomScreen"

function App() {
  return (
    <Routes>
      <Route element={<MyLectureRoomScreen />} path="/" />
      <Route element={<BoardDetailsScreen />} path="/boards/:id" />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  )
}

export default App