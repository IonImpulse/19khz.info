import React from 'react';
import './App.css';
import Header from './components/header.js';
import EventList from './components/eventList';

// If dev, api is localhost:8000
// If prod, api is https://19khz.info/
const api = window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://19khz.info';

function App() {
  const [loading, setLoading] = React.useState(2);

  const [events, setEvents] = React.useState([]);
  const [areas, setAreas] = React.useState([]);

  const [selectedArea, setSelectedArea] = React.useState(null);
  const [location, setLocation] = React.useState(null);

  // Use local storage to save events
  const [savedEvents, setSavedEvents] = React.useState([]);

  React.useEffect(() => {
    const localSavedEvents = JSON.parse(localStorage.getItem('19khz_savedEvents'));
    if (localSavedEvents) {
      setSavedEvents(localSavedEvents);
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('19khz_savedEvents', JSON.stringify(savedEvents));
  }, [savedEvents]);

  React.useEffect(() => {
    fetch(`${api}/events`)
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(prev => prev - 1);
      });
  }, []);

  React.useEffect(() => {
    fetch(`${api}/areas`)
      .then(res => res.json())
      .then(data => {
        setAreas(data);
        setLoading(prev => prev - 1);
      });
  }, []);

  React.useEffect(() => {
    if (loading === 0) {
      document.getElementById('loader').className = "done";
      console.log("19khz.info is ready! Data loaded: ", events, areas);
    }
  }, [loading]);

  return (
    <>
      <div className="App">
        <Header 
          events={events} 
          areas={areas}
          selectedArea={selectedArea}
          setSelectedArea={setSelectedArea} 
          location={location}
          setLocation={setLocation}
        />

        <EventList 
          events={events}
          selectedArea={selectedArea}
          location={location}
          savedEvents={savedEvents}
          setSavedEvents={setSavedEvents}
        />
      </div>

      <div id="loader">
        <img src="logo512.png" alt="19khz.info logo"></img>
      </div>
    </>
    
  );
}

export default App;
