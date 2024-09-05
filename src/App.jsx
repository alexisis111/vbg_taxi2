import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LocationPicker from './components/testComponent/LocationPicker.jsx';
import Main from './components/testComponent/Main.jsx';


function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Main />} />
                <Route path="/test" element={<LocationPicker />} />
            </Routes>
        </Router>
    );
}

export default App;
