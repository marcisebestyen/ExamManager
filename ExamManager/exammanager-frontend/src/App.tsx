// App.tsx - Main application component
import { BrowserRouter, Routes, Route } from 'react-router-dom'
// import ExamList from './components/ExamList'
// import ExamDetail from './components/ExamDetail'

function App() {
  return (
      <BrowserRouter>
        <Routes>
          {/*<Route path="/" element={<ExamList />} />*/}
          {/*<Route path="/exam/:id" element={<ExamDetail />} />*/}
        </Routes>
      </BrowserRouter>
  )
}

export default App