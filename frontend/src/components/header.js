import React from 'react';
import './header.css';

function getDistance(origin, destination) {
    let lat1 = origin[0], lon1 = origin[1];
    let lat2 = destination[0], lon2 = destination[1];
  
    const radius  = 6371; // km

    let dlat = Math.radians(lat2 - lat1);
    let dlon = Math.radians(lon2 - lon1);
    let a = (Math.sin(dlat / 2) * Math.sin(dlat / 2) +
            Math.cos(Math.radians(lat1)) * Math.cos(Math.radians(lat2)) *
            Math.sin(dlon / 2) * Math.sin(dlon / 2));
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    let d = radius * c * 0.6213712;

    return d;
}

function getDistanceEvent(origin, event) {
    let lat1 = origin[0], lon1 = origin[1];
    let lat2 = event.location.lat, lon2 = event.location.lon;
  
    return getDistance([lat1, lon1], [lat2, lon2]);
}

// Convert Degree to Radian
Math.radians = function(degrees) {
    return degrees * Math.PI / 180;
};

const options = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 0,
  };

function tryGeolocation(setLocation) {
    if (navigator.geolocation) {
        console.log("Geolocation is supported!");
        navigator.geolocation.getCurrentPosition(position => {
            setLocation([position.coords.latitude, position.coords.longitude]);
            console.log("Your location is: ", position.coords.latitude, position.coords.longitude);
        }, error => {
            console.log("Geolocation failed: ", error);
        }, options);
    }
}

export default function Header(props) {
    return (
        <div id="header">
            <div id="branding">
                <img id="logo" src="logo.svg" width="64px" alt="Stylized waveform logo"></img>
                <h1>19kHz.info</h1>
                <button id="get-location" onClick={() => tryGeolocation(props.setLocation)}>
                    {props.location ?
                        <span>You're at {props.location[0]} {props.location[1]}</span>
                        :
                        <span>Get Location</span>
                    }
                </button>
            </div>
            <div id="filters">
                <div id="areas-container">
                    <select id="areas" onChange={(e) => props.setSelectedArea(e.target.value == "all" ? "all" : props.areas[e.target.value])}>
                        <option value="all">All Areas</option>
                        {Object.keys(props.areas).map(area => {
                            return (
                                <option value={area}>{area}</option>
                            );
                        })}
                    </select>
                </div>

                <div id="age-container">
                    <h2>Age</h2>
                    <label for="age">All Ages</label>
                    <input type="checkbox" id="age" name="age" value="all"></input>
                    
                    <label for="age">18+</label>
                    <input type="checkbox" id="age" name="age" value="18"></input>
                    
                    <label for="age">21+</label>
                    <input type="checkbox" id="age" name="age" value="21"></input>
                </div>
            </div>
        </div>
    );
}
